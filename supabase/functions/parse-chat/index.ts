import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ParsedMessage {
  timestamp: Date | null;
  sender: string;
  text: string;
}

// Parse WhatsApp chat export format
function parseWhatsAppChat(content: string): ParsedMessage[] {
  const messages: ParsedMessage[] = [];
  // WhatsApp format: [DD/MM/YY, HH:MM:SS] Name: Message
  const whatsappRegex = /\[(\d{1,2}\/\d{1,2}\/\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s?[AP]M)?)\]\s*([^:]+):\s*(.+)/gi;
  
  let match;
  while ((match = whatsappRegex.exec(content)) !== null) {
    const [, date, time, sender, text] = match;
    messages.push({
      timestamp: parseWhatsAppDate(date, time),
      sender: sender.trim(),
      text: text.trim()
    });
  }
  
  return messages;
}

// Parse Telegram chat export format
function parseTelegramChat(content: string): ParsedMessage[] {
  const messages: ParsedMessage[] = [];
  // Telegram format: [DD.MM.YYYY HH:MM:SS] Name: Message
  const telegramRegex = /\[(\d{2}\.\d{2}\.\d{4}\s+\d{2}:\d{2}:\d{2})\]\s*([^:]+):\s*(.+)/gi;
  
  let match;
  while ((match = telegramRegex.exec(content)) !== null) {
    const [, datetime, sender, text] = match;
    messages.push({
      timestamp: parseTelegramDate(datetime),
      sender: sender.trim(),
      text: text.trim()
    });
  }
  
  return messages;
}

function parseWhatsAppDate(date: string, time: string): Date | null {
  try {
    const [day, month, year] = date.split('/').map(Number);
    const fullYear = year < 100 ? 2000 + year : year;
    
    // Handle both 12-hour and 24-hour formats
    const timeRegex = /(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s?([AP]M))?/i;
    const timeMatch = time.match(timeRegex);
    
    if (!timeMatch) return null;
    
    let [, hours, minutes, seconds = '0', period] = timeMatch;
    let hour = parseInt(hours);
    
    if (period) {
      if (period.toUpperCase() === 'PM' && hour !== 12) hour += 12;
      if (period.toUpperCase() === 'AM' && hour === 12) hour = 0;
    }
    
    return new Date(fullYear, month - 1, day, hour, parseInt(minutes), parseInt(seconds));
  } catch (e) {
    console.error('Error parsing WhatsApp date:', e);
    return null;
  }
}

function parseTelegramDate(datetime: string): Date | null {
  try {
    const [date, time] = datetime.split(' ');
    const [day, month, year] = date.split('.').map(Number);
    const [hours, minutes, seconds] = time.split(':').map(Number);
    return new Date(year, month - 1, day, hours, minutes, seconds);
  } catch (e) {
    console.error('Error parsing Telegram date:', e);
    return null;
  }
}

// Analyze conversation patterns with AI
async function analyzeConversation(messages: ParsedMessage[], lovableApiKey: string) {
  const senders = [...new Set(messages.map(m => m.sender))];
  const messageText = messages.slice(0, 100).map(m => `${m.sender}: ${m.text}`).join('\n');
  
  const prompt = `Analyze this conversation and provide insights about the personality and communication style of the participants. Focus on:
1. Personality traits (warmth, humor, directness, etc.)
2. Common phrases and expressions
3. Emotional tone and sentiment
4. Response patterns

Conversation excerpt:
${messageText}

Provide a JSON response with:
{
  "personality_traits": {
    "warmth": "score 1-10",
    "humor": "score 1-10",
    "directness": "score 1-10",
    "emotional_expression": "description"
  },
  "common_phrases": ["phrase1", "phrase2"],
  "overall_tone": "description",
  "communication_style": "description"
}`;

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${lovableApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: 'You are an expert conversation analyst. Respond only with valid JSON.' },
        { role: 'user', content: prompt }
      ],
    }),
  });

  if (!response.ok) {
    console.error('AI analysis failed:', await response.text());
    return null;
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  
  try {
    // Extract JSON from markdown code blocks if present
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || [null, content];
    return JSON.parse(jsonMatch[1]);
  } catch (e) {
    console.error('Failed to parse AI response:', e);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { chatText, platform, filename } = await req.json();

    if (!chatText || !platform) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: chatText, platform' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Parsing ${platform} chat with ${chatText.length} characters`);

    // Parse messages based on platform
    let messages: ParsedMessage[];
    if (platform === 'whatsapp') {
      messages = parseWhatsAppChat(chatText);
    } else if (platform === 'telegram') {
      messages = parseTelegramChat(chatText);
    } else if (platform === 'manual') {
      // For manual input, split by lines and assume alternating speakers
      const lines = chatText.split('\n').filter((l: string) => l.trim());
      messages = lines.map((line: string, idx: number) => ({
        timestamp: new Date(),
        sender: idx % 2 === 0 ? 'You' : 'Them',
        text: line.trim()
      }));
    } else {
      return new Response(
        JSON.stringify({ error: 'Unsupported platform' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No messages found in the chat. Please check the format.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Parsed ${messages.length} messages`);

    // Analyze conversation with AI
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    let analysis = null;
    
    if (lovableApiKey) {
      console.log('Analyzing conversation with AI...');
      analysis = await analyzeConversation(messages, lovableApiKey);
      console.log('Analysis complete:', analysis ? 'success' : 'failed');
    }

    // Create chat session
    const { data: session, error: sessionError } = await supabase
      .from('chat_sessions')
      .insert({
        user_id: user.id,
        session_name: filename || `${platform} Chat`,
        original_filename: filename,
        chat_platform: platform,
        total_messages: messages.length,
        personality_traits: analysis?.personality_traits || {},
        conversation_insights: analysis || {},
        analysis_complete: !!analysis
      })
      .select()
      .single();

    if (sessionError) {
      console.error('Session creation error:', sessionError);
      throw sessionError;
    }

    console.log('Created session:', session.id);

    // Insert messages in batches
    const batchSize = 100;
    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize).map((msg, idx) => ({
        session_id: session.id,
        user_id: user.id,
        sender_name: msg.sender,
        message_text: msg.text,
        timestamp: msg.timestamp?.toISOString() || new Date().toISOString(),
        message_order: i + idx,
      }));

      const { error: insertError } = await supabase
        .from('parsed_messages')
        .insert(batch);

      if (insertError) {
        console.error('Message insert error:', insertError);
        throw insertError;
      }
    }

    console.log('All messages inserted successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        sessionId: session.id,
        messageCount: messages.length,
        analysis: analysis
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in parse-chat function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
