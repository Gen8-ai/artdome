
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AIModel, AIPrompt } from '@/types/ai';
import { useToast } from '@/hooks/use-toast';

interface AIParameters {
  temperature: number;
  max_tokens: number;
  top_p: number;
  frequency_penalty: number;
  presence_penalty: number;
}

export const useAI = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State management for AI settings
  const [selectedModelId, setSelectedModelId] = useState<string>('gpt-4o-mini');
  const [selectedPromptId, setSelectedPromptId] = useState<string>('');
  const [parameters, setParameters] = useState<AIParameters>({
    temperature: 0.7,
    max_tokens: 1000,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
  });
  
  // Fetch available AI models
  const { data: models, isLoading: modelsLoading } = useQuery({
    queryKey: ['ai-models'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('ai-models');
      if (error) throw error;
      return data.models as AIModel[];
    },
  });

  // Fetch available prompts
  const { data: prompts, isLoading: promptsLoading } = useQuery({
    queryKey: ['ai-prompts'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('ai-prompts');
      if (error) throw error;
      return data.prompts as AIPrompt[];
    },
  });

  // Send chat message mutation
  const sendMessage = useMutation({
    mutationFn: async ({
      message,
      conversationId,
      modelId,
      systemPrompt,
      parameters,
    }: {
      message: string;
      conversationId?: string;
      modelId?: string;
      systemPrompt?: string;
      parameters?: any;
    }) => {
      const { data, error } = await supabase.functions.invoke('openai-chat', {
        body: {
          message,
          conversationId,
          modelId,
          systemPrompt,
          parameters,
        },
      });
      
      if (error) throw error;
      return data;
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
    },
  });

  return {
    models,
    prompts,
    modelsLoading,
    promptsLoading,
    sendMessage,
    isLoading: sendMessage.isPending,
    selectedModelId,
    selectedPromptId,
    parameters,
    setSelectedModelId,
    setSelectedPromptId,
    setParameters,
  };
};
