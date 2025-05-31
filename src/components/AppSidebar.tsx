
import React from 'react';
import { Bot, Settings, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { useAI } from '@/hooks/useAI';
import ModelSelector from './ModelSelector';
import PreferencesPanel from './PreferencesPanel';

const AppSidebar = () => {
  const { user } = useAuth();
  const {
    models,
    prompts,
    modelsLoading,
    promptsLoading,
    selectedModelId,
    selectedPromptId,
    parameters,
    setSelectedModelId,
    setSelectedPromptId,
    setParameters,
  } = useAI();

  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Bot className="w-6 h-6 text-primary" />
            <span className="font-semibold text-lg">AI Assistant</span>
          </div>
          <PreferencesPanel
            models={models || []}
            prompts={prompts || []}
            selectedModelId={selectedModelId}
            selectedPromptId={selectedPromptId}
            parameters={parameters}
            onModelChange={setSelectedModelId}
            onPromptChange={setSelectedPromptId}
            onParametersChange={setParameters}
            disabled={modelsLoading || promptsLoading}
          />
        </div>
        
        <ModelSelector
          models={models || []}
          selectedModelId={selectedModelId}
          onModelChange={setSelectedModelId}
          disabled={modelsLoading}
        />
      </SidebarHeader>
      
      <SidebarContent className="p-4">
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Navigation</h3>
          
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton>
                <Bot className="w-4 h-4" />
                <span>Chat</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-border">
        <div className="flex items-center space-x-3">
          <Avatar className="w-8 h-8">
            <AvatarImage src={user?.user_metadata?.avatar_url} />
            <AvatarFallback>
              <User className="w-4 h-4" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {user?.user_metadata?.full_name || user?.email || 'User'}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {user?.email}
            </p>
          </div>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;
