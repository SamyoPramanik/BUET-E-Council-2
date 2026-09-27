-- Stores the single shared Outlook/Microsoft 365 mailbox connection used to
-- send mail via Microsoft Graph (see meeting_service/utils/msGraphAuth.js).
-- Singleton row (id always 1): one admin connects the shared mailbox once,
-- and every outgoing email reuses that connection until it's disconnected.
-- access_token/refresh_token are stored AES-256-GCM encrypted, never plaintext.
CREATE TABLE IF NOT EXISTS ms_oauth_connection (
    id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    account_email TEXT NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    connected_by UUID REFERENCES users (id) ON DELETE SET NULL,
    connected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
