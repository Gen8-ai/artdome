import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AIModel, AIPrompt } from '@/types/ai';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface AIParameters {
  temperature: number;
  max_tokens: number;
  top_p: number;
  frequency_penalty: number;
  presence_penalty: number;
}

export const useAI = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // State management for AI settings
  const [selectedModelId, setSelectedModelId] = useState<string>('gpt-4o');
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

  // Fetch available prompts with proper authentication
  const { data: prompts, isLoading: promptsLoading } = useQuery({
    queryKey: ['ai-prompts', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('ai-prompts');
      if (error) throw error;
      return data.prompts as AIPrompt[];
    },
    enabled: !!user,
  });

  // Load user preferences when component mounts
  useEffect(() => {
    const loadUserPreferences = async () => {
      if (!user) return;

      try {
        // Load saved AI parameters
        const { data: userParams } = await supabase
          .from('ai_parameters')
          .select('*')
          .eq('user_id', user.id)
          .eq('model_id', selectedModelId)
          .single();

        if (userParams) {
          setParameters({
            temperature: userParams.temperature ?? 0.7,
            max_tokens: userParams.max_tokens ?? 1000,
            top_p: userParams.top_p ?? 1,
            frequency_penalty: userParams.frequency_penalty ?? 0,
            presence_penalty: userParams.presence_penalty ?? 0,
          });
        }

        // Load last used prompt from user preferences
        const { data: userPrefs } = await supabase
          .from('user_preferences')
          .select('*')
          .eq('user_id', user.id)
          .single();

        // We could add a last_used_prompt_id field to user_preferences in the future
        // For now, we'll keep the default empty selection
      } catch (error) {
        console.error('Error loading user preferences:', error);
      }
    };

    loadUserPreferences();
  }, [user, selectedModelId]);

  // Save parameters when they change
  const saveParameters = async (newParams: AIParameters) => {
    if (!user) return;

    try {
      await supabase
        .from('ai_parameters')
        .upsert({
          user_id: user.id,
          model_id: selectedModelId,
          ...newParams,
          updated_at: new Date().toISOString(),
        });
    } catch (error) {
      console.error('Error saving parameters:', error);
    }
  };

  // Update parameters and save them
  const updateParameters = (newParams: AIParameters) => {
    setParameters(newParams);
    saveParameters(newParams);
  };

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
    setParameters: updateParameters,
  };
};
