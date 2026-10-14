import { z } from "zod";
import bcrypt from "bcryptjs";
import prisma from "../config/db.js";
import { generateToken } from "../middleware/auth.js";

const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(2, "Name must be at least 2 characters"),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string(),
});

export async function register(req, res) {
  try {
    // Strip or ignore role field if present in req.body
    const { role: ignoredRole, ...registerData } = req.body;
    const validatedData = registerSchema.parse(registerData);

    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });

    if (existingUser) {
      return res.status(400).json({ error: "Email is already registered." });
    }

    const hashedPassword = await bcrypt.hash(validatedData.password, 10);

    const user = await prisma.user.create({
      data: {
        email: validatedData.email,
        password: hashedPassword,
        name: validatedData.name,
        role: "CUSTOMER",
        isAvailable: false,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    // Automatically seed custom notifications on register
    await prisma.notification.create({
      data: {
        userId: user.id,
        title: "Welcome to AI Smart Support!",
        message: `Hello ${user.name}, your account has been created successfully as a ${user.role.toLowerCase()}.`,
      },
    });

    const token = generateToken({ id: user.id, email: user.email, role: user.role });

    return res.status(201).json({
      message: "User registered successfully.",
      user,
      token,
    });
  } catch (err) {
    if (err instanceof z.ZodError || err.name === "ZodError" || err.errors) {
      return res.status(400).json({ error: err.errors?.[0]?.message || err.message || "Validation failed" });
    }
    console.error("Registration error:", err);
    return res.status(500).json({ error: "Internal server error during registration." });
  }
}

export async function login(req, res) {
  try {
    const validatedData = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });

    if (!user) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const passwordMatch = await bcrypt.compare(validatedData.password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const token = generateToken({ id: user.id, email: user.email, role: user.role });

    return res.json({
      message: "Login successful.",
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isAvailable: user.isAvailable,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError || err.name === "ZodError" || err.errors) {
      return res.status(400).json({ error: err.errors?.[0]?.message || err.message || "Validation failed" });
    }
    console.error("Login error:", err);
    return res.status(500).json({ error: "Internal server error during login." });
  }
}

export function logout(req, res) {
  // Traditional JWT logout is handled on client side by wiping the token.
  // We return a simple successful response.
  return res.json({ message: "Logout successful. Please clear token in client." });
}

export function verify(req, res) {
  // If the request passes the verifyToken middleware, req.user will be populated.
  return res.json({ user: req.user });
}
