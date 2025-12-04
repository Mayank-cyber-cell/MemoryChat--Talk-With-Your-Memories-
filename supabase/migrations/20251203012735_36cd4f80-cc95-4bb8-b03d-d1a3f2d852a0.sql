-- Add is_archived column to chat_sessions
ALTER TABLE public.chat_sessions 
ADD COLUMN is_archived boolean NOT NULL DEFAULT false;

-- Create index for efficient filtering
CREATE INDEX idx_chat_sessions_archived ON public.chat_sessions(is_archived);