import { analyzeTicket, suggestReply, draftKbArticle } from "../services/aiService.js";

function normalizeSuggestion(suggestion) {
  if (typeof suggestion === "string") return suggestion;
  if (suggestion && typeof suggestion === "object") {
    if (typeof suggestion.suggestion === "string") return suggestion.suggestion;
    if (typeof suggestion.agentReply === "string") return suggestion.agentReply;
    if (typeof suggestion.message === "string") return suggestion.message;
  }
  return "AI service unavailable.";
}

export async function handleAnalyzeTicket(req, res) {
  try {
    const { subject, description } = req.body;
    if (!subject || !description) {
      return res.status(400).json({ error: "Both subject and description are required for analysis." });
    }

    const analysis = await analyzeTicket(subject, description);
    if (analysis && analysis.success === false) {
      return res.status(503).json(analysis);
    }
    return res.json(analysis);
  } catch (err) {
    console.error("AI analysis endpoint error:", err);
    return res.status(500).json({ error: err.message || "Unable to analyze issue. Please try again." });
  }
}

export async function handleSuggestReply(req, res) {
  try {
    const { ticketId, subject, description, category, priority, status, history, conversation } = req.body;

    if (!subject || !description) {
      return res.status(400).json({ error: "Ticket subject and description are required for suggestion." });
    }

    const context = {
      subject,
      description,
      category: category || "General",
      priority: priority || "MEDIUM",
      status: status || "OPEN",
      history: history || [],
      conversation: conversation || [],
    };

    const suggestion = await suggestReply(context);
    return res.json({ suggestion: normalizeSuggestion(suggestion) });
  } catch (err) {
    console.error("AI suggested reply endpoint error:", err);
    return res.status(500).json({ error: "Failed to generate suggested reply." });
  }
}

export async function handleDraftKbArticle(req, res) {
  try {
    const { title, problemDescription, keywords } = req.body;
    if (!title || title.trim().length < 5) {
      return res.status(400).json({ error: "Please provide an article title (at least 5 characters)." });
    }

    const draft = await draftKbArticle(title, problemDescription, keywords);
    return res.json(draft);
  } catch (err) {
    console.error("AI draft KB article endpoint error:", err);
    return res.status(500).json({ error: "Failed to generate KB draft." });
  }
}

export async function handleTestAI(req, res) {
  try {
    const result = await analyzeTicket("Test", "Say hello");
    return res.json(result);
  } catch (err) {
    console.error("AI test endpoint error:", err);
    return res.status(500).json({ error: "AI test failed." });
  }
}
