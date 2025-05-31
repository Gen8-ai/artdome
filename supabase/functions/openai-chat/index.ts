
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChatRequest {
  message?: string;
  messages?: Array<{ role: string; content: string }>;
  conversationId?: string;
  modelId?: string;
  systemPrompt?: string;
  parameters?: {
    temperature?: number;
    max_tokens?: number;
    top_p?: number;
    frequency_penalty?: number;
    presence_penalty?: number;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get the user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    const requestBody: ChatRequest = await req.json();
    const { message, messages, conversationId, modelId, systemPrompt, parameters } = requestBody;
    
    // Support both single message and messages array format
    const userMessage = message || (messages && messages[messages.length - 1]?.content);
    if (!userMessage?.trim()) {
      throw new Error('Message is required');
    }

    console.log('Chat request:', { 
      userMessage: userMessage.substring(0, 100) + '...', 
      conversationId, 
      modelId, 
      userId: user.id,
      hasSystemPrompt: !!systemPrompt 
    });

    // Get or create conversation
    let conversation;
    if (conversationId) {
      const { data: existingConv } = await supabaseClient
        .from('chat_conversations')
        .select('*')
        .eq('id', conversationId)
        .eq('user_id', user.id)
        .single();
      conversation = existingConv;
    }

    if (!conversation) {
      // Create new conversation
      const { data: newConv, error: convError } = await supabaseClient
        .from('chat_conversations')
        .insert({
          user_id: user.id,
          model_id: modelId,
          title: userMessage.substring(0, 50) + (userMessage.length > 50 ? '...' : ''),
        })
        .select()
        .single();

      if (convError) throw convError;
      conversation = newConv;
    }

    // Get model details
    const { data: model } = await supabaseClient
      .from('ai_models')
      .select('*')
      .eq('id', modelId || conversation.model_id)
      .single();

    const selectedModel = model?.name || 'gpt-4o-mini';

    // Get conversation history if using messages array, otherwise get from database
    let openaiMessages = [];
    
    if (systemPrompt) {
      openaiMessages.push({ role: 'system', content: systemPrompt });
    }

    if (messages && messages.length > 1) {
      // Use provided messages array (excluding the last user message)
      openaiMessages.push(...messages.slice(0, -1));
    } else {
      // Get conversation history from database
      const { data: dbMessages } = await supabaseClient
        .from('chat_messages')
        .select('role, content')
        .eq('conversation_id', conversation.id)
        .order('created_at', { ascending: true });

      if (dbMessages) {
        openaiMessages.push(...dbMessages);
      }
    }

    openaiMessages.push({ role: 'user', content: userMessage });

    // Save user message to database
    const { error: userMsgError } = await supabaseClient
      .from('chat_messages')
      .insert({
        conversation_id: conversation.id,
        role: 'user',
        content: userMessage,
        model_used: selectedModel,
      });

    if (userMsgError) throw userMsgError;

    // Call OpenAI API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: openaiMessages,
        temperature: parameters?.temperature || 0.7,
        max_tokens: parameters?.max_tokens || 1000,
        top_p: parameters?.top_p || 1.0,
        frequency_penalty: parameters?.frequency_penalty || 0.0,
        presence_penalty: parameters?.presence_penalty || 0.0,
      }),
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json();
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const openaiData = await openaiResponse.json();
    const assistantMessage = openaiData.choices[0]?.message?.content || 'No response generated';
    const tokensUsed = openaiData.usage?.total_tokens || 0;
    const inputTokens = openaiData.usage?.prompt_tokens || 0;
    const outputTokens = openaiData.usage?.completion_tokens || 0;

    // Calculate cost based on model pricing
    const inputCost = (inputTokens * (model?.input_cost_per_token || 0.00000015));
    const outputCost = (outputTokens * (model?.output_cost_per_token || 0.0000006));
    const totalCost = inputCost + outputCost;

    // Save assistant message
    const { error: assistantMsgError } = await supabaseClient
      .from('chat_messages')
      .insert({
        conversation_id: conversation.id,
        role: 'assistant',
        content: assistantMessage,
        tokens_used: tokensUsed,
        cost: totalCost,
        model_used: selectedModel,
        metadata: { usage: openaiData.usage },
      });

    if (assistantMsgError) throw assistantMsgError;

    // Update conversation totals
    const { error: updateError } = await supabaseClient
      .from('chat_conversations')
      .update({
        total_tokens: (conversation.total_tokens || 0) + tokensUsed,
        total_cost: (conversation.total_cost || 0) + totalCost,
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversation.id);

    if (updateError) throw updateError;

    // Record usage analytics
    const { error: analyticsError } = await supabaseClient
      .from('ai_usage_analytics')
      .insert({
        user_id: user.id,
        model_name: selectedModel,
        tokens_used: tokensUsed,
        cost: totalCost,
        request_type: 'chat',
      });

    if (analyticsError) console.error('Analytics error:', analyticsError);

    console.log('Chat completed successfully:', { 
      conversationId: conversation.id, 
      tokensUsed, 
      cost: totalCost,
      systemPromptUsed: !!systemPrompt
    });

    return new Response(JSON.stringify({
      success: true,
      conversationId: conversation.id,
      message: assistantMessage,
      choices: [{ message: { content: assistantMessage } }],
      usage: {
        total_tokens: tokensUsed,
        prompt_tokens: inputTokens,
        completion_tokens: outputTokens,
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Chat error:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
