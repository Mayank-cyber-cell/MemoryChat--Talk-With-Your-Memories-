import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

interface ParsedMessage {
  timestamp: Date | null;
  sender: string;
  text: string;
}

function parseWhatsAppChat(content: string): ParsedMessage[] {
  const messages: ParsedMessage[] = [];

  const bracketSplit = /(?=\[\d{1,2}\/\d{1,2}\/\d{2,4},\s*\d{1,2}:\d{2})/;
  const dashSplit = /(?=\d{1,2}\/\d{1,2}\/\d{2,4},\s*\d{1,2}:\d{2}\s+-)/;

  const hasBrackets = /\[\d{1,2}\/\d{1,2}\/\d{2,4},/.test(content);
  const parts = content.split(hasBrackets ? bracketSplit : dashSplit).filter(p => p.trim());

  for (const part of parts) {
    let date = '', time = '', sender = '', text = '';

    if (hasBrackets) {
      const m = part.match(/^\[(\d{1,2}\/\d{1,2}\/\d{2,4}),\s*(\d{1,2}:\d{2}(?::\d{2})?(?:\s?[AP]M)?)\]\s*([^:]+?):\s*([\s\S]*)/i);
      if (!m) continue;
      [, date, time, sender, text] = m;
    } else {
      const m = part.match(/^(\d{1,2}\/\d{1,2}\/\d{2,4}),\s*(\d{1,2}:\d{2}(?::\d{2})?(?:\s?[AP]M)?)\s+-\s*([^:]+?):\s*([\s\S]*)/i);
      if (!m) continue;
      [, date, time, sender, text] = m;
    }

    const cleanText = text.trim();
    const cleanSender = sender.trim();

    if (!cleanText || cleanSender === 'Messages and calls are end-to-end encrypted') continue;
    if (cleanText === '<Media omitted>' || cleanText === 'image omitted' || cleanText === 'video omitted') continue;

    messages.push({
      timestamp: parseWhatsAppDate(date, time),
      sender: cleanSender,
      text: cleanText
    });
  }

  return messages;
}

function parseTelegramChat(content: string): ParsedMessage[] {
  const messages: ParsedMessage[] = [];
  const lines = content.split('\n');
  const headerRegex = /^\[(\d{2}\.\d{2}\.\d{4}\s+\d{2}:\d{2}:\d{2})\]\s*([^:]+?):\s*(.*)/;

  let currentMsg: ParsedMessage | null = null;

  for (const line of lines) {
    const match = line.match(headerRegex);
    if (match) {
      if (currentMsg) messages.push(currentMsg);
      const [, datetime, sender, text] = match;
      currentMsg = {
        timestamp: parseTelegramDate(datetime),
        sender: sender.trim(),
        text: text.trim()
      };
    } else if (currentMsg && line.trim()) {
      currentMsg.text += '\n' + line.trim();
    }
  }

  if (currentMsg) messages.push(currentMsg);
  return messages;
}

function parseManualChat(content: string): ParsedMessage[] {
  const messages: ParsedMessage[] = [];
  const lines = content.split('\n').filter(l => l.trim());
  const nameColonRegex = /^([A-Za-z][A-Za-z0-9 _-]{0,30}):\s+(.+)/;

  const hasNamePattern = lines.filter(l => nameColonRegex.test(l)).length >= Math.min(3, lines.length * 0.3);

  if (hasNamePattern) {
    let currentSender = '';
    let currentParts: string[] = [];

    for (const line of lines) {
      const match = line.match(nameColonRegex);
      if (match) {
        if (currentSender && currentParts.length) {
          messages.push({ timestamp: null, sender: currentSender, text: currentParts.join(' ').trim() });
        }
        currentSender = match[1].trim();
        currentParts = [match[2]];
      } else if (currentSender) {
        currentParts.push(line);
      }
    }
    if (currentSender && currentParts.length) {
      messages.push({ timestamp: null, sender: currentSender, text: currentParts.join(' ').trim() });
    }
  } else {
    let sender = 'You';
    for (const line of lines) {
      messages.push({ timestamp: null, sender, text: line.trim() });
      sender = sender === 'You' ? 'Them' : 'You';
    }
  }

  return messages;
}

function parseWhatsAppDate(date: string, time: string): Date | null {
  try {
    const [day, month, year] = date.split('/').map(Number);
    const fullYear = year < 100 ? 2000 + year : year;
    const timeRegex = /(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s?([AP]M))?/i;
    const timeMatch = time.match(timeRegex);
    if (!timeMatch) return null;
    const [, hours, minutes, seconds = '0', period] = timeMatch;
    let hour = parseInt(hours);
    if (period) {
      if (period.toUpperCase() === 'PM' && hour !== 12) hour += 12;
      if (period.toUpperCase() === 'AM' && hour === 12) hour = 0;
    }
    return new Date(fullYear, month - 1, day, hour, parseInt(minutes), parseInt(seconds));
  } catch (_e) {
    return null;
  }
}

function parseTelegramDate(datetime: string): Date | null {
  try {
    const [date, time] = datetime.split(' ');
    const [day, month, year] = date.split('.').map(Number);
    const [hours, minutes, seconds] = time.split(':').map(Number);
    return new Date(year, month - 1, day, hours, minutes, seconds);
  } catch (_e) {
    return null;
  }
}

async function analyzeConversation(messages: ParsedMessage[], lovableApiKey: string) {
  try {
    const sample = messages.slice(0, 80).map(m => `${m.sender}: ${m.text}`).join('\n');

    const prompt = `Analyze this conversation and provide personality/communication insights.

Conversation:
${sample}

Reply ONLY with a valid JSON object, no markdown:
{
  "personality_traits": {
    "warmth": "1-10",
    "humor": "1-10",
    "directness": "1-10",
    "emotional_expression": "brief description"
  },
  "common_phrases": ["phrase1", "phrase2", "phrase3"],
  "overall_tone": "one word",
  "communication_style": "brief description"
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
          { role: 'system', content: 'You are a conversation analyst. Respond ONLY with valid JSON, no markdown.' },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      console.error('AI analysis failed:', response.status);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) return null;

    const cleaned = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.error('Failed to analyze conversation:', e);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: missing auth header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase environment variables');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized: invalid user' }),
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

    console.log(`Parsing ${platform} chat, length: ${chatText.length}`);

    let messages: ParsedMessage[];
    if (platform === 'whatsapp') {
      messages = parseWhatsAppChat(chatText);
    } else if (platform === 'telegram') {
      messages = parseTelegramChat(chatText);
    } else {
      messages = parseManualChat(chatText);
    }

    console.log(`Parsed ${messages.length} messages`);

    if (messages.length === 0) {
      return new Response(
        JSON.stringify({
          error: 'No messages found. Supported formats: WhatsApp export (.txt), Telegram export (.txt), or "Name: message" format.'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    let analysis = null;

    if (lovableApiKey) {
      console.log('Analyzing conversation with AI...');
      analysis = await analyzeConversation(messages, lovableApiKey);
      console.log('Analysis:', analysis ? 'success' : 'failed');
    }

    const senders = [...new Set(messages.map(m => m.sender))];
    const sessionName = filename
      ? filename.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ')
      : senders.slice(0, 2).join(' & ') || `${platform} Chat`;

    console.log('Creating session:', sessionName);

    const { data: session, error: sessionError } = await supabase
      .from('chat_sessions')
      .insert({
        user_id: user.id,
        session_name: sessionName,
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
      throw new Error(`Failed to create session: ${sessionError.message}`);
    }

    console.log('Session created:', session.id);

    const batchSize = 100;
    for (let batchStart = 0; batchStart < messages.length; batchStart += batchSize) {
      const batch = messages.slice(batchStart, batchStart + batchSize).map((msg, idxInBatch) => ({
        session_id: session.id,
        user_id: user.id,
        sender_name: msg.sender,
        message_text: msg.text,
        timestamp: msg.timestamp?.toISOString() ?? null,
        message_order: batchStart + idxInBatch,
      }));

      const { error: insertError } = await supabase
        .from('parsed_messages')
        .insert(batch);

      if (insertError) {
        console.error('Message insert error:', insertError);
        throw new Error(`Failed to insert messages: ${insertError.message}`);
      }
    }

    console.log('All messages inserted successfully');

    return new Response(
      JSON.stringify({
        success: true,
        sessionId: session.id,
        messageCount: messages.length,
        analysis
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in parse-chat:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
