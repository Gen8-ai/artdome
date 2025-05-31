
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
  
  // State management for AI settings - initialize selectedModelId as empty
  const [selectedModelId, setSelectedModelId] = useState<string>('');
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

  // Set default model when models are loaded
  useEffect(() => {
    if (models && models.length > 0 && !selectedModelId) {
      // Try to find gpt-4o first, fallback to first model
      const defaultModel = models.find(m => m.name === 'gpt-4o') || models[0];
      console.log('Setting default model:', defaultModel.name, 'with ID:', defaultModel.id);
      setSelectedModelId(defaultModel.id);
    }
  }, [models, selectedModelId]);

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

  // Load user preferences when component mounts and when selectedModelId changes
  useEffect(() => {
    const loadUserPreferences = async () => {
      if (!user || !selectedModelId) return;

      try {
        console.log('Loading parameters for user:', user.id, 'model:', selectedModelId);
        
        // Load saved AI parameters
        const { data: userParams, error } = await supabase
          .from('ai_parameters')
          .select('*')
          .eq('user_id', user.id)
          .eq('model_id', selectedModelId)
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
          console.error('Error loading user parameters:', error);
          return;
        }

        if (userParams) {
          console.log('Loaded user parameters:', userParams);
          setParameters({
            temperature: userParams.temperature ?? 0.7,
            max_tokens: userParams.max_tokens ?? 1000,
            top_p: userParams.top_p ?? 1,
            frequency_penalty: userParams.frequency_penalty ?? 0,
            presence_penalty: userParams.presence_penalty ?? 0,
          });
        } else {
          console.log('No saved parameters found, using defaults');
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
    if (!user || !selectedModelId) return;

    try {
      console.log('Saving parameters for model:', selectedModelId);
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

  // Update model selection handler to ensure we're using UUIDs
  const handleModelChange = (modelId: string) => {
    console.log('Changing model to:', modelId);
    setSelectedModelId(modelId);
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
          modelId: modelId || selectedModelId, // Use provided modelId or current selection
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
    setSelectedModelId: handleModelChange,
    setSelectedPromptId,
    setParameters: updateParameters,
  };
};
