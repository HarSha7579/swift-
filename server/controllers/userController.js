import prisma from "../config/db.js";
import bcrypt from "bcryptjs";

export async function getProfile(req, res) {
  try {
    // Basic stats depending on role
    let stats = {};
    if (req.user.role === "CUSTOMER") {
      const openCount = await prisma.ticket.count({ where: { customerId: req.user.id, status: { in: ["OPEN", "IN_PROGRESS"] } } });
      const closedCount = await prisma.ticket.count({ where: { customerId: req.user.id, status: "CLOSED" } });
      const totalCount = await prisma.ticket.count({ where: { customerId: req.user.id } });
      stats = { openTickets: openCount, closedTickets: closedCount, totalTickets: totalCount };
    } else if (req.user.role === "AGENT") {
      const totalTicketsInSystem = await prisma.ticket.count();
      const assignedTotalCount = await prisma.ticket.count({ where: { agentId: req.user.id } });
      const assignedOpenCount = await prisma.ticket.count({ where: { agentId: req.user.id, status: { in: ["OPEN", "IN_PROGRESS"] } } });
      const assignedResolvedCount = await prisma.ticket.count({ where: { agentId: req.user.id, status: "RESOLVED" } });
      const acceptanceRate = assignedTotalCount > 0 ? Math.round((assignedResolvedCount / assignedTotalCount) * 100) : 100;
      stats = {
        assignedTickets: assignedTotalCount,
        resolvedTickets: assignedResolvedCount,
        openTickets: assignedOpenCount,
        acceptanceRate,
      };
    } else if (req.user.role === "ADMIN") {
      const totalTickets = await prisma.ticket.count();
      const openTickets = await prisma.ticket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } });
      stats = { totalTickets, openTickets };
    }

    return res.json({
      user: req.user,
      stats,
    });
  } catch (err) {
    console.error("Get profile error:", err);
    return res.status(500).json({ error: "Internal server error while fetching profile." });
  }
}

export async function updateProfile(req, res) {
  try {
    const { name, email, username, phone, bio } = req.body;

    if (email && email !== req.user.email) {
      // Check if email already registered
      const existingUser = await prisma.user.findFirst({
        where: { email, NOT: { id: req.user.id } },
      });
      if (existingUser) {
        return res.status(400).json({ error: "Email is already in use by another account." });
      }
    }

    let finalUsername = req.user.username;
    if (username !== undefined) {
      const trimmed = username ? username.trim() : "";
      finalUsername = trimmed === "" ? null : trimmed;
    }

    if (finalUsername !== null && finalUsername !== req.user.username) {
      // Check if username already registered
      const existingUser = await prisma.user.findFirst({
        where: { username: finalUsername, NOT: { id: req.user.id } },
      });
      if (existingUser) {
        return res.status(400).json({ error: "Username is already in use by another account." });
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        name: name !== undefined ? name : req.user.name,
        email: email !== undefined ? email : req.user.email,
        username: finalUsername,
        phone: phone !== undefined ? phone : req.user.phone,
        bio: bio !== undefined ? bio : req.user.bio,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isAvailable: true,
        username: true,
        profilePicture: true,
        phone: true,
        bio: true,
        createdAt: true,
      },
    });

    return res.json({
      message: "Profile updated successfully.",
      user: updatedUser,
    });
  } catch (err) {
    console.error("Update profile error:", err);
    return res.status(500).json({ error: "Internal server error while updating profile." });
  }
}

export async function changePassword(req, res) {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ error: "All password fields are required." });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: "New password and confirm password do not match." });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    const isMatch = await bcrypt.compare(currentPassword, dbUser.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Incorrect current password." });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { id: req.user.id },
      data: { password: hashedPassword },
    });

    return res.json({ message: "Password updated successfully." });
  } catch (err) {
    console.error("Change password error:", err);
    return res.status(500).json({ error: "Internal server error during password change." });
  }
}

export async function updateProfilePicture(req, res) {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: "Profile picture URL is required." });
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: { profilePicture: url },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isAvailable: true,
        username: true,
        profilePicture: true,
        phone: true,
        bio: true,
        createdAt: true,
      },
    });

    return res.json({
      message: "Profile picture updated successfully.",
      user: updatedUser,
    });
  } catch (err) {
    console.error("Update profile picture error:", err);
    return res.status(500).json({ error: "Internal server error while updating profile picture." });
  }
}

export async function getAdminCustomerDetails(req, res) {
  try {
    const { id } = req.params;
    const customerId = parseInt(id, 10);

    const customer = await prisma.user.findFirst({
      where: { id: customerId, role: "CUSTOMER" },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        username: true,
        profilePicture: true,
        phone: true,
        bio: true,
        createdAt: true,
      },
    });

    if (!customer) {
      return res.status(404).json({ error: "Customer not found." });
    }

    const totalTickets = await prisma.ticket.count({ where: { customerId } });
    const openTickets = await prisma.ticket.count({ where: { customerId, status: { in: ["OPEN", "IN_PROGRESS"] } } });
    const closedTickets = await prisma.ticket.count({ where: { customerId, status: "CLOSED" } });
    const resolvedTickets = await prisma.ticket.count({ where: { customerId, status: "RESOLVED" } });

    const tickets = await prisma.ticket.findMany({
      where: { customerId },
      include: {
        agent: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json({
      profile: customer,
      stats: {
        totalTickets,
        openTickets,
        closedTickets,
        resolvedTickets,
      },
      tickets,
    });
  } catch (err) {
    console.error("Get admin customer details error:", err);
    return res.status(500).json({ error: "Internal server error while fetching customer details." });
  }
}

export async function getUserById(req, res) {
  try {
    const { id } = req.params;
    const userId = parseInt(id, 10);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isAvailable: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    // Return the user details and their tickets
    let tickets = [];
    if (user.role === "CUSTOMER") {
      tickets = await prisma.ticket.findMany({
        where: { customerId: userId },
        orderBy: { createdAt: "desc" },
      });
    } else if (user.role === "AGENT") {
      tickets = await prisma.ticket.findMany({
        where: { agentId: userId },
        orderBy: { createdAt: "desc" },
      });
    }

    return res.json({
      user,
      tickets,
    });
  } catch (err) {
    console.error("Get user details by ID error:", err);
    return res.status(500).json({ error: "Internal server error while fetching user details." });
  }
}

// Admins list all users
export async function listAllUsers(req, res) {
  try {
    const { role, search } = req.query;

    let whereClause = {};
    if (role) {
      whereClause.role = role;
    }
    if (search) {
      whereClause.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
      ];
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isAvailable: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json(users);
  } catch (err) {
    console.error("List users error:", err);
    return res.status(500).json({ error: "Internal server error while listing users." });
  }
}
