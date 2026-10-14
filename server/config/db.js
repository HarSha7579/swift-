import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Test database connection
prisma.$connect()
  .then(() => {
    console.log("Prisma connected to Neon PostgreSQL database successfully.");
  })
  .catch((err) => {
    console.error("Prisma database connection error:", err);
  });

export default prisma;
