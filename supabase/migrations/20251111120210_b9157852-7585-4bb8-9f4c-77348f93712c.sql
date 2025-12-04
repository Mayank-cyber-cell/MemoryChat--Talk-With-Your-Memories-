-- Add user_id columns to tables
ALTER TABLE public.chat_sessions ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.parsed_messages ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Drop existing permissive RLS policies
DROP POLICY IF EXISTS "Anyone can view their own chat sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "Anyone can create chat sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "Anyone can update chat sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "Anyone can view messages" ON public.parsed_messages;
DROP POLICY IF EXISTS "Anyone can create messages" ON public.parsed_messages;

-- Create proper owner-scoped RLS policies for chat_sessions
CREATE POLICY "Users can view own sessions" ON public.chat_sessions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own sessions" ON public.chat_sessions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions" ON public.chat_sessions
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions" ON public.chat_sessions
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Create proper owner-scoped RLS policies for parsed_messages
CREATE POLICY "Users can view own messages" ON public.parsed_messages
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own messages" ON public.parsed_messages
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own messages" ON public.parsed_messages
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);