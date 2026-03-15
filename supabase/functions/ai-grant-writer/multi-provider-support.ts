// Multi-Provider AI Support Module
// Handles routing to different AI providers (OpenAI, Anthropic, Google, etc.)

interface AIRequest {
  provider: string;
  model: string;
  messages: any[];
  maxTokens?: number;
  temperature?: number;
}

interface AIResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// Check if OpenAI model requires max_completion_tokens instead of max_tokens
function requiresMaxCompletionTokens(model: string): boolean {
  const newModels = [
    'gpt-5-2025-08-07',
    'gpt-5-mini-2025-08-07',
    'gpt-5-nano-2025-08-07',
    'gpt-4.1-2025-04-14',
    'gpt-4.1-mini-2025-04-14',
    'o3-2025-04-16',
    'o4-mini-2025-04-16',
  ];
  return newModels.includes(model);
}

// Build OpenAI request body with correct parameters
function buildOpenAIRequest(model: string, messages: any[], maxTokens: number): any {
  const baseRequest: any = {
    model,
    messages,
  };
  
  if (requiresMaxCompletionTokens(model)) {
    baseRequest.max_completion_tokens = maxTokens;
  } else {
    baseRequest.max_tokens = maxTokens;
    baseRequest.temperature = 0.7;
  }
  
  return baseRequest;
}

// PHASE 4: Call OpenAI API with automatic fallback on reasoning model errors
async function callOpenAI(request: AIRequest, isRetry = false): Promise<AIResponse> {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  const requestBody = buildOpenAIRequest(
    request.model,
    request.messages,
    request.maxTokens || 1000
  );

  console.log(`[OpenAI] Calling with model: ${request.model}${isRetry ? ' (retry with fallback)' : ''}`);

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error: ${errorText}`);
  }

  const data = await response.json();
  
  // PHASE 1: Handle reasoning token models properly
  const completionDetails = data.usage?.completion_tokens_details;
  const isReasoningModel = ['gpt-5-2025-08-07', 'o3-2025-04-16', 'o4-mini-2025-04-16'].includes(request.model);
  
  // Log detailed response structure
  console.log(`[OpenAI] Full response structure:`, {
    hasChoices: !!data.choices,
    choicesLength: data.choices?.length,
    firstChoice: data.choices?.[0] ? {
      hasMessage: !!data.choices[0].message,
      messageKeys: Object.keys(data.choices[0].message || {}),
      contentType: typeof data.choices[0].message?.content,
      contentLength: data.choices[0].message?.content?.length,
      contentPreview: data.choices[0].message?.content?.substring(0, 100),
      hasRefusal: !!data.choices[0].message?.refusal,
      refusalContent: data.choices[0].message?.refusal
    } : null,
    usage: data.usage,
    completionDetails
  });
  
  // Extract content with fallbacks and validation
  let content = '';
  
  if (data.choices?.[0]?.message?.content) {
    content = data.choices[0].message.content;
  } else if (data.choices?.[0]?.text) {
    // Legacy format fallback
    content = data.choices[0].text;
  } else if (data.choices?.[0]?.message?.refusal) {
    // Handle content refusal
    console.error(`[OpenAI] Content refused:`, data.choices[0].message.refusal);
    throw new Error(`OpenAI refused to generate content: ${data.choices[0].message.refusal}`);
  }
  
  // PHASE 4: Enhanced error handling with automatic fallback
  if (isReasoningModel && completionDetails?.reasoning_tokens > 0 && (!content || content.length === 0)) {
    console.error(`[OpenAI] Reasoning model ${request.model} used ${completionDetails.reasoning_tokens} reasoning tokens but produced no output`);
    
    // PHASE 4: Automatic fallback to GPT-4.1 if not already a retry
    if (!isRetry && request.model !== 'gpt-4.1-2025-04-14') {
      console.log(`[OpenAI] Auto-fallback: Retrying with GPT-4.1...`);
      return await callOpenAI({
        ...request,
        model: 'gpt-4.1-2025-04-14'
      }, true);
    }
    
    throw new Error(
      `The AI model completed its reasoning but produced no output. ` +
      `Please try simplifying your prompt or contact support if this persists.`
    );
  }
  
  // Log extraction result
  console.log(`[OpenAI] Content extraction result:`, {
    extracted: !!content,
    length: content.length,
    preview: content.substring(0, 100)
  });
  
  return {
    content,
    usage: {
      promptTokens: data.usage?.prompt_tokens || 0,
      completionTokens: data.usage?.completion_tokens || 0,
      totalTokens: data.usage?.total_tokens || 0,
    }
  };
}

// Call Anthropic API
async function callAnthropic(request: AIRequest): Promise<AIResponse> {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured. Please add it in Supabase Edge Function Secrets.');
  }

  // Transform messages format for Anthropic
  const systemMessage = request.messages.find((m: any) => m.role === 'system');
  const userMessages = request.messages.filter((m: any) => m.role !== 'system');

  console.log(`[Anthropic] Calling with model: ${request.model}`);

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: request.model,
      max_tokens: request.maxTokens || 1000,
      system: systemMessage?.content || '',
      messages: userMessages,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Anthropic API error: ${errorText}`);
  }

  const data = await response.json();
  
  return {
    content: data.content[0].text,
    usage: {
      promptTokens: data.usage?.input_tokens || 0,
      completionTokens: data.usage?.output_tokens || 0,
      totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
    }
  };
}

// Call Google Gemini API
async function callGoogleGemini(request: AIRequest): Promise<AIResponse> {
  const apiKey = Deno.env.get('GOOGLE_AI_API_KEY');
  if (!apiKey) {
    throw new Error('GOOGLE_AI_API_KEY not configured. Please add it in Supabase Edge Function Secrets.');
  }

  // Transform messages format for Gemini
  const systemMessage = request.messages.find((m: any) => m.role === 'system');
  const contents = request.messages
    .filter((m: any) => m.role !== 'system')
    .map((m: any) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

  console.log(`[Google Gemini] Calling with model: ${request.model}`);

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${request.model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents,
        systemInstruction: systemMessage ? { parts: [{ text: systemMessage.content }] } : undefined,
        generationConfig: {
          maxOutputTokens: request.maxTokens || 1000,
          temperature: request.temperature || 0.7,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Gemini API error: ${errorText}`);
  }

  const data = await response.json();
  
  return {
    content: data.candidates[0].content.parts[0].text,
    usage: {
      promptTokens: data.usageMetadata?.promptTokenCount || 0,
      completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
      totalTokens: data.usageMetadata?.totalTokenCount || 0,
    }
  };
}

// Main router function
export async function callAIProvider(request: AIRequest): Promise<AIResponse> {
  const provider = request.provider.toLowerCase();

  console.log(`[AI Provider Router] Provider: ${provider}, Model: ${request.model}`);

  switch (provider) {
    case 'openai':
      return await callOpenAI(request);
    
    case 'anthropic':
      return await callAnthropic(request);
    
    case 'google':
      return await callGoogleGemini(request);
    
    case 'perplexity':
      throw new Error('Perplexity provider not yet implemented. Coming soon!');
    
    case 'grok':
      throw new Error('Grok provider not yet implemented. Coming soon!');
    
    default:
      throw new Error(`Unknown AI provider: ${provider}. Supported providers: openai, anthropic, google`);
  }
}

// Check if provider is available (has API key configured)
export function isProviderAvailable(provider: string): boolean {
  const providerLower = provider.toLowerCase();
  
  switch (providerLower) {
    case 'openai':
      return !!Deno.env.get('OPENAI_API_KEY');
    case 'anthropic':
      return !!Deno.env.get('ANTHROPIC_API_KEY');
    case 'google':
      return !!Deno.env.get('GOOGLE_AI_API_KEY');
    case 'perplexity':
      return !!Deno.env.get('PERPLEXITY_API_KEY');
    case 'grok':
      return !!Deno.env.get('GROK_API_KEY');
    default:
      return false;
  }
}

// Get list of available providers
export function getAvailableProviders(): string[] {
  const providers = ['openai', 'anthropic', 'google', 'perplexity', 'grok'];
  return providers.filter(p => isProviderAvailable(p));
}