import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting database seeding...");

  // 1. Seed Roles
  console.log("Seeding Roles table...");
  const roles = ["CUSTOMER", "AGENT", "ADMIN"];
  
  // Note: Since Role model might not be in Prisma schema yet, we use a raw query or ignore if Prisma client doesn't have it.
  // For safety, let's execute standard model seeds with Prisma Client:
  
  // 2. Hash password
  const salt = await bcrypt.genSalt(10);
  const commonPasswordHash = await bcrypt.hash("password123", salt);

  // 3. Seed Users
  console.log("Seeding Users...");
  
  // 1 Admin
  const admin = await prisma.user.upsert({
    where: { email: "admin@support.com" },
    update: {},
    create: {
      email: "admin@support.com",
      password: commonPasswordHash,
      name: "Chief Admin",
      role: "ADMIN",
      isAvailable: false,
      username: "admin_chief",
      phone: "+1-555-0100",
      bio: "Global Customer Service Operations Administrator.",
    },
  });

  // 2 Agents
  const agent1 = await prisma.user.upsert({
    where: { email: "agent1@support.com" },
    update: {},
    create: {
      email: "agent1@support.com",
      password: commonPasswordHash,
      name: "Agent Miller",
      role: "AGENT",
      isAvailable: true,
      username: "agent_miller",
      phone: "+1-555-0101",
      bio: "Specializing in accounts, billing, and system access issues.",
    },
  });

  const agent2 = await prisma.user.upsert({
    where: { email: "agent2@support.com" },
    update: {},
    create: {
      email: "agent2@support.com",
      password: commonPasswordHash,
      name: "Agent Davis",
      role: "AGENT",
      isAvailable: true,
      username: "agent_davis",
      phone: "+1-555-0102",
      bio: "Specializing in complex technical bugs and system integrations.",
    },
  });

  // 2 Customers
  const customer1 = await prisma.user.upsert({
    where: { email: "customer1@support.com" },
    update: {},
    create: {
      email: "customer1@support.com",
      password: commonPasswordHash,
      name: "Alice Smith",
      role: "CUSTOMER",
      isAvailable: false,
      username: "alice_smith",
      phone: "+1-555-0120",
      bio: "Standard Plan Enterprise Customer.",
    },
  });

  const customer2 = await prisma.user.upsert({
    where: { email: "customer2@support.com" },
    update: {},
    create: {
      email: "customer2@support.com",
      password: commonPasswordHash,
      name: "Bob Johnson",
      role: "CUSTOMER",
      isAvailable: false,
      username: "bob_johnson",
      phone: "+1-555-0121",
      bio: "Pro Plan Customer.",
    },
  });

  console.log("Users seeded successfully.");

  // 4. Seed Knowledge Base Articles
  console.log("Seeding Knowledge Base articles...");
  const articles = [
    {
      title: "Resetting Your Account Password",
      content: "To reset your password:\n1. Click on the 'Forgot Password' link on the login screen.\n2. Enter your registered email address.\n3. Click 'Send Reset Link'.\n4. Open the email and follow the instructions to secure your account with a new password.\n\nTip: Passwords must be at least 8 characters long and contain numbers and symbols.",
      category: "Login & Authentication",
      problem: "I forgot my password and cannot log into my support dashboard.",
      solution: "Use the self-service reset password link sent to your registered email.",
      tags: "authentication, password, reset, login",
      createdById: admin.id,
    },
    {
      title: "Troubleshooting Account Login Failures",
      content: "If you cannot login, try the following:\n- Double check Caps Lock.\n- Clear your browser's cookies and local storage, or open an Incognito window.\n- Verify your internet connection.\n- Ensure you have completed the email confirmation if your account is new.\n\nIf the issue persists, please submit a high priority support ticket.",
      category: "Login & Authentication",
      problem: "The login page keeps refreshing or throws validation errors during log in.",
      solution: "Perform a hard browser cache refresh or use Private/Incognito browsing mode.",
      tags: "login, auth, login-error, cache",
      createdById: admin.id,
    },
    {
      title: "Updating Your Payment Information",
      content: "You can update your payment methods at any time:\n1. Log in and navigate to Account Settings.\n2. Click on the 'Billing & Payments' tab.\n3. Click 'Update Card' or 'Add Payment Method'.\n4. Fill in your credit/debit card information and match the exact billing address.\n5. Click 'Save' to securely update your details via Stripe.",
      category: "Billing",
      problem: "I need to update my credit card details for subscription renewal.",
      solution: "Navigate to Account Settings -> Billing & Payments and securely save your new card.",
      tags: "billing, credit-card, payments, subscription",
      createdById: admin.id,
    },
    {
      title: "Optimizing App Performance",
      content: "If the application feels slow or laggy:\n- Refresh the page to clear browser state.\n- Minimize the number of active browser tabs.\n- Ensure you are running Chrome or Safari on their latest version.\n- Disable ad-blockers or external network proxies that might limit connection latency.",
      category: "Performance Issue",
      problem: "Dashboard data visualization charts are loading slowly or freezing.",
      solution: "Wipe site-specific cookies and deactivate external network proxy/VPN layers.",
      tags: "performance, slow, optimization, memory",
      createdById: admin.id,
    }
  ];

  for (const article of articles) {
    await prisma.knowledgeBase.create({
      data: article
    });
  }
  console.log("Knowledge Base seeded successfully.");

  // 5. Seed Sample Tickets
  console.log("Seeding sample tickets...");
  const ticket1 = await prisma.ticket.create({
    data: {
      subject: "Credit card payment keeps declining during checkout",
      description: "Hi support team, I have been trying to upgrade my support plan to premium but my corporate credit card keeps throwing a decline error. I have confirmed with my bank that there are no hold-blocks on my card. Please help!",
      category: "Billing & Payment",
      priority: "HIGH",
      status: "OPEN",
      customerId: customer1.id,
      aiCategory: "Billing & Payment",
      aiPriority: "HIGH",
      aiConfidence: 94.5,
      aiReason: "The ticket involves credit card transaction declines blocking upgrade checkout with corporate credit card, indicating a High business impact.",
    },
  });

  const ticket2 = await prisma.ticket.create({
    data: {
      subject: "Database latency peak and sluggish query resolution times",
      description: "Our API reports connection timeout warnings when requesting records from the customer analytical tables. This is bottlenecking our shipping department. Urgent intervention requested.",
      category: "Technical",
      priority: "URGENT",
      status: "IN_PROGRESS",
      customerId: customer2.id,
      agentId: agent2.id,
      aiCategory: "Technical",
      aiPriority: "URGENT",
      aiConfidence: 98.2,
      aiReason: "Critical query bottlenecks and connections timeouts are blocking shipping logistics, causing an active high severity operational incident.",
    },
  });

  // Seed Ticket Messages / Chat history
  await prisma.ticketMessage.create({
    data: {
      ticketId: ticket1.id,
      senderId: customer1.id,
      message: "Please let me know if you need our billing profile details or any transaction log IDs.",
    }
  });

  await prisma.ticketMessage.create({
    data: {
      ticketId: ticket2.id,
      senderId: agent2.id,
      message: "I am actively checking the analytical connection pool limits right now and increasing our concurrent container allocations.",
    }
  });

  console.log("Sample tickets and chat messages seeded successfully.");
  console.log("Database seeding completed perfectly!");
}

main()
  .catch((e) => {
    console.error("Error during database seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
