
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

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

export const useMessages = (conversationId?: string) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch messages for a conversation
  const { data: messages, isLoading } = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: async () => {
      if (!conversationId) return [];
      
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as ChatMessage[];
    },
    enabled: !!conversationId && !!user,
  });

  // Add message to conversation
  const addMessage = useMutation({
    mutationFn: async (message: {
      conversation_id: string;
      role: 'user' | 'assistant' | 'system';
      content: string;
      model_used?: string;
      tokens_used?: number;
      cost?: number;
      metadata?: Record<string, any>;
    }) => {
      const { data, error } = await supabase
        .from('chat_messages')
        .insert(message)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to save message',
        variant: 'destructive',
      });
    },
  });

  return {
    messages: messages || [],
    isLoading,
    addMessage,
  };
};
