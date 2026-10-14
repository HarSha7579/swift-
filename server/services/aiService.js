import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import prisma from "../config/db.js";
import logger from "../config/logger.js";

dotenv.config({ override: true });

// ==========================================
// CONFIGURATION
// ==========================================

const GROQ_API_KEY = process.env.GROQ_API_KEY || "";
const GROQ_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

// Strip "models/" prefix if present in .env
const GEMINI_MODEL_CLEAN = GEMINI_MODEL.replace(/^models\//, "");

console.log("Groq API: Direct fetch (OpenAI-compatible)");
console.log("Groq model:", GROQ_MODEL);
console.log("Gemini SDK: @google/genai");
console.log("Gemini model:", GEMINI_MODEL_CLEAN);

const AI_TIMEOUT_MS = 60000;
const AI_MAX_RETRIES = 2;
const AI_MAX_TOKENS = 2048;

// Transient error status codes that should trigger fallback
const TRANSIENT_ERROR_CODES = [429, 500, 502, 503];

const allowedCategories = [
  "Authentication",
  "Account Management",
  "Technical Issue",
  "Billing & Payments",
  "Bug Report",
  "Feature Request",
  "Performance",
  "Network & Connectivity",
  "User Interface",
  "Database",
  "Security",
  "File Upload",
  "Notifications",
  "API & Integration",
  "Knowledge Base",
  "General Inquiry",
];

const allowedPriorities = ["Critical", "High", "Medium", "Low"];

const categoryAliases = new Map([
  ["authentication", "Authentication"],
  ["auth", "Authentication"],
  ["login", "Authentication"],
  ["password", "Authentication"],
  ["sign in", "Authentication"],
  ["account management", "Account Management"],
  ["account", "Account Management"],
  ["profile", "Account Management"],
  ["technical issue", "Technical Issue"],
  ["technical", "Technical Issue"],
  ["bug", "Bug Report"],
  ["bug report", "Bug Report"],
  ["feature", "Feature Request"],
  ["feature request", "Feature Request"],
  ["performance", "Performance"],
  ["slow", "Performance"],
  ["network", "Network & Connectivity"],
  ["connectivity", "Network & Connectivity"],
  ["ui", "User Interface"],
  ["user interface", "User Interface"],
  ["database", "Database"],
  ["security", "Security"],
  ["file upload", "File Upload"],
  ["upload", "File Upload"],
  ["notification", "Notifications"],
  ["notifications", "Notifications"],
  ["api", "API & Integration"],
  ["integration", "API & Integration"],
  ["knowledge base", "Knowledge Base"],
  ["kb", "Knowledge Base"],
  ["billing", "Billing & Payments"],
  ["payments", "Billing & Payments"],
  ["payment", "Billing & Payments"],
  ["invoice", "Billing & Payments"],
  ["refund", "Billing & Payments"],
  ["general", "General Inquiry"],
  ["general inquiry", "General Inquiry"],
]);

const priorityAliases = new Map([
  ["critical", "Critical"],
  ["urgent", "Critical"],
  ["high", "High"],
  ["medium", "Medium"],
  ["low", "Low"],
]);

// ==========================================
// HELPERS
// ==========================================

function serviceUnavailable() {
  return {
    success: false,
    message: "AI service temporarily unavailable.",
  };
}

function sanitizeText(value, fallback = "") {
  if (typeof value !== "string") return fallback;
  return value.replace(/\s+/g, " ").trim();
}

function clampConfidence(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 60;
  return Math.max(0, Math.min(100, Math.round(parsed)));
}

function normalizeCategory(rawCategory) {
  const value = sanitizeText(rawCategory, "").toLowerCase();
  if (!value) return "General Inquiry";

  if (categoryAliases.has(value)) {
    return categoryAliases.get(value);
  }

  const directMatch = allowedCategories.find(
    (category) => category.toLowerCase() === value
  );
  if (directMatch) return directMatch;

  const keywords = value.split(/[^a-z0-9]+/).filter(Boolean);
  const scored = allowedCategories.map((category) => {
    const target = category.toLowerCase();
    const overlap = keywords.filter((keyword) => target.includes(keyword)).length;
    return { category, overlap };
  });

  const best = scored.sort((a, b) => b.overlap - a.overlap)[0];
  return best && best.overlap > 0 ? best.category : "General Inquiry";
}

function normalizePriority(rawPriority) {
  const value = sanitizeText(rawPriority, "").toLowerCase();
  if (!value) return "Medium";

  if (priorityAliases.has(value)) return priorityAliases.get(value);

  const directMatch = allowedPriorities.find(
    (priority) => priority.toLowerCase() === value
  );
  if (directMatch) return directMatch;

  if (value.includes("urgent") || value.includes("critical")) return "Critical";
  if (value.includes("high")) return "High";
  if (value.includes("low")) return "Low";
  return "Medium";
}

function normalizeSolutions(rawSolutions) {
  const values = Array.isArray(rawSolutions) ? rawSolutions : [];
  const filtered = values
    .map((entry) => sanitizeText(entry, ""))
    .filter((entry) => entry.length > 0)
    .filter(
      (entry) =>
        !/(contact support|try again later|check manually|not sure)/i.test(entry)
    )
    .slice(0, 5);

  if (filtered.length >= 3) return filtered;
  return [
    "Verify the issue details and reproduce it with the current browser or device settings.",
    "Check the relevant support documentation and ensure the required prerequisites are met.",
    "Document the symptoms and any error messages for a more precise follow-up.",
    "Confirm the affected workflow and any recent changes to the environment.",
    "Review the user's permissions and access level for the reported issue.",
  ].slice(0, Math.max(3, filtered.length));
}

function buildFallbackReply(subject, description, conversation) {
  const lastMessage =
    Array.isArray(conversation) && conversation.length > 0
      ? conversation[conversation.length - 1]?.message || description
      : description;

  return `I have reviewed the latest update and the current issue appears to require a focused follow-up. Please confirm whether the problem still occurs after verifying the affected workflow, and share any relevant error messages or screenshots so the next step can be handled precisely.`;
}

function buildFallbackAnalysis(subject, description) {
  const text = `${subject || ""} ${description || ""}`.toLowerCase();
  let category = "General Inquiry";
  let priority = "Medium";
  let reason =
    "The request was assessed with local heuristics because the AI service is unavailable.";
  let solutions = [
    "Review the issue details and confirm whether the problem is isolated or recurring.",
    "Check the related product documentation for any known configuration or workflow steps.",
    "Capture the exact error behavior and confirm the affected environment or account.",
    "Confirm the affected workflow and any recent changes to the environment.",
    "Review the user's permissions and access level for the reported issue.",
  ];

  // Check for HIGH priority conditions first
  if (
    text.includes("cannot log in") ||
    text.includes("account locked") ||
    text.includes("unable to access") ||
    text.includes("unable to work") ||
    text.includes("payment completed but") ||
    text.includes("security incident") ||
    text.includes("data loss") ||
    text.includes("system outage") ||
    text.includes("urgent") ||
    text.includes("immediately") ||
    text.includes("blocked") ||
    text.includes("cannot access") ||
    text.includes("unable to work") ||
    text.includes("critical")
  ) {
    priority = "High";
    if (text.includes("login") || text.includes("password") || text.includes("auth")) {
      category = "Authentication";
      reason = "The user cannot log in or has authentication issues blocking work access.";
    } else if (text.includes("security") || text.includes("data loss")) {
      category = "Security";
      reason = "Security incident or data loss requiring immediate attention.";
    } else if (text.includes("system outage") || text.includes("server down")) {
      category = "Technical Issue";
      reason = "System outage affecting service availability.";
    } else if (text.includes("payment") || text.includes("billing")) {
      category = "Billing & Payments";
      reason = "Payment or billing issue requiring immediate resolution.";
    } else {
      category = "Technical Issue";
      reason = "Issue requires immediate attention based on user description.";
    }
  } else if (
    text.includes("everyone") ||
    text.includes("all users") ||
    text.includes("company") ||
    text.includes("system outage") ||
    text.includes("server down") ||
    text.includes("data breach")
  ) {
    category = "Technical Issue";
    priority = "Critical";
    reason =
      "The issue appears to affect multiple users or systems, indicating a widespread outage or security incident.";
  } else if (
    text.includes("login") ||
    text.includes("password") ||
    text.includes("auth")
  ) {
    category = "Authentication";
    priority = "Medium";
    reason =
      "The issue involves account access, affecting a single user unless widespread is specified.";
    if (
      text.includes("everyone") ||
      text.includes("all users") ||
      text.includes("company")
    ) {
      priority = "Critical";
      reason =
        "The authentication issue appears to affect the entire organization, blocking all access.";
    }
  } else if (
    text.includes("payment") ||
    text.includes("billing") ||
    text.includes("invoice") ||
    text.includes("refund")
  ) {
    category = "Billing & Payments";
    if (
      text.includes("everyone") ||
      text.includes("all") ||
      text.includes("multiple")
    ) {
      priority = "Critical";
      reason = "Payment issue affecting multiple users, blocking business transactions.";
    } else {
      priority = "High";
      reason =
        "The issue appears related to billing or payments, which can directly disrupt business transactions.";
    }
  } else if (text.includes("upload") || text.includes("file")) {
    category = "File Upload";
    priority = "Medium";
    reason = "The issue appears to involve file handling or upload behavior.";
  } else if (
    text.includes("slow") ||
    text.includes("performance") ||
    text.includes("lag")
  ) {
    category = "Performance";
    priority = "Medium";
    reason = "The issue appears to affect performance or responsiveness.";
  } else if (text.includes("bug") || text.includes("crash") || text.includes("error")) {
    category = "Bug Report";
    if (text.includes("crash") || text.includes("data loss")) {
      priority = "High";
      reason = "The issue reflects a functional defect causing data loss or application crash.";
    } else {
      priority = "Medium";
      reason = "The issue appears to reflect a functional defect or service error.";
    }
  } else if (
    text.includes("feature") ||
    text.includes("dark mode") ||
    text.includes("export")
  ) {
    category = "Feature Request";
    priority = "Low";
    reason =
      "The request appears to be a product enhancement rather than an operational incident.";
  }

  return {
    category,
    priority,
    confidence: 60,
    reason,
    possibleSolutions: solutions,
    knowledgeBase: [],
    agentReply: buildFallbackReply(subject, description, []),
    confidenceScore: 60,
    solutions,
    relatedKbArticles: [],
    urgency:
      priority === "Critical"
        ? "Critical"
        : priority === "High"
        ? "High"
        : priority === "Medium"
        ? "Medium"
        : "Low",
    businessImpact:
      priority === "Critical"
        ? "Critical"
        : priority === "High"
        ? "High"
        : priority === "Medium"
        ? "Medium"
        : "Low",
    primaryIssue: sanitizeText(subject, "Support request"),
  };
}

async function getKnowledgeBaseArticles() {
  try {
    const rows = await prisma.knowledgeBase.findMany({
      select: {
        title: true,
        problem: true,
        solution: true,
        tags: true,
      },
    });
    return rows;
  } catch (error) {
    logger.warn("Unable to load knowledge base articles for AI recommendations", error);
    return [];
  }
}

function scoreKnowledgeBaseArticle(article, text) {
  const haystack = `${article.title || ""} ${article.problem || ""} ${article.solution || ""} ${article.tags || ""}`.toLowerCase();
  const terms = text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  const matchedTerms = terms.filter((term) => haystack.includes(term));
  return matchedTerms.length;
}

function recommendKnowledgeBaseArticles(rawText, existingArticles) {
  if (!existingArticles || existingArticles.length === 0) return [];
  const normalizedText = sanitizeText(rawText, "");
  if (!normalizedText) return [];

  const scored = existingArticles
    .map((article) => ({
      article,
      score: scoreKnowledgeBaseArticle(article, normalizedText),
    }))
    .filter((item) => item.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        (a.article.title || "").localeCompare(b.article.title || "")
    );

  return scored.slice(0, 3).map((item) => item.article.title);
}

// ==========================================
// GROQ CALL (using native fetch)
// ==========================================

async function callGroq(prompt, systemMessage, jsonMode = true) {
  const apiKey = GROQ_API_KEY;
  if (!apiKey) {
    logger.warn("GROQ_API_KEY is not configured.");
    return { shouldFallback: true };
  }

  const messages = [
    { role: "system", content: systemMessage },
    { role: "user", content: prompt },
  ];

  let attempt = 0;
  const maxAttempts = AI_MAX_RETRIES + 1;

  while (attempt < maxAttempts) {
    const startedAt = Date.now();
    try {
      logger.info(`Groq request attempt ${attempt + 1}/${maxAttempts}`, {
        model: GROQ_MODEL,
      });

      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages,
          temperature: 0,
          max_tokens: AI_MAX_TOKENS,
          response_format: jsonMode ? { type: "json_object" } : undefined,
        }),
      });

      const elapsedMs = Date.now() - startedAt;

      if (!response.ok) {
        const errorText = await response.text();
        logger.error("Groq request failed", {
          provider: "Groq",
          model: GROQ_MODEL,
          status: "Failed",
          errorStatus: response.status,
          errorText,
          latencyMs: elapsedMs,
          attempt: attempt + 1,
        });

        // Check if this is a transient error that should trigger fallback
        if (TRANSIENT_ERROR_CODES.includes(response.status)) {
          return { shouldFallback: true };
        }

        attempt += 1;
        if (attempt >= maxAttempts) {
          return { shouldFallback: true };
        }
        continue;
      }

      const data = await response.json();

      logger.info("Groq request completed", {
        provider: "Groq",
        model: GROQ_MODEL,
        status: "Success",
        latencyMs: elapsedMs,
        tokensUsed: data.usage?.total_tokens || null,
      });

      const content = data?.choices?.[0]?.message?.content || "";
      if (!content) {
        throw new Error("Empty response from Groq API");
      }

      // Attempt to parse as JSON
      try {
        return JSON.parse(content);
      } catch (parseError) {
        // If jsonMode was false, return raw string
        if (!jsonMode) return content;

        // Try to extract JSON from markdown code fences
        const cleaned = sanitizeText(content, "");
        const fencedMatch =
          cleaned.match(/```json\s*([\s\S]*?)```/i) ||
          cleaned.match(/```([\s\S]*?)```/i);
        const jsonText = fencedMatch ? fencedMatch[1] : cleaned;

        try {
          return JSON.parse(jsonText);
        } catch (e2) {
          logger.error("JSON parsing failed for Groq response", {
            rawContent: content.substring(0, 500),
            parseError: parseError.message,
          });
          throw new Error("Failed to parse AI response as JSON");
        }
      }
    } catch (error) {
      const elapsedMs = Date.now() - startedAt;
      const status = error?.status || error?.code || null;

      logger.error("Groq request failed", {
        provider: "Groq",
        model: GROQ_MODEL,
        status: "Failed",
        message: error.message || String(error),
        errorStatus: status,
        latencyMs: elapsedMs,
        attempt: attempt + 1,
      });

      // Check if this is a transient error that should trigger fallback
      if (status && TRANSIENT_ERROR_CODES.includes(status)) {
        return { shouldFallback: true };
      }

      attempt += 1;
      if (attempt >= maxAttempts) {
        return { shouldFallback: true };
      }
    }
  }

  return { shouldFallback: true };
}

// ==========================================
// GEMINI CALL
// ==========================================

let geminiClient = null;

function getGeminiClient() {
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({
      apiKey: GEMINI_API_KEY,
    });
  }
  return geminiClient;
}

async function callGemini(prompt, systemMessage, jsonMode = true) {
  const apiKey = GEMINI_API_KEY;
  if (!apiKey) {
    logger.warn("GEMINI_API_KEY is not configured.");
    return serviceUnavailable();
  }

  const client = getGeminiClient();

  const config = {
    temperature: 0,
    topP: 0.1,
    topK: 1,
    maxOutputTokens: AI_MAX_TOKENS,
  };

  if (jsonMode) {
    config.responseMimeType = "application/json";
  }

  const requestBody = {
    model: GEMINI_MODEL_CLEAN,
    contents: [
      {
        role: "user",
        parts: [
          { text: `${systemMessage}\n\n${prompt}` },
        ],
      },
    ],
    config,
  };

  let attempt = 0;
  const maxAttempts = AI_MAX_RETRIES + 1;

  while (attempt < maxAttempts) {
    const startedAt = Date.now();
    try {
      logger.info(`Gemini request attempt ${attempt + 1}/${maxAttempts}`, {
        model: GEMINI_MODEL_CLEAN,
      });

      const response = await client.models.generateContent(requestBody);

      const elapsedMs = Date.now() - startedAt;
      const usage = response?.usageMetadata || {};
      logger.info("Gemini request completed", {
        provider: "Gemini",
        model: GEMINI_MODEL_CLEAN,
        status: "Success",
        latencyMs: elapsedMs,
        tokensUsed: usage.totalTokenCount || null,
      });

      const content = response?.text || "";
      if (!content) {
        throw new Error("Empty response from Gemini API");
      }

      // Attempt to parse as JSON
      try {
        return JSON.parse(content);
      } catch (parseError) {
        // If jsonMode was false, return raw string
        if (!jsonMode) return content;

        // Try to extract JSON from markdown code fences
        const cleaned = sanitizeText(content, "");
        const fencedMatch =
          cleaned.match(/```json\s*([\s\S]*?)```/i) ||
          cleaned.match(/```([\s\S]*?)```/i);
        const jsonText = fencedMatch ? fencedMatch[1] : cleaned;

        try {
          return JSON.parse(jsonText);
        } catch (e2) {
          logger.error("JSON parsing failed for Gemini response", {
            rawContent: content.substring(0, 500),
            parseError: parseError.message,
          });
          throw new Error("Failed to parse AI response as JSON");
        }
      }
    } catch (error) {
      const elapsedMs = Date.now() - startedAt;
      logger.error("Gemini request failed", {
        provider: "Gemini",
        model: GEMINI_MODEL_CLEAN,
        status: "Failed",
        message: error.message || String(error),
        errorStatus: error.status || error.code || null,
        latencyMs: elapsedMs,
        attempt: attempt + 1,
      });

      attempt += 1;
      if (attempt >= maxAttempts) {
        return serviceUnavailable();
      }
    }
  }

  return serviceUnavailable();
}

// ==========================================
// GENERATE AI RESPONSE (Primary: Groq, Fallback: Gemini)
// ==========================================

async function generateAIResponse(prompt, systemMessage, jsonMode = true) {
  // Try Groq first (primary)
  const groqResponse = await callGroq(prompt, systemMessage, jsonMode);

  if (groqResponse && groqResponse.shouldFallback) {
    logger.info("Groq failed. Switching to Gemini...");
    // Fallback to Gemini
    return await callGemini(prompt, systemMessage, jsonMode);
  }

  return groqResponse;
}

// ==========================================
// TICKET ANALYSIS
// ==========================================

export async function analyzeTicket(subject, description) {
  const kbArticles = await getKnowledgeBaseArticles();

  const kbTitles = kbArticles.length > 0
    ? kbArticles.map((a) => `- ${a.title}`).join("\n")
    : "No articles available in the database yet.";

  const prompt = `You are a precise support triage AI. You must follow the 10-step analysis process below before generating output.

ANALYSIS PROCESS (follow each step internally):
Step 1: Read the title carefully.
Step 2: Read the complete description.
Step 3: Understand the user's actual problem.
Step 4: Determine how many users are affected (single user vs multiple users vs entire organization).
Step 5: Determine the business impact (is work blocked? is revenue affected? is data at risk?).
Step 6: Determine the urgency (time-sensitive? widespread? security-related?).
Step 7: Predict the category from the allowed list only.
Step 8: Predict the priority using the weighted decision rules below.
Step 9: Generate 3-5 practical troubleshooting steps specific to the detected issue.
Step 10: Recommend relevant Knowledge Base articles from the provided list only (do not invent).

ALLOWED CATEGORIES (NEVER invent categories outside this list):
Authentication
Account Management
Technical Issue
Billing & Payments
Bug Report
Feature Request
Performance
Network & Connectivity
User Interface
Database
Security
File Upload
Notifications
API & Integration
Knowledge Base
General Inquiry

ALLOWED PRIORITIES:
Critical
High
Medium
Low

PRIORITY DECISION RULES

HIGH priority if ANY of these are true:
- User cannot log in.
- User account is locked.
- User cannot access company resources.
- User cannot work.
- Authentication failure blocks business operations.
- User explicitly says: urgent, immediately, cannot access, blocked, unable to work, critical.
- Security-related incident.
- Payment completed but service unavailable.
- Production outage.
- Data corruption or data loss.

MEDIUM priority:
- Functionality partially unavailable.
- Performance issues.
- Single-user issue WITH a workaround.
- Non-critical application bug.

LOW priority:
- UI issue.
- Feature request.
- Cosmetic problem.
- Documentation question.
- General inquiry.

IMPORTANT: Being a SINGLE USER must NOT automatically downgrade priority. If the user cannot continue working because authentication failed, the ticket MUST remain HIGH priority even if only one user is affected.

URGENCY RULES
HIGH:
- User is blocked.
- Immediate action required.
- Cannot perform work.

MEDIUM:
- Work is degraded but still possible.

LOW:
- No immediate impact.

BUSINESS IMPACT
HIGH:
- Multiple users.
- Department affected.
- Revenue loss.
- Production outage.

MEDIUM:
- One employee completely blocked from work.

LOW:
- Minor inconvenience.

CONSISTENCY RULE
The AI must keep all fields logically consistent. If the explanation contains phrases like "blocking work", "unable to work", "cannot access company resources", "account locked", or "authentication preventing access", then Priority MUST be HIGH and Urgency MUST be HIGH. Do not generate contradictory outputs.

REASONING
The explanation must directly justify every prediction. Example: "The user's account is locked after multiple failed login attempts, preventing access to company resources and blocking normal work. Because the user cannot continue working until access is restored, this incident is classified as High priority and High urgency despite affecting only one user."

QUICK FIX SUGGESTIONS:
Generate 3-5 practical troubleshooting steps specific to the detected issue.

AVAILABLE KNOWLEDGE BASE ARTICLES (recommend from this list only):
${kbTitles}

IMPORTANT FORMAT RULES:
1. Return ONLY valid JSON. No markdown, no code fences, no explanations.
2. The JSON must follow this exact schema:
{
  "category": "string",
  "priority": "string",
  "confidence": number,
  "reason": "string",
  "possibleSolutions": ["string", "string", ...],
  "knowledgeBase": ["string", "string", ...],
  "agentReply": "string"
}
3. "category" must be exactly one of the 16 allowed categories.
4. "priority" must be exactly Critical, High, Medium, or Low.
5. "confidence" must be an integer 0-100.
6. "possibleSolutions" must contain 3-5 specific, actionable troubleshooting steps. Never say "contact support" or "try again later".
7. "knowledgeBase" must reference only real articles from the provided list. If no article matches, return an empty array [].
8. "agentReply" must be a professional response without greetings, signatures, or markdown.
9. If uncertain about category, choose the closest match from the allowed list. Use "General Inquiry" as last resort.
10. NEVER invent categories or priorities outside the allowed lists.

Ticket title: ${subject}
Ticket description: ${description}`;

  const systemMessage =
    "You are an enterprise IT support assistant. Your job is to analyze support tickets accurately. Follow company rules. Never guess. Never invent values. Always choose from the allowed categories. Always choose from the allowed priorities. Base priority on business impact, NOT on keywords. Think step-by-step before answering. Return ONLY valid JSON.";

  const response = await generateAIResponse(prompt, systemMessage, true);

  // Handle service unavailable response
  if (response && response.success === false) {
    logger.warn("AI service unavailable, falling back to heuristic analysis");
    return buildFallbackAnalysis(subject, description);
  }

  // Validate and normalize the AI response
  const normalizedCategory = normalizeCategory(response?.category || "");
  const normalizedPriority = normalizePriority(response?.priority || "");
  const normalizedConfidence = clampConfidence(
    response?.confidence || response?.confidenceScore || 0
  );
  const allowedKnowledgeBase = recommendKnowledgeBaseArticles(
    `${subject} ${description}`,
    kbArticles
  );
  const possibleSolutions = normalizeSolutions(response?.possibleSolutions || []);
  const reason = sanitizeText(
    response?.reason,
    "The issue was classified with a support triage model."
  );
  const agentReply = sanitizeText(
    response?.agentReply,
    buildFallbackReply(subject, description, [])
  );

  // Log if category was changed from AI's output
  if (response?.category && response.category !== normalizedCategory) {
    logger.info("AI category normalized", {
      original: response.category,
      normalized: normalizedCategory,
    });
  }

  // Log if priority was changed from AI's output
  if (response?.priority && response.priority !== normalizedPriority) {
    logger.info("AI priority normalized", {
      original: response.priority,
      normalized: normalizedPriority,
    });
  }

  return {
    category: normalizedCategory,
    priority: normalizedPriority,
    confidence: normalizedConfidence,
    reason,
    possibleSolutions,
    knowledgeBase: allowedKnowledgeBase,
    agentReply,
    // Legacy fields for frontend compatibility
    confidenceScore: normalizedConfidence,
    solutions: possibleSolutions,
    relatedKbArticles: allowedKnowledgeBase,
    urgency:
      normalizedPriority === "Critical"
        ? "Critical"
        : normalizedPriority === "High"
        ? "High"
        : normalizedPriority === "Medium"
        ? "Medium"
        : "Low",
    businessImpact:
      normalizedPriority === "Critical"
        ? "Critical"
        : normalizedPriority === "High"
        ? "High"
        : normalizedPriority === "Medium"
        ? "Medium"
        : "Low",
    primaryIssue: sanitizeText(subject, "Support request"),
  };
}

// ==========================================
// SUGGEST REPLY
// ==========================================

export async function suggestReply(ticketContext) {
  const {
    subject,
    description,
    category,
    priority,
    status,
    history,
    conversation,
  } = ticketContext || {};

  const formattedHistory = (history || [])
    .map(
      (item) =>
        `[${new Date(item.createdAt || Date.now()).toLocaleDateString()}] ${
          item.action || item.message || "history entry"
        }`
    )
    .join("\n");

  const formattedConversation = (conversation || [])
    .map((item) => `${item.senderName || "User"}: ${item.message || ""}`)
    .join("\n");

  const prompt = `You are a professional support agent. You must reply to the customer based on the full context below.

Return only valid JSON with this exact schema:
{
  "agentReply": "string"
}

The "agentReply" must be:
- A professional, direct response to the customer.
- No greetings (no "Dear", "Hello", "Hi").
- No signature (no "Best regards", "Sincerely").
- No markdown formatting.
- Address the specific issue described.
- Be concise and actionable.

Ticket subject: ${subject || ""}
Ticket description: ${description || ""}
Category: ${category || "General Inquiry"}
Priority: ${priority || "Medium"}
Status: ${status || "OPEN"}
History:
${formattedHistory || "No history yet."}
Conversation:
${formattedConversation || "No conversation yet."}`;

  const systemMessage =
    "You are an enterprise IT support assistant. Return compact JSON only. No markdown. No greetings. No signatures.";

  const response = await generateAIResponse(prompt, systemMessage, true);

  if (response && response.success === false) {
    logger.warn("AI suggest reply unavailable, using fallback");
    return buildFallbackReply(subject, description, conversation);
  }

  return sanitizeText(
    response?.agentReply,
    buildFallbackReply(subject, description, conversation)
  );
}

// ==========================================
// DRAFT KB ARTICLE
// ==========================================

export async function draftKbArticle(title, problemDescription, keywords) {
  const contextLines = [];
  if (title) contextLines.push(`Topic/Title: ${title}`);
  if (problemDescription) contextLines.push(`Problem Description: ${problemDescription}`);
  if (keywords) contextLines.push(`Keywords: ${keywords}`);

  const prompt = `You are a support documentation specialist. Generate a complete knowledge base article draft based on the provided context.

Return ONLY valid JSON with this exact schema — do not include markdown, code fences, or any text outside the JSON:
{
  "title": "string",
  "category": "string",
  "summary": "string",
  "problem": "string",
  "possibleCauses": ["string", "string"],
  "solution": "string",
  "additionalNotes": "string",
  "tags": "string"
}

FIELD RULES:
- "title": A clear, descriptive title for the article (5-15 words).
- "category": One of: "Login & Authentication", "Billing", "Performance Issue", "General Inquiry".
- "summary": A 1-2 sentence summary of the article.
- "problem": A clear, concise description of the problem (2-4 sentences).
- "possibleCauses": Array of 1-3 possible causes for the issue.
- "solution": Step-by-step resolution instructions (3-6 steps, each on a new line prefixed with a number).
- "additionalNotes": Any additional context, prerequisites, or notes (1-3 sentences). Empty string if none.
- "tags": Comma-separated relevant keywords for search (3-6 keywords).

Context:
${contextLines.join("\n")}`;

  const systemMessage =
    "You are an enterprise IT support assistant. Return compact JSON only. Do not wrap the response in markdown or code fences.";

  const response = await generateAIResponse(prompt, systemMessage, true);

  if (response && response.success === false) {
    logger.warn("AI draft KB article unavailable");
    return response;
  }

  const safeTags = sanitizeText(response?.tags, "");
  const safeCauses = Array.isArray(response?.possibleCauses)
    ? response.possibleCauses.map((c) => sanitizeText(c, "")).filter(Boolean)
    : [];
  const safeSolution = sanitizeText(response?.solution, "");
  const formattedSolution = safeSolution
    ? safeSolution
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .join("\n")
    : "";

  return {
    title: sanitizeText(response?.title, title || "Support Guide"),
    category: sanitizeText(response?.category, "General Inquiry"),
    summary: sanitizeText(response?.summary, ""),
    problem: sanitizeText(
      response?.problem,
      `Users need guidance for ${title || "this topic"}.`
    ),
    possibleCauses: safeCauses,
    solution: formattedSolution || sanitizeText(
      response?.solution,
      `Use the documented workflow for ${title || "this topic"} and confirm the affected settings or environment.`
    ),
    additionalNotes: sanitizeText(response?.additionalNotes, ""),
    tags: safeTags || "support, help",
  };
}