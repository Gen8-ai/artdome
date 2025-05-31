
import React, { useState } from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from '@/components/ui/sidebar';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useAI } from '@/hooks/useAI';
import PreferencesPanel from './PreferencesPanel';
import { 
  ChevronDown, 
  User, 
  LogOut, 
  Plus, 
  FileText, 
  Folder,
  Settings,
  Moon,
  Sun,
  Bot
} from 'lucide-react';

interface Project {
  id: string;
  name: string;
  chats: Chat[];
}

interface Chat {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: Date;
}

const AppSidebar = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [projects, setProjects] = useState<Project[]>([
    {
      id: '1',
      name: 'Default Project',
      chats: [
        {
          id: '1',
          title: 'Welcome Chat',
          lastMessage: 'Hello! How can I help you today?',
          timestamp: new Date(),
        },
      ],
    },
  ]);

  const {
    models,
    prompts,
    selectedModelId,
    selectedPromptId,
    parameters,
    setSelectedModelId,
    setSelectedPromptId,
    setParameters,
  } = useAI();

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to sign out',
        variant: 'destructive',
      });
    }
  };

  const createNewProject = () => {
    const newProject: Project = {
      id: Date.now().toString(),
      name: `Project ${projects.length + 1}`,
      chats: [],
    };
    setProjects([...projects, newProject]);
  };

  const createNewChat = (projectId: string) => {
    const newChat: Chat = {
      id: Date.now().toString(),
      title: 'New Chat',
      lastMessage: '',
      timestamp: new Date(),
    };
    
    setProjects(projects.map(project => 
      project.id === projectId 
        ? { ...project, chats: [...project.chats, newChat] }
        : project
    ));
  };

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  return (
    <Sidebar className="border-r border-border/50">
      <SidebarHeader className="p-4 border-b border-border/50">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">AI Assistant</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            className="h-8 w-8 p-0"
          >
            {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Bot className="w-4 h-4 text-muted-foreground" />
            <Select
              value={selectedModelId}
              onValueChange={setSelectedModelId}
            >
              <SelectTrigger className="h-8 text-xs flex-1">
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent>
                {models?.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    <div className="flex flex-col">
                      <span className="font-medium text-xs">{model.display_name}</span>
                      <span className="text-xs text-muted-foreground">
                        {model.max_tokens.toLocaleString()} tokens
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <PreferencesPanel
              models={models || []}
              prompts={prompts || []}
              selectedModelId={selectedModelId}
              selectedPromptId={selectedPromptId}
              parameters={parameters}
              onModelChange={setSelectedModelId}
              onPromptChange={setSelectedPromptId}
              onParametersChange={setParameters}
            />
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="flex-1 overflow-y-auto">
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center justify-between px-2 py-2">
            <span>Projects</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={createNewProject}
              className="h-6 w-6 p-0"
            >
              <Plus className="h-3 w-3" />
            </Button>
          </SidebarGroupLabel>
          
          <SidebarGroupContent>
            <Accordion type="multiple" className="w-full">
              {projects.map((project) => (
                <AccordionItem key={project.id} value={project.id} className="border-none">
                  <AccordionTrigger className="hover:no-underline px-2 py-2 hover:bg-accent/50 rounded-md">
                    <div className="flex items-center space-x-2">
                      <Folder className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium truncate">{project.name}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-0">
                    <div className="pl-6 space-y-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => createNewChat(project.id)}
                        className="w-full justify-start text-xs h-7 px-2"
                      >
                        <Plus className="h-3 w-3 mr-2" />
                        New Chat
                      </Button>
                      {project.chats.map((chat) => (
                        <Button
                          key={chat.id}
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-xs h-7 px-2 hover:bg-accent/50"
                        >
                          <FileText className="h-3 w-3 mr-2 text-muted-foreground" />
                          <span className="truncate">{chat.title}</span>
                        </Button>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-border/50">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full justify-start p-2 h-auto">
              <Avatar className="h-8 w-8 mr-3">
                <AvatarImage src={user?.user_metadata?.avatar_url} />
                <AvatarFallback className="text-xs">
                  {user?.email?.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-medium truncate">
                  {user?.user_metadata?.full_name || user?.email}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user?.email}
                </p>
              </div>
              <ChevronDown className="h-4 w-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem>
              <User className="h-4 w-4 mr-2" />
              Profile Settings
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="h-4 w-4 mr-2" />
              Preferences
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;
