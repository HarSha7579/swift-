import prisma from "../config/db.js";

export async function listAgents(req, res) {
  try {
    const agents = await prisma.user.findMany({
      where: { role: "AGENT" },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isAvailable: true,
        createdAt: true,
        _count: {
          select: {
            agentTickets: {
              where: { status: { in: ["OPEN", "IN_PROGRESS"] } },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    return res.json(agents);
  } catch (err) {
    console.error("List agents error:", err);
    return res.status(500).json({ error: "Internal server error while fetching agents list." });
  }
}

export async function getAgentDetails(req, res) {
  try {
    const { id } = req.params;
    const agentId = parseInt(id, 10);

    const agent = await prisma.user.findUnique({
      where: { id: agentId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isAvailable: true,
        createdAt: true,
        agentTickets: {
          include: {
            customer: { select: { id: true, name: true, email: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!agent || agent.role !== "AGENT") {
      return res.status(404).json({ error: "Agent not found." });
    }

    return res.json(agent);
  } catch (err) {
    console.error("Get agent details error:", err);
    return res.status(500).json({ error: "Internal server error while fetching agent details." });
  }
}

export async function updateAgent(req, res) {
  try {
    const { id } = req.params;
    const agentId = parseInt(id, 10);
    const { isAvailable } = req.body;

    // Security: Only Admins can modify other agents. Agents can only modify themselves.
    if (req.user.role !== "ADMIN" && req.user.id !== agentId) {
      return res.status(403).json({ error: "Access denied." });
    }

    const agent = await prisma.user.findUnique({
      where: { id: agentId },
    });

    if (!agent || agent.role !== "AGENT") {
      return res.status(404).json({ error: "Agent not found." });
    }

    const updatedAgent = await prisma.user.update({
      where: { id: agentId },
      data: {
        isAvailable: isAvailable !== undefined ? isAvailable : agent.isAvailable,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isAvailable: true,
      },
    });

    return res.json({
      message: "Agent availability updated successfully.",
      agent: updatedAgent,
    });
  } catch (err) {
    console.error("Update agent error:", err);
    return res.status(500).json({ error: "Internal server error during agent profile update." });
  }
}

export async function getAvailableTickets(req, res) {
  try {
    const tickets = await prisma.ticket.findMany({
      where: { agentId: null },
      include: {
        customer: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return res.json(tickets);
  } catch (err) {
    console.error("Get available tickets error:", err);
    return res.status(500).json({ error: "Internal server error while fetching available tickets." });
  }
}

export async function acceptTicket(req, res) {
  try {
    const { ticketId } = req.params;
    const id = parseInt(ticketId, 10);
    const agentId = req.user.id;

    // Use an interactive transaction to prevent race conditions
    const result = await prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.findUnique({
        where: { id },
      });

      if (!ticket) {
        throw new Error("TICKET_NOT_FOUND");
      }

      if (ticket.agentId !== null) {
        throw new Error("ALREADY_ASSIGNED");
      }

      // Assign the ticket to this agent and set status to "IN_PROGRESS"
      const updatedTicket = await tx.ticket.update({
        where: { id },
        data: {
          agentId,
          status: "IN_PROGRESS",
        },
      });

      // Write audit history
      await tx.ticketHistory.create({
        data: {
          ticketId: id,
          changedBy: agentId,
          action: `Accepted by Agent: ${req.user.name}`,
        },
      });

      // Notify admins
      const admins = await tx.user.findMany({ where: { role: "ADMIN" } });
      for (const admin of admins) {
        await tx.notification.create({
          data: {
            userId: admin.id,
            title: "Ticket Claimed",
            message: `Agent ${req.user.name} has claimed Ticket #${id} ("${ticket.subject}").`,
          },
        });
      }

      return updatedTicket;
    });

    return res.json({
      message: "Ticket accepted successfully.",
      ticket: result,
    });
  } catch (err) {
    if (err.message === "TICKET_NOT_FOUND") {
      return res.status(404).json({ error: "Ticket not found." });
    }
    if (err.message === "ALREADY_ASSIGNED") {
      return res.status(409).json({ error: "This ticket has already been accepted by another agent." });
    }
    console.error("Accept ticket error:", err);
    return res.status(500).json({ error: "Internal server error while accepting ticket." });
  }
}

export async function getMyTickets(req, res) {
  try {
    const agentId = req.user.id;
    const tickets = await prisma.ticket.findMany({
      where: { agentId },
      include: {
        customer: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return res.json(tickets);
  } catch (err) {
    console.error("Get my tickets error:", err);
    return res.status(500).json({ error: "Internal server error while fetching assigned tickets." });
  }
}
