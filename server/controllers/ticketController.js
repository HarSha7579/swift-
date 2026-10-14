import prisma from "../config/db.js";
import { z } from "zod";

const createTicketSchema = z.object({
  subject: z.string().min(3, "Subject must be at least 3 characters"),
  description: z.string().min(5, "Description must be at least 5 characters"),
  category: z.string(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  aiCategory: z.string().optional(),
  aiPriority: z.string().optional(),
  aiSolutions: z.array(z.string()).optional(),
  aiKbArticles: z.array(z.string()).optional(),
  aiReason: z.string().optional(),
  aiConfidence: z.number().optional(),
  aiUrgency: z.string().optional(),
  aiImpact: z.string().optional(),
  aiPrimaryIssue: z.string().optional(),
  attachments: z.array(
    z.object({
      url: z.string(),
      fileName: z.string(),
      fileType: z.string(),
    })
  ).optional(),
});

export async function createTicket(req, res) {
  try {
    const data = createTicketSchema.parse(req.body);

    // Auto-assign disabled: Admin assigns tickets to the Agent Pool
    let assignedAgentId = null;

    const ticket = await prisma.ticket.create({
      data: {
        subject: data.subject,
        description: data.description,
        category: data.category,
        priority: data.priority,
        status: "OPEN",
        aiCategory: data.aiCategory || null,
        aiPriority: data.aiPriority || null,
        aiSolutions: data.aiSolutions ? JSON.stringify(data.aiSolutions) : null,
        aiKbArticles: data.aiKbArticles ? JSON.stringify(data.aiKbArticles) : null,
        aiReason: data.aiReason || null,
        aiConfidence: data.aiConfidence !== undefined ? data.aiConfidence : null,
        aiUrgency: data.aiUrgency || null,
        aiImpact: data.aiImpact || null,
        aiPrimaryIssue: data.aiPrimaryIssue || null,
        customerId: req.user.id,
        agentId: assignedAgentId,
      },
    });

    // Save attachments if any
    if (data.attachments && data.attachments.length > 0) {
      await prisma.ticketAttachment.createMany({
        data: data.attachments.map((att) => ({
          ticketId: ticket.id,
          url: att.url,
          fileName: att.fileName,
          fileType: att.fileType,
        })),
      });
    }

    // Log in history
    await prisma.ticketHistory.create({
      data: {
        ticketId: ticket.id,
        changedBy: req.user.id,
        action: `Ticket created by customer. System auto-assigned priority: ${ticket.priority}.${
          assignedAgentId ? ` Assigned to agent ID: ${assignedAgentId}.` : " Currently unassigned."
        }`,
      },
    });

    // In-app notifications
    // Notify customer
    await prisma.notification.create({
      data: {
        userId: req.user.id,
        title: "Ticket Created Successfully",
        message: `Your ticket regarding "${ticket.subject}" has been logged with ID #${ticket.id}.`,
      },
    });

    // Notify assigned agent
    if (assignedAgentId) {
      await prisma.notification.create({
        data: {
          userId: assignedAgentId,
          title: "New Ticket Assigned",
          message: `Ticket #${ticket.id} regarding "${ticket.subject}" has been assigned to you.`,
        },
      });
    }

    // Notify admins
    const admins = await prisma.user.findMany({ where: { role: "ADMIN" } });
    for (const admin of admins) {
      await prisma.notification.create({
        data: {
          userId: admin.id,
          title: "New Support Ticket Logged",
          message: `Customer ${req.user.name} logged Ticket #${ticket.id}: "${ticket.subject}"`,
        },
      });
    }

    return res.status(201).json({
      message: "Ticket created successfully.",
      ticket,
    });
  } catch (err) {
    if (err instanceof z.ZodError || err.name === "ZodError" || err.errors) {
      return res.status(400).json({ error: err.errors?.[0]?.message || err.message || "Validation failed" });
    }
    console.error("Create ticket error:", err);
    return res.status(500).json({ error: "Internal server error during ticket creation." });
  }
}

export async function listTickets(req, res) {
  try {
    const { status, category, priority, search, sortBy = "createdAt", sortOrder = "desc" } = req.query;

    let whereClause = {};

    // Role-based restrictions
    if (req.user.role === "CUSTOMER") {
      whereClause.customerId = req.user.id;
    } else if (req.user.role === "AGENT") {
      // Agents can see tickets assigned to them OR unassigned tickets
      whereClause.OR = [
        { agentId: req.user.id },
        { agentId: null },
      ];
    }
    // Admins have no whereClause restriction, they see all.

    // Filtering
    if (status) {
      whereClause.status = status;
    }
    if (category) {
      whereClause.category = category;
    }
    if (priority) {
      whereClause.priority = priority;
    }

    // Search filter
    if (search) {
      whereClause.AND = [
        {
          OR: [
            { subject: { contains: search } },
            { description: { contains: search } },
          ]
        }
      ];
    }

    // Determine orderBy structure
    let orderObject = {};
    if (sortBy === "priority") {
      // Basic sorting for SQLite fallback, we can order by priority string (or we can handle simple ordering)
      orderObject = { priority: sortOrder };
    } else {
      orderObject = { [sortBy]: sortOrder };
    }

    const tickets = await prisma.ticket.findMany({
      where: whereClause,
      include: {
        customer: { select: { id: true, name: true, email: true } },
        agent: { select: { id: true, name: true, email: true } },
        _count: { select: { messages: true } },
      },
      orderBy: orderObject,
    });

    return res.json(tickets);
  } catch (err) {
    console.error("List tickets error:", err);
    return res.status(500).json({ error: "Internal server error while fetching tickets." });
  }
}

export async function getTicketDetails(req, res) {
  try {
    const { id } = req.params;
    const ticketId = parseInt(id, 10);

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        customer: { select: { id: true, name: true, email: true, role: true } },
        agent: { select: { id: true, name: true, email: true, role: true } },
        attachments: true,
        messages: {
          include: {
            sender: { select: { id: true, name: true, email: true, role: true } },
            attachments: true,
          },
          orderBy: { createdAt: "asc" },
        },
        history: {
          include: {
            user: { select: { id: true, name: true, role: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found." });
    }

    // Security: Customers can only view their own tickets
    if (req.user.role === "CUSTOMER" && ticket.customerId !== req.user.id) {
      return res.status(403).json({ error: "Access denied. This is not your ticket." });
    }

    return res.json(ticket);
  } catch (err) {
    console.error("Get ticket details error:", err);
    return res.status(500).json({ error: "Internal server error while retrieving ticket details." });
  }
}

export async function updateTicket(req, res) {
  try {
    const { id } = req.params;
    const ticketId = parseInt(id, 10);
    const { status, priority, agentId } = req.body;

    const existingTicket = await prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!existingTicket) {
      return res.status(404).json({ error: "Ticket not found." });
    }

    // Validate access
    if (req.user.role === "CUSTOMER" && existingTicket.customerId !== req.user.id) {
      return res.status(403).json({ error: "Access denied." });
    }

    if (req.user.role === "AGENT" && existingTicket.agentId !== req.user.id) {
      return res.status(403).json({ error: "Access denied. This ticket is not assigned to you." });
    }

    // Build update payload and audit history message
    let updateData = {};
    let auditLogs = [];

    if (status && status !== existingTicket.status) {
      updateData.status = status;
      auditLogs.push(`Status changed from ${existingTicket.status} to ${status}`);
    }

    if (priority && priority !== existingTicket.priority) {
      updateData.priority = priority;
      auditLogs.push(`Priority changed from ${existingTicket.priority} to ${priority}`);
    }

    if (agentId !== undefined && agentId !== existingTicket.agentId) {
      updateData.agentId = agentId ? parseInt(agentId, 10) : null;
      if (agentId) {
        const agent = await prisma.user.findUnique({ where: { id: parseInt(agentId, 10) } });
        auditLogs.push(`Assigned to Agent: ${agent ? agent.name : `ID ${agentId}`}`);
      } else {
        auditLogs.push("Ticket unassigned");
      }
    }

    if (Object.keys(updateData).length === 0) {
      return res.json({ message: "No updates provided.", ticket: existingTicket });
    }

    const updatedTicket = await prisma.ticket.update({
      where: { id: ticketId },
      data: updateData,
    });

    // Write audit history
    for (const log of auditLogs) {
      await prisma.ticketHistory.create({
        data: {
          ticketId,
          changedBy: req.user.id,
          action: `${log} by ${req.user.name} (${req.user.role.toLowerCase()})`,
        },
      });
    }

    // Send notifications
    // Notify customer on updates
    if (req.user.role !== "CUSTOMER") {
      await prisma.notification.create({
        data: {
          userId: existingTicket.customerId,
          title: "Ticket Updated",
          message: `Your ticket #${ticketId} regarding "${existingTicket.subject}" has been updated: ${auditLogs.join(", ")}.`,
        },
      });
    }

    // Notify agent if assigned/reassigned
    if (updateData.agentId && updateData.agentId !== existingTicket.agentId) {
      await prisma.notification.create({
        data: {
          userId: updateData.agentId,
          title: "New Ticket Assigned",
          message: `Ticket #${ticketId} has been reassigned to you.`,
        },
      });
    }

    return res.json({
      message: "Ticket updated successfully.",
      ticket: updatedTicket,
    });
  } catch (err) {
    console.error("Update ticket error:", err);
    return res.status(500).json({ error: "Internal server error during ticket update." });
  }
}

export async function addReply(req, res) {
  try {
    const { id } = req.params;
    const ticketId = parseInt(id, 10);
    const { message, attachments } = req.body;

    if (!message || message.trim() === "") {
      return res.status(400).json({ error: "Reply message cannot be empty." });
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found." });
    }

    // Customer security check
    if (req.user.role === "CUSTOMER" && ticket.customerId !== req.user.id) {
      return res.status(403).json({ error: "Access denied." });
    }

    if (req.user.role === "AGENT" && ticket.agentId !== req.user.id) {
      return res.status(403).json({ error: "Access denied. This ticket is not assigned to you." });
    }

    // Create the conversation message
    const ticketMessage = await prisma.ticketMessage.create({
      data: {
        ticketId,
        senderId: req.user.id,
        message,
      },
    });

    // Auto update status to OPEN when customer replies and it is resolved/closed, or IN_PROGRESS/OPEN
    let statusUpdate = {};
    if (req.user.role === "CUSTOMER" && ticket.status === "RESOLVED") {
      statusUpdate.status = "OPEN";
      await prisma.ticket.update({ where: { id: ticketId }, data: { status: "OPEN" } });
      await prisma.ticketHistory.create({
        data: {
          ticketId,
          changedBy: req.user.id,
          action: "Ticket automatically re-opened by customer reply.",
        },
      });
    } else if (req.user.role !== "CUSTOMER" && ticket.status === "OPEN") {
      // Auto move OPEN tickets to IN_PROGRESS when agent replies
      statusUpdate.status = "IN_PROGRESS";
      await prisma.ticket.update({ where: { id: ticketId }, data: { status: "IN_PROGRESS" } });
      await prisma.ticketHistory.create({
        data: {
          ticketId,
          changedBy: req.user.id,
          action: "Ticket status auto-updated to IN_PROGRESS on agent response.",
        },
      });
    }

    // Save attachment models if any
    if (attachments && attachments.length > 0) {
      await prisma.ticketAttachment.createMany({
        data: attachments.map((att) => ({
          ticketId: ticketId,
          ticketMessageId: ticketMessage.id,
          url: att.url,
          fileName: att.fileName,
          fileType: att.fileType,
        })),
      });
    }

    // Handle notifications
    if (req.user.role === "CUSTOMER") {
      // Notify assigned agent
      if (ticket.agentId) {
        await prisma.notification.create({
          data: {
            userId: ticket.agentId,
            title: "Customer Replied",
            message: `Customer ${req.user.name} replied to ticket #${ticketId}: "${message.substring(0, 40)}..."`,
          },
        });
      }
    } else {
      // Notify customer
      await prisma.notification.create({
        data: {
          userId: ticket.customerId,
          title: "New Support Reply",
          message: `${req.user.name} replied to ticket #${ticketId}: "${message.substring(0, 40)}..."`,
        },
      });
    }

    const fullMessage = await prisma.ticketMessage.findUnique({
      where: { id: ticketMessage.id },
      include: {
        sender: { select: { id: true, name: true, role: true } },
        attachments: true,
      },
    });

    return res.status(201).json({
      message: "Reply posted successfully.",
      reply: fullMessage,
      ticketStatus: statusUpdate.status || ticket.status,
    });
  } catch (err) {
    console.error("Add reply error:", err);
    return res.status(500).json({ error: "Internal server error while sending reply." });
  }
}

export async function closeTicket(req, res) {
  try {
    const { id } = req.params;
    const ticketId = parseInt(id, 10);

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found." });
    }

    if (req.user.role === "CUSTOMER" && ticket.customerId !== req.user.id) {
      return res.status(403).json({ error: "Access denied." });
    }

    if (req.user.role === "AGENT" && ticket.agentId !== req.user.id) {
      return res.status(403).json({ error: "Access denied. This ticket is not assigned to you." });
    }

    await prisma.ticket.update({
      where: { id: ticketId },
      data: { status: "CLOSED" },
    });

    // Log history
    await prisma.ticketHistory.create({
      data: {
        ticketId,
        changedBy: req.user.id,
        action: `Ticket closed by ${req.user.name} (${req.user.role.toLowerCase()})`,
      },
    });

    // Notify customer if agent closed, or notify agent if customer closed
    if (req.user.role === "CUSTOMER") {
      if (ticket.agentId) {
        await prisma.notification.create({
          data: {
            userId: ticket.agentId,
            title: "Ticket Closed by Customer",
            message: `Customer closed Ticket #${ticketId}.`,
          },
        });
      }
    } else {
      await prisma.notification.create({
        data: {
          userId: ticket.customerId,
          title: "Ticket Closed",
          message: `Your ticket #${ticketId} regarding "${ticket.subject}" has been marked as CLOSED.`,
        },
      });
    }

    return res.json({ message: "Ticket closed successfully." });
  } catch (err) {
    console.error("Close ticket error:", err);
    return res.status(500).json({ error: "Internal server error during ticket closure." });
  }
}

export async function escalateTicket(req, res) {
  try {
    const { id } = req.params;
    const ticketId = parseInt(id, 10);

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found." });
    }

    if (req.user.role === "AGENT" && ticket.agentId !== req.user.id) {
      return res.status(403).json({ error: "Access denied. This ticket is not assigned to you." });
    }

    // Escalated priority is set to URGENT
    await prisma.ticket.update({
      where: { id: ticketId },
      data: { priority: "URGENT" },
    });

    // History log
    await prisma.ticketHistory.create({
      data: {
        ticketId,
        changedBy: req.user.id,
        action: `Ticket escalated to Admin by ${req.user.name} (${req.user.role.toLowerCase()}). Priority elevated to URGENT.`,
      },
    });

    // Notify all admins
    const admins = await prisma.user.findMany({ where: { role: "ADMIN" } });
    for (const admin of admins) {
      await prisma.notification.create({
        data: {
          userId: admin.id,
          title: "🚨 Ticket Escalated",
          message: `Agent ${req.user.name} escalated Ticket #${ticketId} ("${ticket.subject}") to Admins.`,
        },
      });
    }

    // Notify customer
    await prisma.notification.create({
      data: {
        userId: ticket.customerId,
        title: "Ticket Escalated to Management",
        message: `Your ticket #${ticketId} has been escalated to our senior management team for express resolution.`,
      },
    });

    return res.json({ message: "Ticket successfully escalated." });
  } catch (err) {
    console.error("Escalate ticket error:", err);
    return res.status(500).json({ error: "Internal server error during ticket escalation." });
  }
}

export async function getTicketMessages(req, res) {
  try {
    const { id, ticketId } = req.params;
    const resolvedTicketId = parseInt(id || ticketId, 10);

    if (isNaN(resolvedTicketId)) {
      return res.status(400).json({ error: "Invalid ticket ID." });
    }

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 30;
    const skip = (page - 1) * limit;

    // Check if ticket exists and permission
    const ticket = await prisma.ticket.findUnique({
      where: { id: resolvedTicketId },
      select: { customerId: true },
    });

    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found." });
    }

    if (req.user.role === "CUSTOMER" && ticket.customerId !== req.user.id) {
      return res.status(403).json({ error: "Access denied. This is not your ticket." });
    }

    const messages = await prisma.ticketMessage.findMany({
      where: { ticketId: resolvedTicketId },
      include: {
        sender: { select: { id: true, name: true, email: true, role: true } },
        attachments: true,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: skip,
    });

    messages.reverse();

    const totalMessages = await prisma.ticketMessage.count({
      where: { ticketId: resolvedTicketId },
    });

    return res.json({
      messages,
      total: totalMessages,
      page,
      limit,
      hasMore: totalMessages > page * limit,
    });
  } catch (err) {
    console.error("Get ticket messages error:", err);
    return res.status(500).json({ error: "Internal server error while retrieving ticket messages." });
  }
}

export async function assignTicket(req, res) {
  try {
    const { id } = req.params;
    const ticketId = parseInt(id, 10);
    const { agentId } = req.body;

    if (!agentId) {
      return res.status(400).json({ error: "Agent ID is required." });
    }

    const result = await prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.findUnique({
        where: { id: ticketId },
      });

      if (!ticket) {
        throw new Error("TICKET_NOT_FOUND");
      }

      const agent = await tx.user.findFirst({
        where: { id: parseInt(agentId, 10), role: "AGENT" },
      });

      if (!agent) {
        throw new Error("AGENT_NOT_FOUND");
      }

      if (!agent.isAvailable) {
        throw new Error("AGENT_NOT_AVAILABLE");
      }

      // Assign the ticket to this agent and set status to "ASSIGNED"
      const updatedTicket = await tx.ticket.update({
        where: { id: ticketId },
        data: {
          agentId: agent.id,
          status: "ASSIGNED",
        },
      });

      // Write audit history
      await tx.ticketHistory.create({
        data: {
          ticketId,
          changedBy: req.user.id,
          action: `Assigned by Admin to agent ${agent.name}`,
        },
      });

      return { ticket: updatedTicket, agent };
    });

    // Notify agent
    await prisma.notification.create({
      data: {
        userId: result.agent.id,
        title: "Ticket Assigned to You",
        message: `Admin has assigned Ticket #${ticketId} ("${result.ticket.subject}") to you.`,
      },
    });

    return res.json({
      message: "Ticket assigned successfully.",
      ticket: result.ticket,
    });
  } catch (err) {
    if (err.message === "TICKET_NOT_FOUND") {
      return res.status(404).json({ error: "Ticket not found." });
    }
    if (err.message === "AGENT_NOT_FOUND") {
      return res.status(404).json({ error: "Agent not found." });
    }
    if (err.message === "AGENT_NOT_AVAILABLE") {
      return res.status(400).json({ error: "Agent is currently offline or unavailable." });
    }
    console.error("Assign ticket error:", err);
    return res.status(500).json({ error: "Internal server error while assigning ticket." });
  }
}

export async function autoAssignTicket(req, res) {
  try {
    const { id } = req.params;
    const ticketId = parseInt(id, 10);

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found." });
    }

    // Get all online & available agents
    const availableAgents = await prisma.user.findMany({
      where: { role: "AGENT", isAvailable: true },
    });

    if (availableAgents.length === 0) {
      return res.status(400).json({ error: "No available online agents found to auto-assign." });
    }

    // For each agent, calculate current active workload (status in ["OPEN", "ASSIGNED", "IN_PROGRESS", "PENDING_CUSTOMER"])
    const agentsWithWorkloads = await Promise.all(
      availableAgents.map(async (agent) => {
        const activeCount = await prisma.ticket.count({
          where: {
            agentId: agent.id,
            status: { in: ["OPEN", "ASSIGNED", "IN_PROGRESS", "PENDING_CUSTOMER"] },
          },
        });

        // Get least recently assigned timestamp (e.g. updatedAt of latest ticket assigned to them)
        const lastTicket = await prisma.ticket.findFirst({
          where: { agentId: agent.id },
          orderBy: { updatedAt: "desc" },
          select: { updatedAt: true },
        });

        const lastAssignedAt = lastTicket ? lastTicket.updatedAt.getTime() : 0; // 0 means never assigned (longest ago)

        return {
          agent,
          activeCount,
          lastAssignedAt,
        };
      })
    );

    // Sort by:
    // 1. activeCount asc (least number of active tickets)
    // 2. lastAssignedAt asc (least recently assigned)
    agentsWithWorkloads.sort((a, b) => {
      if (a.activeCount !== b.activeCount) {
        return a.activeCount - b.activeCount;
      }
      return a.lastAssignedAt - b.lastAssignedAt;
    });

    const chosenAgent = agentsWithWorkloads[0].agent;

    // Do the assignment in transaction
    const result = await prisma.$transaction(async (tx) => {
      const updatedTicket = await tx.ticket.update({
        where: { id: ticketId },
        data: {
          agentId: chosenAgent.id,
          status: "ASSIGNED",
        },
      });

      await tx.ticketHistory.create({
        data: {
          ticketId,
          changedBy: req.user.id,
          action: `Auto-assigned by System to agent ${chosenAgent.name} (Workload: ${agentsWithWorkloads[0].activeCount})`,
        },
      });

      return updatedTicket;
    });

    // Notify agent
    await prisma.notification.create({
      data: {
        userId: chosenAgent.id,
        title: "Ticket Auto-Assigned to You",
        message: `System has auto-assigned Ticket #${ticketId} ("${ticket.subject}") to you.`,
      },
    });

    return res.json({
      message: `Ticket auto-assigned to ${chosenAgent.name} successfully.`,
      ticket: result,
    });
  } catch (err) {
    console.error("Auto assign error:", err);
    return res.status(500).json({ error: "Internal server error during auto-assignment." });
  }
}
