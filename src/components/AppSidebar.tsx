
import React from 'react';
import { Bot, Settings, User, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import PreferencesPanel from './PreferencesPanel';
import ConversationList from './ConversationList';

const AppSidebar = () => {
  const { user, signOut } = useAuth();
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

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b border-border">
        <div className="flex items-center space-x-2">
          <Bot className="w-6 h-6 text-primary" />
          <span className="font-semibold text-lg">AI Assistant</span>
        </div>
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

        <ConversationList />
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
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <Settings className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
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
                <span className="ml-2">AI Preferences</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                <span>App Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;
