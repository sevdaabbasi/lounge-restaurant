import { Kafka } from "kafkajs";
import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import * as path from "path";
import { PrismaClient } from "@prisma/client";
import { createClient } from "redis";

// Kafka setup
const kafka = new Kafka({
  clientId: "comment-consumer",
  brokers: ["localhost:9092"],
});

const consumer = kafka.consumer({ groupId: "comment-processor-group" });
const producer = kafka.producer();

// gRPC setup - Client'ı bir kez oluştur
const PROTO_PATH = path.join(
  __dirname,
  "../grpc-service/proto/sentiment.proto"
);
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});
const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
const sentimentService = protoDescriptor.sentiment as any;

// Tek bir gRPC client oluştur
const grpcClient = new sentimentService.SentimentAnalysis(
  "localhost:50051",
  grpc.credentials.createInsecure()
);

// Database setup
const prisma = new PrismaClient();

// Redis setup
const redis = createClient({
  url: "redis://localhost:6379",
});

interface Comment {
  commentId: string;
  commentText: string;
  timestamp: string;
}

interface SentimentResponse {
  comment_id: string;
  sentiment: string;
  confidence: number;
  processing_time_ms: number;
  error_message: string;
}

async function connectServices() {
  try {
    await consumer.connect();
    await producer.connect();
    await prisma.$connect();
    await redis.connect();
    console.log("All services connected successfully");
  } catch (error) {
    console.error("Error connecting to services:", error);
    process.exit(1);
  }
}

async function analyzeSentiment(
  comment: Comment
): Promise<SentimentResponse | null> {
  return new Promise((resolve, reject) => {
    const request = {
      comment_text: comment.commentText,
      comment_id: comment.commentId,
    };

    const deadline = new Date();
    deadline.setSeconds(deadline.getSeconds() + 5); // 5 second timeout

    grpcClient.AnalyzeSentiment(
      request,
      { deadline },
      (error: any, response: SentimentResponse) => {
        if (error) {
          console.error(
            `gRPC error for comment ${comment.commentId}:`,
            error.message
          );
          resolve(null);
        } else {
          resolve(response);
        }
      }
    );
  });
}

async function processComment(comment: Comment) {
  try {
    // Check cache first
    const cacheKey = `sentiment:${comment.commentText}`;
    const cachedSentiment = await redis.get(cacheKey);

    let sentimentResult: SentimentResponse | null = null;

    if (cachedSentiment) {
      console.log(`Cache hit for comment: ${comment.commentId}`);
      sentimentResult = JSON.parse(cachedSentiment);
    } else {
      console.log(`Analyzing sentiment for comment: ${comment.commentId}`);
      sentimentResult = await analyzeSentiment(comment);

      if (sentimentResult) {
        // Cache the result for 1 hour
        await redis.setEx(cacheKey, 3600, JSON.stringify(sentimentResult));
      }
    }

    if (!sentimentResult) {
      console.log(
        `Failed to analyze sentiment for comment: ${comment.commentId}`
      );
      return;
    }

    // Save to database
    await prisma.comment.upsert({
      where: { commentId: comment.commentId },
      update: {
        commentText: comment.commentText,
        sentiment: sentimentResult.sentiment,
        confidence: sentimentResult.confidence,
      },
      create: {
        commentId: comment.commentId,
        commentText: comment.commentText,
        sentiment: sentimentResult.sentiment,
        confidence: sentimentResult.confidence,
      },
    });

    // Send to processed-comments topic
    await producer.send({
      topic: "processed-comments",
      messages: [
        {
          key: comment.commentId,
          value: JSON.stringify({
            ...comment,
            sentiment: sentimentResult.sentiment,
            confidence: sentimentResult.confidence,
            processedAt: new Date().toISOString(),
          }),
        },
      ],
    });

    console.log(
      `Processed comment ${comment.commentId} with sentiment: ${sentimentResult.sentiment}`
    );
  } catch (error) {
    console.error(`Error processing comment ${comment.commentId}:`, error);
  }
}

async function startConsumer() {
  await connectServices();

  await consumer.subscribe({ topic: "raw-comments", fromBeginning: true });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      try {
        const comment: Comment = JSON.parse(message.value?.toString() || "");
        await processComment(comment);
      } catch (error) {
        console.error("Error processing message:", error);
      }
    },
  });

  console.log("Consumer started. Listening for messages...");
}

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("Shutting down consumer...");
  await consumer.disconnect();
  await producer.disconnect();
  await prisma.$disconnect();
  await redis.quit();
  grpcClient.close();
  process.exit(0);
});

startConsumer().catch(console.error);
