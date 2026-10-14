import prisma from "../config/db.js";

export async function listNotifications(req, res) {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
    });

    return res.json(notifications);
  } catch (err) {
    console.error("List notifications error:", err);
    return res.status(500).json({ error: "Internal server error while fetching notifications." });
  }
}

export async function markAsRead(req, res) {
  try {
    const { id } = req.params;
    const notificationId = parseInt(id, 10);

    const notification = await prisma.notification.findFirst({
      where: { id: notificationId, userId: req.user.id },
    });

    if (!notification) {
      return res.status(404).json({ error: "Notification not found." });
    }

    const updated = await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });

    return res.json(updated);
  } catch (err) {
    console.error("Mark notification as read error:", err);
    return res.status(500).json({ error: "Internal server error while updating notification." });
  }
}

export async function deleteNotification(req, res) {
  try {
    const { id } = req.params;
    const notificationId = parseInt(id, 10);

    const notification = await prisma.notification.findFirst({
      where: { id: notificationId, userId: req.user.id },
    });

    if (!notification) {
      return res.status(404).json({ error: "Notification not found." });
    }

    await prisma.notification.delete({
      where: { id: notificationId },
    });

    return res.json({ message: "Notification deleted successfully." });
  } catch (err) {
    console.error("Delete notification error:", err);
    return res.status(500).json({ error: "Internal server error while deleting notification." });
  }
}
