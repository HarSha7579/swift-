import express from "express";
import path from "path";
import cors from "cors";
import morgan from "morgan";
import * as dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import bcrypt from "bcryptjs";

// Load environment variables
dotenv.config({ override: true });

// Database client
import prisma from "./server/config/db.js";

// Controllers
import * as authController from "./server/controllers/authController.js";
import * as userController from "./server/controllers/userController.js";
import * as ticketController from "./server/controllers/ticketController.js";
import * as kbController from "./server/controllers/kbController.js";
import * as chatController from "./server/controllers/chatController.js";
import * as agentController from "./server/controllers/agentController.js";
import * as notificationController from "./server/controllers/notificationController.js";
import * as aiController from "./server/controllers/aiController.js";
import * as uploadController from "./server/controllers/uploadController.js";

// Middleware
import { verifyToken, requireRole } from "./server/middleware/auth.js";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Basic Middlewares
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(morgan("dev"));

  // Serve static uploads directory for local file fallback
  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.use("/uploads", express.static(uploadsDir));

  // ==========================================
  // AUTO-SEEDING DATABASE ON STARTUP
  // ==========================================
  try {
    const kbCount = await prisma.knowledgeBase.count();
    if (kbCount === 0) {
      console.log("Seeding Knowledge Base articles...");
      await prisma.knowledgeBase.createMany({
        data: [
          {
            title: "Resetting Your Account Password",
            content: "To reset your password:\n1. Click on the 'Forgot Password' link on the login screen.\n2. Enter your registered email address.\n3. Click 'Send Reset Link'.\n4. Open the email and follow the instructions to secure your account with a new password.\n\nTip: Passwords must be at least 8 characters long and contain numbers and symbols.",
            category: "Login & Authentication",
          },
          {
            title: "Troubleshooting Account Login Failures",
            content: "If you cannot login, try the following:\n- Double check Caps Lock.\n- Clear your browser's cookies and local storage, or open an Incognito window.\n- Verify your internet connection.\n- Ensure you have completed the email confirmation if your account is new.\n\nIf the issue persists, please submit a high priority support ticket.",
            category: "Login & Authentication",
          },
          {
            title: "Updating Your Payment Information",
            content: "You can update your payment methods at any time:\n1. Log in and navigate to Account Settings.\n2. Click on the 'Billing & Payments' tab.\n3. Click 'Update Card' or 'Add Payment Method'.\n4. Fill in your credit/debit card information and match the exact billing address.\n5. Click 'Save' to securely update your details via Stripe.",
            category: "Billing",
          },
          {
            title: "Optimizing App Performance",
            content: "If the application feels slow or laggy:\n- Refresh the page to clear browser state.\n- Minimize the number of active browser tabs.\n- Ensure you are running Chrome or Safari on their latest version.\n- Disable ad-blockers or external network proxies that might limit connection latency.",
            category: "Performance Issue",
          },
        ],
      });
      console.log("Knowledge Base seeded successfully.");
    }

    const userCount = await prisma.user.count();
    if (userCount === 0) {
      console.log("Seeding default test accounts...");
      const salt = await bcrypt.genSalt(10);
      const commonPasswordHash = await bcrypt.hash("password123", salt);

      await prisma.user.createMany({
        data: [
          {
            email: "admin@support.com",
            password: commonPasswordHash,
            name: "Chief Admin",
            role: "ADMIN",
            isAvailable: false,
          },
          {
            email: "agent@support.com",
            password: commonPasswordHash,
            name: "Agent Miller",
            role: "AGENT",
            isAvailable: true,
          },
          {
            email: "customer@support.com",
            password: commonPasswordHash,
            name: "Alice Customer",
            role: "CUSTOMER",
            isAvailable: false,
          },
        ],
      });
      console.log("Default test accounts seeded successfully.\nCredentials:\n- Admin: admin@support.com / password123\n- Agent: agent@support.com / password123\n- Customer: customer@support.com / password123");
    }
  } catch (err) {
    console.error("Auto-seeding error:", err);
  }

  // ==========================================
  // REST API ROUTES
  // ==========================================

  // Authentication Endpoints
  app.post("/api/auth/register", authController.register);
  app.post("/api/auth/login", authController.login);
  app.post("/api/auth/logout", authController.logout);
  app.get("/api/auth/verify", verifyToken, authController.verify);

  // User Profile Endpoints
  app.get("/api/users/profile", verifyToken, userController.getProfile);
  app.patch("/api/users/profile", verifyToken, userController.updateProfile);
  app.put("/api/users/profile", verifyToken, userController.updateProfile);
  app.put("/api/users/change-password", verifyToken, userController.changePassword);
  app.put("/api/users/profile-picture", verifyToken, userController.updateProfilePicture);
  app.get("/api/users/:id", verifyToken, requireRole(["ADMIN"]), userController.getUserById);
  app.get("/api/users", verifyToken, requireRole(["ADMIN", "AGENT"]), userController.listAllUsers);

  // Admin Customer Specific Endpoint
  app.get("/api/admin/customers/:id", verifyToken, requireRole(["ADMIN"]), userController.getAdminCustomerDetails);

  // Agent Pool / Ticket Endpoints
  app.get("/api/agents/available-tickets", verifyToken, requireRole(["AGENT", "ADMIN"]), agentController.getAvailableTickets);
  app.post("/api/agents/tickets/:ticketId/accept", verifyToken, requireRole(["AGENT", "ADMIN"]), agentController.acceptTicket);
  app.get("/api/agents/my-tickets", verifyToken, requireRole(["AGENT", "ADMIN"]), agentController.getMyTickets);

  // Tickets Endpoints
  app.post("/api/tickets", verifyToken, ticketController.createTicket);
  app.get("/api/tickets", verifyToken, ticketController.listTickets);
  app.get("/api/tickets/:id", verifyToken, ticketController.getTicketDetails);
  app.get("/api/tickets/:id/messages", verifyToken, ticketController.getTicketMessages);
  app.patch("/api/tickets/:id", verifyToken, ticketController.updateTicket);
  app.post("/api/tickets/:id/reply", verifyToken, ticketController.addReply);
  app.post("/api/tickets/:id/close", verifyToken, ticketController.closeTicket);
  app.post("/api/tickets/:id/escalate", verifyToken, ticketController.escalateTicket);
  app.post("/api/tickets/:id/assign", verifyToken, requireRole(["ADMIN"]), ticketController.assignTicket);
  app.post("/api/tickets/:id/auto-assign", verifyToken, requireRole(["ADMIN"]), ticketController.autoAssignTicket);

  // Internal Chat Endpoints (Admin ↔ Agent)
  app.post("/api/chat/:participantId/message", verifyToken, chatController.sendMessage);
  app.get("/api/chat/:participantId/history", verifyToken, chatController.getHistory);
  app.get("/api/chat/:ticketId", verifyToken, ticketController.getTicketMessages);

  // Notifications Endpoints
  app.get("/api/notifications", verifyToken, notificationController.listNotifications);
  app.patch("/api/notifications/:id/read", verifyToken, notificationController.markAsRead);
  app.delete("/api/notifications/:id", verifyToken, notificationController.deleteNotification);

  // Knowledge Base Endpoints
  app.get("/api/knowledge-base", kbController.listKb); // Public
  app.post("/api/knowledge-base", verifyToken, requireRole(["ADMIN", "AGENT"]), kbController.createKb);
  app.patch("/api/knowledge-base/:id", verifyToken, requireRole(["ADMIN", "AGENT"]), kbController.updateKb);
  app.delete("/api/knowledge-base/:id", verifyToken, requireRole(["ADMIN"]), kbController.deleteKb);

  // New /api/kb routes mapping
  app.get("/api/kb", kbController.listKb); // Public/Shared
  app.get("/api/kb/:id", kbController.getKbById);
  app.post("/api/kb", verifyToken, requireRole(["ADMIN", "AGENT"]), kbController.createKb);
  app.put("/api/kb/:id", verifyToken, requireRole(["ADMIN", "AGENT"]), kbController.updateKb);
  app.delete("/api/kb/:id", verifyToken, requireRole(["ADMIN"]), kbController.deleteKb);

  // AI Endpoints
  app.post("/api/ai/analyze-ticket", verifyToken, aiController.handleAnalyzeTicket);
  app.post("/api/ai/suggest-reply", verifyToken, aiController.handleSuggestReply);
  app.post("/api/ai/draft-kb", verifyToken, requireRole(["ADMIN", "AGENT"]), aiController.handleDraftKbArticle);
  app.get("/api/ai/test", aiController.handleTestAI);

  // Agents Endpoints (Admin only)
  app.get("/api/agents", verifyToken, requireRole(["ADMIN"]), agentController.listAgents);
  app.get("/api/agents/:id", verifyToken, requireRole(["ADMIN"]), agentController.getAgentDetails);
  app.patch("/api/agents/:id", verifyToken, agentController.updateAgent); // Toggles availability (Agent themselves or Admin)

  // Uploads Endpoints
  app.post("/api/uploads/cloudinary", verifyToken, uploadController.uploadMiddleware, uploadController.handleUpload);

  // ==========================================
  // VITE OR STATIC ASSETS ROUTING
  // ==========================================
  if (process.env.NODE_ENV !== "production") {
    console.log("Setting up Vite middleware for development...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Serving static production build from /dist...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`AI Support Ticket Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
