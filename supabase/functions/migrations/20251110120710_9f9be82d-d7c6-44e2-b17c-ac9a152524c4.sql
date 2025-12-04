-- Add tags column to chat_sessions table
ALTER TABLE public.chat_sessions 
ADD COLUMN tags text[] DEFAULT '{}';

-- Create index for better tag search performance
CREATE INDEX idx_chat_sessions_tags ON public.chat_sessions USING GIN(tags);