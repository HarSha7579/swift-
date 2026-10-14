# AI-Powered Smart Customer Support Ticket System

A complete, production-ready full-stack AI Smart Support CRM ecosystem built with **React, Vite, Node.js (Express), and Prisma ORM**. The system leverages **Gemini 2.5 Flash** for advanced, real-time ticket diagnostics (triage, automatic priority assignment, suggested solutions, and related Knowledge Base matches) and includes a resilient Cloudinary file upload layer with native local fallback.

---

## 🛠️ Tech Stack (Exact)

- **Frontend:** React (Vite), Tailwind CSS, Axios, Context API, Lucide React, Recharts, and `motion` layout transitions.
- **Backend:** Node.js, Express.js, Prisma ORM (SQLite/PostgreSQL compatible), JWT authentication, bcrypt password hashing, and Zod schema validations.
- **AI Engine:** Google Gemini 2.5 Flash (via modern `@google/genai` SDK).
- **Files Storage:** Cloudinary integration with disk-based local uploads fallback.

---

## 🚀 Quick Start (Instant Sandbox Execution)

The system is configured with **zero-config SQLite database integration** and auto-seeding. It boots immediately out-of-the-box!

### 1. Configure Local Environment
Create a `.env` file at the project root by copying `.env.example`:
```bash
cp .env.example .env
```

Your `.env` should contain:
```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="super_secret_jwt_signature_key"
GEMINI_API_KEY="YOUR_GOOGLE_GEMINI_API_KEY"

# Optional Cloudinary (Omitting enables local public/uploads folder fallback automatically!)
CLOUDINARY_CLOUD_NAME=""
CLOUDINARY_API_KEY=""
CLOUDINARY_API_SECRET=""
```

### 2. Install & Launch
Run the following commands in sequence:
```bash
# Install dependencies
npm install

# Initialize and push Prisma schema to SQLite
npx prisma db push

# Start the full-stack server
npm run dev
```

The application dev server will bind and be accessible on **`http://localhost:3000`** (serving both the API and the dynamic hot-reloading Vite frontend).

---

## 🔑 Default Test Sandbox Credentials
The system automatically detects an empty database on boot and seeds the following test accounts and Knowledge Base manuals:

| Role | Email | Password | Features / Access |
| :--- | :--- | :--- | :--- |
| **System Admin** | `admin@support.com` | `password123` | Analytics dashboard, routing managers, staff controls, KB CRUD, Operator Chat |
| **Support Agent** | `agent@support.com` | `password123` | Active tickets, triage claim queue, AI ✨ Suggested Reply workspace, Operator Chat |
| **Customer** | `customer@support.com` | `password123` | Self-service KB articles, AI ticket triaging form, replies with file attachments |

---

## 🔮 Core AI Architecture & Fail-Safe Resiliency

1. **AI Ticket Analysis (Customer Creation Stage):**
   - When a Customer logs a ticket, they write a Subject and Description and click **Analyze Issue**.
   - Gemini 2.5 Flash categorizes the issue (e.g. `Login & Auth`), predicts urgency, generates custom troubleshooting steps, and finds matching self-help guides.
   - The ticket is NOT auto-saved; the customer reviews diagnostics and clicks **Confirm & Submit** to save both original details and AI metadata to the database.

2. **✨ AI suggested Replies (Agent Stage):**
   - Inside the active ticket workspace, Agents click **Suggest Reply with AI**.
   - Gemini analyzes the initial issue, previous chat correspondence, and action history logs to draft a highly context-aware draft response.
   - The Agent edits, refines, and applies the draft to the chat box.

3. **Coprocessor Fail-Safe Fallbacks:**
   - If the `GEMINI_API_KEY` is missing or invalid, the system automatically redirects requests through a **rule-based local fallback algorithm** ensuring zero system crashes and full interface runnability during development!
   - Similarly, if Cloudinary credentials are empty, files upload instantly to local disk under `public/uploads/` and serve statically from port 3000.
