-- ====================================================================
-- Production-Ready DDL Script for Neon PostgreSQL Database
-- Smart AI Support Ticket System
-- ====================================================================

-- 1. Create Roles Table
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Insert Default System Roles
INSERT INTO roles (name) VALUES 
('CUSTOMER'), 
('AGENT'), 
('ADMIN') 
ON CONFLICT (name) DO NOTHING;

-- 2. Create Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'CUSTOMER' NOT NULL, -- Keep text role for native Prisma mapping compatibility
    is_available BOOLEAN DEFAULT TRUE NOT NULL,    -- For Agents
    username VARCHAR(100) UNIQUE,
    profile_picture TEXT,
    phone VARCHAR(50),
    bio TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 3. Create Tickets Table
CREATE TABLE IF NOT EXISTS tickets (
    id SERIAL PRIMARY KEY,
    subject VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,               -- Predicted or updated
    priority VARCHAR(50) NOT NULL,               -- LOW, MEDIUM, HIGH, URGENT
    status VARCHAR(50) DEFAULT 'OPEN' NOT NULL,  -- OPEN, IN_PROGRESS, RESOLVED, CLOSED, ASSIGNED, PENDING_CUSTOMER
    ai_category VARCHAR(100),
    ai_priority VARCHAR(50),
    ai_solutions TEXT,                           -- JSON-serialized array
    ai_kb_articles TEXT,                         -- JSON-serialized array
    ai_reason TEXT,
    ai_confidence DOUBLE PRECISION,
    ai_urgency VARCHAR(50),
    ai_impact VARCHAR(50),
    ai_primary_issue TEXT,
    customer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    agent_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 4. Create Ticket Messages Table (Chat & Conversation Thread)
CREATE TABLE IF NOT EXISTS ticket_messages (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 5. Create Ticket Attachments Table
CREATE TABLE IF NOT EXISTS ticket_attachments (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER REFERENCES tickets(id) ON DELETE CASCADE,
    ticket_message_id INTEGER REFERENCES ticket_messages(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_attachment_owner CHECK (
        (ticket_id IS NOT NULL) OR (ticket_message_id IS NOT NULL)
    )
);

-- 6. Create Ticket History Table (Audit Log)
CREATE TABLE IF NOT EXISTS ticket_history (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    changed_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 7. Create Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 8. Create Knowledge Base Table
CREATE TABLE IF NOT EXISTS knowledge_base (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT,                                -- Optional for backwards compatibility
    category VARCHAR(100) NOT NULL,
    problem TEXT,
    solution TEXT,
    tags TEXT,                                   -- Comma separated tags
    created_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 9. Create Internal Messages Table (Chat Admin ↔ Agent)
CREATE TABLE IF NOT EXISTS internal_messages (
    id SERIAL PRIMARY KEY,
    sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    attachment_url TEXT,
    attachment_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 10. Create Agent Assignments Table (Workload / Assignment Log)
CREATE TABLE IF NOT EXISTS agent_assignments (
    id SERIAL PRIMARY KEY,
    agent_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    status VARCHAR(50) DEFAULT 'ASSIGNED' NOT NULL
);

-- ====================================================================
-- Database Performance Indexes
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users (username) WHERE username IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tickets_customer_id ON tickets (customer_id);
CREATE INDEX IF NOT EXISTS idx_tickets_agent_id ON tickets (agent_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets (status);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket_id ON ticket_messages (ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_attachments_ticket_id ON ticket_attachments (ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_attachments_message_id ON ticket_attachments (ticket_message_id);
CREATE INDEX IF NOT EXISTS idx_ticket_history_ticket_id ON ticket_history (ticket_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications (user_id) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_kb_category ON knowledge_base (category);
CREATE INDEX IF NOT EXISTS idx_internal_messages_sender_receiver ON internal_messages (sender_id, receiver_id);
CREATE INDEX IF NOT EXISTS idx_agent_assignments_agent ON agent_assignments (agent_id);
