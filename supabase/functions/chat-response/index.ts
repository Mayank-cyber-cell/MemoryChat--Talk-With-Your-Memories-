import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
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

    const { sessionId, userMessage, conversationHistory } = await req.json();

    if (!sessionId || !userMessage) {
      return new Response(
        JSON.stringify({ error: 'Missing sessionId or userMessage' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: session, error: sessionError } = await supabase
      .from('chat_sessions')
      .select('personality_traits, conversation_insights, session_name')
      .eq('id', sessionId)
      .maybeSingle();

    if (sessionError || !session) {
      return new Response(
        JSON.stringify({ error: 'Session not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const personalityTraits = session.personality_traits || {};
    const insights = session.conversation_insights || {};

    const systemPrompt = `You are roleplaying as a real person from someone's past conversations. Embody their personality authentically.

What we know about this person:
- Warmth level: ${personalityTraits.warmth || '5'}/10
- Humor level: ${personalityTraits.humor || '5'}/10
- Directness level: ${personalityTraits.directness || '5'}/10
- Emotional expression: ${personalityTraits.emotional_expression || 'balanced'}
- Communication style: ${insights.communication_style || 'conversational'}
- Overall tone: ${insights.overall_tone || 'friendly'}
${Array.isArray(insights.common_phrases) && insights.common_phrases.length > 0
  ? `- Phrases they commonly use: ${insights.common_phrases.slice(0, 5).join(', ')}`
  : ''}

Rules:
- Keep replies short and natural (1-3 sentences max)
- Use their typical vocabulary and phrasing
- Match their emotional tone
- Be authentic — avoid being overly poetic or dramatic
- Do NOT mention you are an AI`;

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const messages = [
      { role: 'system', content: systemPrompt },
      ...(Array.isArray(conversationHistory) ? conversationHistory : []).map(
        (msg: { role: string; content: string }) => ({ role: msg.role, content: msg.content })
      ),
      { role: 'user', content: userMessage }
    ];

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI response error:', response.status, errorText);
      throw new Error('AI generation failed');
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content;

    if (!aiResponse) {
      throw new Error('No response from AI');
    }

    return new Response(
      JSON.stringify({ response: aiResponse }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in chat-response:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
