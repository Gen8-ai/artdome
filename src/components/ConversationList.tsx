
import React from 'react';
import { Plus, MessageSquare, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuAction,
} from '@/components/ui/sidebar';
import { useConversations } from '@/hooks/useConversations';

const ConversationList = () => {
  const { conversations, isLoading, createConversation, deleteConversation } = useConversations();

  const handleCreateConversation = () => {
    createConversation.mutate('New Chat');
  };

  const handleDeleteConversation = (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteConversation.mutate(conversationId);
  };

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="flex items-center justify-between">
        <span>Conversations</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCreateConversation}
          disabled={createConversation.isPending}
          className="h-6 w-6 p-0"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {isLoading ? (
            <SidebarMenuItem>
              <SidebarMenuButton disabled>
                <MessageSquare className="w-4 h-4" />
                <span>Loading...</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ) : conversations.length === 0 ? (
            <SidebarMenuItem>
              <SidebarMenuButton disabled>
                <MessageSquare className="w-4 h-4" />
                <span>No conversations</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ) : (
            conversations.map((conversation) => (
              <SidebarMenuItem key={conversation.id}>
                <SidebarMenuButton className="group">
                  <MessageSquare className="w-4 h-4" />
                  <span className="truncate">
                    {conversation.title || 'Untitled Chat'}
                  </span>
                </SidebarMenuButton>
                <SidebarMenuAction
                  onClick={(e) => handleDeleteConversation(conversation.id, e)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-4 h-4" />
                </SidebarMenuAction>
              </SidebarMenuItem>
            ))
          )}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
};

export default ConversationList;
