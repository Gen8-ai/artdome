
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Trash2 } from 'lucide-react';

const DataManagement = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [clearingChats, setClearingChats] = useState(false);

  const clearChatHistory = async () => {
    if (!user) return;
    
    setClearingChats(true);
    try {
      // Get all conversation IDs for the user
      const { data: conversations, error: conversationsError } = await supabase
        .from('chat_conversations')
        .select('id')
        .eq('user_id', user.id);

      if (conversationsError) throw conversationsError;

      if (conversations && conversations.length > 0) {
        // Delete all messages for these conversations
        const { error: messagesError } = await supabase
          .from('chat_messages')
          .delete()
          .in('conversation_id', conversations.map(conv => conv.id));

        if (messagesError) throw messagesError;

        // Delete all conversations
        const { error: deleteConversationsError } = await supabase
          .from('chat_conversations')
          .delete()
          .eq('user_id', user.id);

        if (deleteConversationsError) throw deleteConversationsError;
      }

      toast({
        title: 'Success',
        description: 'Chat history cleared successfully',
      });
    } catch (error) {
      console.error('Error clearing chat history:', error);
      toast({
        title: 'Error',
        description: 'Failed to clear chat history',
        variant: 'destructive',
      });
    } finally {
      setClearingChats(false);
    }
  };

  return (
    <div className="space-y-4 pt-4 border-t border-border">
      <div className="space-y-2">
        <h3 className="text-lg font-medium text-foreground">Data Management</h3>
        <p className="text-sm text-muted-foreground">Manage your conversation history</p>
      </div>
      
      <Button
        variant="destructive"
        onClick={clearChatHistory}
        disabled={clearingChats}
        className="w-full"
      >
        <Trash2 className="h-4 w-4 mr-2" />
        {clearingChats ? 'Clearing...' : 'Clear All Chat History'}
      </Button>
    </div>
  );
};

export default DataManagement;
