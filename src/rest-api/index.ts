import express from "express";
import { PrismaClient } from "@prisma/client";
import cors from "cors";

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.API_PORT || 3000;

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

app.get("/comments", async (req, res) => {
  try {
    const {
      category,
      limit = "50",
      offset = "0",
      sentiment,
      search,
    } = req.query;

    const limitNum = Math.min(parseInt(limit as string), 100); // Max 100 items
    const offsetNum = parseInt(offset as string);

    const where: any = {};

    if (category || sentiment) {
      where.sentiment = category || sentiment;
    }

    if (search) {
      where.commentText = {
        contains: search as string,
        mode: "insensitive",
      };
    }

    const comments = await prisma.comment.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      take: limitNum,
      skip: offsetNum,
      select: {
        commentId: true,
        commentText: true,
        sentiment: true,
        confidence: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const totalCount = await prisma.comment.count({ where });

    res.json({
      data: comments,
      pagination: {
        total: totalCount,
        limit: limitNum,
        offset: offsetNum,
        hasMore: offsetNum + limitNum < totalCount,
      },
      filters: {
        category: category || null,
        sentiment: sentiment || null,
        search: search || null,
      },
    });
  } catch (error) {
    console.error("Error fetching comments:", error);
    res.status(500).json({
      error: "Internal server error",
    });
  }
});

app.get("/comments/:commentId", async (req, res) => {
  try {
    const { commentId } = req.params;

    const comment = await prisma.comment.findUnique({
      where: { commentId },
      select: {
        commentId: true,
        commentText: true,
        sentiment: true,
        confidence: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!comment) {
      return res.status(404).json({
        error: "Not found",
        message: "Comment not found",
      });
    }

    res.json({ data: comment });
  } catch (error) {
    console.error("Error fetching comment:", error);
    res.status(500).json({
      error: "Internal server error",
      message: "Failed to fetch comment",
    });
  }
});

app.get("/comments/stats/sentiment", async (req, res) => {
  try {
    const stats = await prisma.comment.groupBy({
      by: ["sentiment"],
      _count: true,
    });

    const total = stats.reduce((sum, stat) => sum + stat._count, 0);

    const sentimentStats = stats.map((stat) => ({
      sentiment: stat.sentiment,
      count: stat._count,
      percentage: ((stat._count / total) * 100).toFixed(2),
    }));

    res.json({
      data: sentimentStats,
      total,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching sentiment stats:", error);
    res.status(500).json({
      error: "Internal server error",
      message: "Failed to fetch sentiment statistics",
    });
  }
});

app.get("/comments/recent", async (req, res) => {
  try {
    const { limit = "10" } = req.query;
    const limitNum = Math.min(parseInt(limit as string), 50);

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const recentComments = await prisma.comment.findMany({
      where: {
        createdAt: {
          gte: yesterday,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limitNum,
      select: {
        commentId: true,
        commentText: true,
        sentiment: true,
        confidence: true,
        createdAt: true,
      },
    });

    res.json({
      data: recentComments,
      period: "last_24_hours",
      count: recentComments.length,
    });
  } catch (error) {
    console.error("Error fetching recent comments:", error);
    res.status(500).json({
      error: "Internal server error",
      message: "Failed to fetch recent comments",
    });
  }
});

app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error("Unhandled error:", err);
    res.status(500).json({
      error: "Internal server error",
      message: "Something went wrong",
    });
  }
);

app.use("*", (req, res) => {
  res.status(404).json({
    error: "Not found",
    message: "Endpoint not found",
  });
});

async function startServer() {
  try {
    await prisma.$connect();
    console.log("Database connected successfully");

    app.listen(PORT, () => {
      console.log(`REST API Server running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
      console.log(`Comments API: http://localhost:${PORT}/comments`);
      console.log(
        `Stats API: http://localhost:${PORT}/comments/stats/sentiment`
      );
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

process.on("SIGINT", async () => {
  console.log("Shutting down REST API server...");
  await prisma.$disconnect();
  process.exit(0);
});

startServer();
