import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import * as path from "path";

const PROTO_PATH = path.join(__dirname, "proto/sentiment.proto");
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});
const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
const sentimentService = protoDescriptor.sentiment as any;

class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly maxTokens: number;
  private readonly refillRate: number;

  constructor(maxTokens: number, refillRate: number) {
    this.maxTokens = maxTokens;
    this.refillRate = refillRate;
    this.tokens = maxTokens;
    this.lastRefill = Date.now();
  }

  private refill(): void {
    const now = Date.now();
    const timePassed = now - this.lastRefill;
    const tokensToAdd = Math.floor(timePassed / this.refillRate);
    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  canConsume(): boolean {
    this.refill();
    if (this.tokens > 0) {
      this.tokens--;
      return true;
    }
    return false;
  }
}

const sentimentCache = new Map<string, string>();
const rateLimiter = new RateLimiter(100, 10);
function analyzeSentiment(text: string): string {
  const lowerText = text.toLowerCase();
  const positiveWords = [
    "harika",
    "mükemmel",
    "lezzetli",
    "güzel",
    "iyi",
    "süper",
    "muhteşem",
    "çok güzel",
  ];
  const negativeWords = [
    "kötü",
    "berbat",
    "rezalet",
    "korkunç",
    "iğrenç",
    "çok kötü",
    "fena",
  ];

  let positiveCount = 0;
  let negativeCount = 0;

  positiveWords.forEach((word) => {
    if (lowerText.includes(word)) positiveCount++;
  });

  negativeWords.forEach((word) => {
    if (lowerText.includes(word)) negativeCount++;
  });

  if (positiveCount > negativeCount) return "positive";
  if (negativeCount > positiveCount) return "negative";
  return "neutral";
}

const sentimentAnalysisService = {
  AnalyzeSentiment: (call: any, callback: any) => {
    const startTime = Date.now();

    // Rate limiting kontrolü
    if (!rateLimiter.canConsume()) {
      callback({
        code: grpc.status.RESOURCE_EXHAUSTED,
        message: "Rate limit exceeded",
      });
      return;
    }

    // Rastgele drop (1% olasılık)
    if (Math.random() < 0.01) {
      callback({
        code: grpc.status.UNAVAILABLE,
        message: "Service temporarily unavailable",
      });
      return;
    }

    const { comment_text, comment_id } = call.request;

    // Cache kontrolü
    if (sentimentCache.has(comment_text)) {
      const sentiment = sentimentCache.get(comment_text)!;
      const processingTime = Date.now() - startTime;

      callback(null, {
        comment_id,
        sentiment,
        confidence: 0.95,
        processing_time_ms: processingTime,
        error_message: "",
      });
      return;
    }

    // Sentiment analizi
    const sentiment = analyzeSentiment(comment_text);
    sentimentCache.set(comment_text, sentiment);

    // Metin uzunluğuna bağlı gecikme
    const delay = comment_text.length * 2; // Her karakter için 2ms
    setTimeout(() => {
      const processingTime = Date.now() - startTime;

      callback(null, {
        comment_id,
        sentiment,
        confidence: 0.85 + Math.random() * 0.1, // 0.85-0.95 arası
        processing_time_ms: processingTime,
        error_message: "",
      });
    }, delay);
  },
};

const server = new grpc.Server();
server.addService(
  sentimentService.SentimentAnalysis.service,
  sentimentAnalysisService
);

const PORT = process.env.GRPC_PORT || 50051;
server.bindAsync(
  `0.0.0.0:${PORT}`,
  grpc.ServerCredentials.createInsecure(),
  (err, port) => {
    if (err) {
      console.error("Failed to bind server:", err);
      return;
    }
    server.start();
    console.log(`gRPC Sentiment Analysis Service running on port ${port}`);
    console.log(`Rate limit: 100 requests/second`);
    console.log(`Random drop rate: 1%`);
  }
);

// Graceful shutdown
process.on("SIGINT", () => {
  server.tryShutdown(() => {
    console.log("gRPC server shutdown complete");
    process.exit(0);
  });
});
