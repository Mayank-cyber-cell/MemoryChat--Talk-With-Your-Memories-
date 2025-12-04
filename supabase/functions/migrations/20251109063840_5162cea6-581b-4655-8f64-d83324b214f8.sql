-- Create chat_sessions table to store uploaded chat files
CREATE TABLE public.chat_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_name TEXT NOT NULL,
  original_filename TEXT,
  chat_platform TEXT CHECK (chat_platform IN ('whatsapp', 'telegram', 'manual')),
  total_messages INT DEFAULT 0,
  analysis_complete BOOLEAN DEFAULT false,
  personality_traits JSONB,
  conversation_insights JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create parsed_messages table to store individual messages
CREATE TABLE public.parsed_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  sender_name TEXT NOT NULL,
  message_text TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE,
  message_order INT NOT NULL,
  sentiment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX idx_parsed_messages_session_id ON public.parsed_messages(session_id);
CREATE INDEX idx_parsed_messages_timestamp ON public.parsed_messages(timestamp);
CREATE INDEX idx_chat_sessions_created_at ON public.chat_sessions(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parsed_messages ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (since this is a public-facing feature)
CREATE POLICY "Anyone can create chat sessions" 
ON public.chat_sessions 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can view their own chat sessions" 
ON public.chat_sessions 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can update chat sessions" 
ON public.chat_sessions 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can create messages" 
ON public.parsed_messages 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can view messages" 
ON public.parsed_messages 
FOR SELECT 
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_chat_sessions_updated_at
BEFORE UPDATE ON public.chat_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();