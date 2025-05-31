
import React from 'react';
import { Bot, Code2, BookOpen, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useAI } from '@/hooks/useAI';
import ModelSelector from './ModelSelector';
import PreferencesPanel from './PreferencesPanel';

const AppSidebar = () => {
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

  const promptButtons = [
    {
      id: 'code',
      label: 'Code Prompt',
      icon: Code2,
      category: 'interact'
    },
    {
      id: 'creative',
      label: 'Creative Writing',
      icon: BookOpen,
      category: 'story'
    },
    {
      id: 'research',
      label: 'Research',
      icon: Search,
      category: 'search'
    }
  ];

  const handlePromptSelect = (category: string) => {
    const prompt = prompts?.find(p => p.category === category);
    if (prompt) {
      setSelectedPromptId(prompt.id);
    }
  };

  const handleGeneralPrompt = () => {
    setSelectedPromptId('');
  };

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
          <h3 className="text-sm font-medium text-muted-foreground mb-2">System Prompts</h3>
          
          <Button
            variant={!selectedPromptId ? "default" : "outline"}
            onClick={handleGeneralPrompt}
            className="w-full justify-start h-auto p-3"
          >
            <Bot className="w-4 h-4 mr-2" />
            <span>General</span>
          </Button>
          
          {promptButtons.map((button) => {
            const isSelected = prompts?.find(p => p.category === button.category)?.id === selectedPromptId;
            const IconComponent = button.icon;
            
            return (
              <Button
                key={button.id}
                variant={isSelected ? "default" : "outline"}
                onClick={() => handlePromptSelect(button.category)}
                className="w-full justify-start h-auto p-3"
                disabled={promptsLoading}
              >
                <IconComponent className="w-4 h-4 mr-2" />
                <span>{button.label}</span>
              </Button>
            );
          })}
        </div>
      </SidebarContent>
    </Sidebar>
  );
};

export default AppSidebar;
