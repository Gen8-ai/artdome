
export interface AIModel {
  id: string;
  name: string;
  display_name: string;
  provider: string;
  max_tokens: number;
  input_cost_per_token: number;
  output_cost_per_token: number;
  supports_streaming: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChatConversation {
  id: string;
  user_id: string;
  title: string | null;
  model_id: string | null;
  total_tokens: number | null;
  total_cost: number | null;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  tokens_used: number | null;
  cost: number | null;
  model_used: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

export interface AIPrompt {
  id: string;
  user_id: string | null;
  name: string;
  description: string | null;
  content: string;
  category: string;
  is_system: boolean;
  is_public: boolean;
  variables: string[];
  created_at: string;
  updated_at: string;
}

export interface AIParameters {
  id: string;
  user_id: string;
  model_id: string;
  temperature: number | null;
  max_tokens: number | null;
  top_p: number | null;
  frequency_penalty: number | null;
  presence_penalty: number | null;
  created_at: string;
  updated_at: string;
}

export interface UsageAnalytics {
  id: string;
  user_id: string;
  model_name: string;
  tokens_used: number;
  cost: number;
  request_type: string;
  date: string;
  created_at: string;
}
