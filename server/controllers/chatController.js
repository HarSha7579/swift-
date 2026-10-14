import prisma from "../config/db.js";

export async function sendMessage(req, res) {
  try {
    const { participantId } = req.params;
    const receiverId = parseInt(participantId, 10);
    const { message, attachmentUrl, attachmentName } = req.body;

    if (!message || message.trim() === "") {
      return res.status(400).json({ error: "Message content is required." });
    }

    const senderId = req.user.id;

    // Check if receiver exists and is either AGENT or ADMIN
    const receiver = await prisma.user.findUnique({
      where: { id: receiverId },
    });

    if (!receiver) {
      return res.status(404).json({ error: "Recipient user not found." });
    }

    if (!["ADMIN", "AGENT"].includes(receiver.role) || !["ADMIN", "AGENT"].includes(req.user.role)) {
      return res.status(403).json({ error: "Internal chat is restricted to Admins and Agents." });
    }

    const internalMessage = await prisma.internalMessage.create({
      data: {
        senderId,
        receiverId,
        message,
        attachmentUrl: attachmentUrl || null,
        attachmentName: attachmentName || null,
      },
      include: {
        sender: { select: { id: true, name: true, role: true } },
        receiver: { select: { id: true, name: true, role: true } },
      },
    });

    // Notify recipient in-app
    await prisma.notification.create({
      data: {
        userId: receiverId,
        title: "New Internal Message",
        message: `${req.user.name} sent you a direct message: "${message.substring(0, 30)}..."`,
      },
    });

    return res.status(201).json(internalMessage);
  } catch (err) {
    console.error("Send internal message error:", err);
    return res.status(500).json({ error: "Internal server error while sending internal message." });
  }
}

export async function getHistory(req, res) {
  try {
    const { participantId } = req.params;
    const otherId = parseInt(participantId, 10);
    const myId = req.user.id;

    const page = parseInt(req.query.page, 10);
    const limit = parseInt(req.query.limit, 10) || 30;

    const filter = {
      OR: [
        { senderId: myId, receiverId: otherId },
        { senderId: otherId, receiverId: myId },
      ],
    };

    if (isNaN(page)) {
      // Return full history if page parameter is not supplied (backward-compatible)
      const history = await prisma.internalMessage.findMany({
        where: filter,
        include: {
          sender: { select: { id: true, name: true, role: true } },
          receiver: { select: { id: true, name: true, role: true } },
        },
        orderBy: { createdAt: "asc" },
      });
      return res.json(history);
    }

    const skip = (page - 1) * limit;

    const history = await prisma.internalMessage.findMany({
      where: filter,
      include: {
        sender: { select: { id: true, name: true, role: true } },
        receiver: { select: { id: true, name: true, role: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: skip,
    });

    history.reverse();

    const totalMessages = await prisma.internalMessage.count({
      where: filter,
    });

    return res.json({
      messages: history,
      total: totalMessages,
      page,
      limit,
      hasMore: totalMessages > page * limit,
    });
  } catch (err) {
    console.error("Get internal history error:", err);
    return res.status(500).json({ error: "Internal server error while fetching message history." });
  }
}
