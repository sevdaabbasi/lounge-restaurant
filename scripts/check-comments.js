const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const comments = await prisma.comment.findMany({
    orderBy: {
      createdAt: "desc",
    },
    take: 10,
  });

  console.log("\nSon 10 Yorum:");
  console.log("------------");

  comments.forEach((comment) => {
    console.log(`\nID: ${comment.commentId}`);
    console.log(`Metin: ${comment.commentText}`);
    console.log(`Duygu: ${comment.sentiment}`);
    console.log(`Güven: ${comment.confidence}`);
    console.log(`Oluşturulma: ${comment.createdAt}`);
    console.log("------------");
  });

  // Duygu analizi istatistikleri
  const stats = await prisma.comment.groupBy({
    by: ["sentiment"],
    _count: true,
  });

  console.log("\nDuygu Analizi İstatistikleri:");
  console.log("---------------------------");
  stats.forEach((stat) => {
    console.log(`${stat.sentiment}: ${stat._count} yorum`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
