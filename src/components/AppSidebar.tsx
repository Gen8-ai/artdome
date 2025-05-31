
import React, { useState } from 'react';
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
import ConversationList from './ConversationList';
import SettingsPage from './auth/SettingsPage';

const AppSidebar = () => {
  const { user, signOut } = useAuth();
  const [showSettings, setShowSettings] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState('profile');

  const handleSignOut = async () => {
    await signOut();
  };

  const handleProfileClick = () => {
    setActiveSettingsTab('profile');
    setShowSettings(true);
  };

  const handleAIPreferencesClick = () => {
    setActiveSettingsTab('ai-preferences');
    setShowSettings(true);
  };

  const handleAppSettingsClick = () => {
    setActiveSettingsTab('app-preferences');
    setShowSettings(true);
  };

  const handleBackToChat = () => {
    setShowSettings(false);
  };

  // Show settings page if settings is active
  if (showSettings) {
    return <SettingsPage onBack={handleBackToChat} />;
  }

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
              <DropdownMenuItem onClick={handleProfileClick}>
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleAIPreferencesClick}>
                <Bot className="mr-2 h-4 w-4" />
                <span>AI Preferences</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleAppSettingsClick}>
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
