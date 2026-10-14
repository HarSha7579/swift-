import prisma from "../config/db.js";
import { z } from "zod";

const kbSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  content: z.string().optional(),
  category: z.string().min(2, "Category must be at least 2 characters"),
  problem: z.string().min(10, "Problem description must be at least 10 characters").optional().nullable(),
  solution: z.string().min(10, "Solution must be at least 10 characters").optional().nullable(),
  tags: z.string().optional().nullable(),
});

export async function listKb(req, res) {
  try {
    const { search, category } = req.query;

    let whereClause = {};

    if (category) {
      whereClause.category = category;
    }

    if (search) {
      whereClause.OR = [
        { title: { contains: search } },
        { content: { contains: search } },
        { problem: { contains: search } },
        { solution: { contains: search } },
        { tags: { contains: search } },
      ];
    }

    const articles = await prisma.knowledgeBase.findMany({
      where: whereClause,
      include: {
        createdBy: { select: { id: true, name: true, role: true, email: true } },
      },
      orderBy: { title: "asc" },
    });

    return res.json(articles);
  } catch (err) {
    console.error("List KB articles error:", err);
    return res.status(500).json({ error: "Internal server error while fetching knowledge base." });
  }
}

export async function getKbById(req, res) {
  try {
    const { id } = req.params;
    const articleId = parseInt(id, 10);

    const article = await prisma.knowledgeBase.findUnique({
      where: { id: articleId },
      include: {
        createdBy: { select: { id: true, name: true, role: true, email: true } },
      },
    });

    if (!article) {
      return res.status(404).json({ error: "Article not found." });
    }

    return res.json(article);
  } catch (err) {
    console.error("Get KB article error:", err);
    return res.status(500).json({ error: "Internal server error while retrieving article." });
  }
}

export async function createKb(req, res) {
  try {
    const validatedData = kbSchema.parse(req.body);

    const problemText = validatedData.problem || "";
    const solutionText = validatedData.solution || "";
    const generatedContent = validatedData.content || `${validatedData.title}\n\nProblem:\n${problemText}\n\nSolution:\n${solutionText}`;

    const article = await prisma.knowledgeBase.create({
      data: {
        title: validatedData.title,
        content: generatedContent,
        category: validatedData.category,
        problem: validatedData.problem || null,
        solution: validatedData.solution || null,
        tags: validatedData.tags || null,
        createdById: req.user.id,
      },
      include: {
        createdBy: { select: { id: true, name: true, role: true } },
      },
    });

    return res.status(201).json({
      message: "Knowledge base article created successfully.",
      article,
    });
  } catch (err) {
    if (err instanceof z.ZodError || err.name === "ZodError" || err.errors) {
      return res.status(400).json({ error: err.errors?.[0]?.message || err.message || "Validation failed" });
    }
    console.error("Create KB article error:", err);
    return res.status(500).json({ error: "Internal server error during knowledge base creation." });
  }
}

export async function updateKb(req, res) {
  try {
    const { id } = req.params;
    const articleId = parseInt(id, 10);
    const validatedData = kbSchema.partial().parse(req.body);

    const existingArticle = await prisma.knowledgeBase.findUnique({
      where: { id: articleId },
    });

    if (!existingArticle) {
      return res.status(404).json({ error: "Article not found." });
    }

    // Authorization: Admin can edit any. Agent can edit only their own.
    if (req.user.role === "AGENT" && existingArticle.createdById !== req.user.id) {
      return res.status(403).json({ error: "Access denied. You can only edit your own articles." });
    }

    // Build update data
    const updateData = { ...validatedData };

    // Rebuild content if problem or solution changed and content wasn't specified
    if (!validatedData.content && (validatedData.problem !== undefined || validatedData.solution !== undefined)) {
      const finalProblemText = validatedData.problem !== undefined ? (validatedData.problem || "") : (existingArticle.problem || "");
      const finalSolutionText = validatedData.solution !== undefined ? (validatedData.solution || "") : (existingArticle.solution || "");
      const finalTitle = validatedData.title || existingArticle.title;
      updateData.content = `${finalTitle}\n\nProblem:\n${finalProblemText}\n\nSolution:\n${finalSolutionText}`;
    }

    const updatedArticle = await prisma.knowledgeBase.update({
      where: { id: articleId },
      data: updateData,
      include: {
        createdBy: { select: { id: true, name: true, role: true } },
      },
    });

    return res.json({
      message: "Knowledge base article updated successfully.",
      article: updatedArticle,
    });
  } catch (err) {
    if (err instanceof z.ZodError || err.name === "ZodError" || err.errors) {
      return res.status(400).json({ error: err.errors?.[0]?.message || err.message || "Validation failed" });
    }
    console.error("Update KB article error:", err);
    return res.status(500).json({ error: "Internal server error during knowledge base update." });
  }
}

export async function deleteKb(req, res) {
  try {
    const { id } = req.params;
    const articleId = parseInt(id, 10);

    const existingArticle = await prisma.knowledgeBase.findUnique({
      where: { id: articleId },
    });

    if (!existingArticle) {
      return res.status(404).json({ error: "Article not found." });
    }

    // Only Admin can delete KB articles
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "Access denied. Only administrators can delete articles." });
    }

    await prisma.knowledgeBase.delete({
      where: { id: articleId },
    });

    return res.json({ message: "Knowledge base article deleted successfully." });
  } catch (err) {
    console.error("Delete KB article error:", err);
    return res.status(500).json({ error: "Internal server error during knowledge base deletion." });
  }
}
