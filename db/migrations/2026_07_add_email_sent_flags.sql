-- Add notice_mail_sent and agenda_mail_sent columns to invitees table
-- These track whether each invitee has received the meeting notice and agenda emails

ALTER TABLE invitees ADD COLUMN notice_mail_sent BOOLEAN DEFAULT false;
ALTER TABLE invitees ADD COLUMN agenda_mail_sent BOOLEAN DEFAULT false;
