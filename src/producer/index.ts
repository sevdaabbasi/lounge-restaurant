import { Kafka } from "kafkajs";
import { v4 as uuidv4 } from "uuid";

const kafka = new Kafka({
  clientId: "comment-producer",
  brokers: ["localhost:9092"],
});

const producer = kafka.producer();
const topic = "raw-comments";

const sampleComments = [
  "Fiyatlar biraz pahalı.",
  "Tatlılar mükemmeldi.",
  "Lezzetli ama porsiyonlar küçük.",
  "Kötü bir deneyimdi.",
  "Ortam çok güzeldi.",
  "Bir daha gelmem.",
];

function getRandomComment() {
  const text =
    sampleComments[Math.floor(Math.random() * sampleComments.length)];
  return {
    commentId: uuidv4(),
    commentText: text,
    timestamp: new Date().toISOString(),
  };
}

async function produceComments() {
  await producer.connect();
  console.log("Producer connected. Sending comments...");

  while (true) {
    const comment = getRandomComment();

    await producer.send({
      topic,
      messages: [
        {
          key: comment.commentId,
          value: JSON.stringify(comment),
        },
      ],
    });

    console.log("Sent:", comment);

    const delay = Math.floor(Math.random() * 9900) + 100;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
}

produceComments().catch(console.error);
