
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AIModel, AIPrompt } from '@/types/ai';
import { useToast } from '@/hooks/use-toast';

export const useAI = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
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
  };
};
