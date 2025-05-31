
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Bot, Brain } from 'lucide-react';
import { AIModel, AIPrompt } from '@/types/ai';

interface InputControlsProps {
  models: AIModel[];
  prompts: AIPrompt[];
  selectedModelId?: string;
  selectedPromptId?: string;
  onModelChange: (modelId: string) => void;
  onPromptChange: (promptId: string) => void;
  disabled?: boolean;
}

const InputControls: React.FC<InputControlsProps> = ({
  models,
  prompts,
  selectedModelId,
  selectedPromptId,
  onModelChange,
  onPromptChange,
  disabled = false,
}) => {
  const selectedModel = models?.find(m => m.id === selectedModelId);
  const selectedPrompt = prompts?.find(p => p.id === selectedPromptId);

  return (
    <div className="flex items-center space-x-2 mb-2">
      <div className="flex items-center space-x-1">
        <Bot className="w-4 h-4 text-muted-foreground" />
        <Select
          value={selectedModelId}
          onValueChange={onModelChange}
          disabled={disabled}
        >
          <SelectTrigger className="h-8 min-w-[120px] text-xs">
            <SelectValue placeholder="Model" />
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
      </div>

      <div className="flex items-center space-x-1">
        <Brain className="w-4 h-4 text-muted-foreground" />
        <Select
          value={selectedPromptId}
          onValueChange={onPromptChange}
          disabled={disabled}
        >
          <SelectTrigger className="h-8 min-w-[120px] text-xs">
            <SelectValue placeholder="Prompt" />
          </SelectTrigger>
          <SelectContent>
            {prompts?.map((prompt) => (
              <SelectItem key={prompt.id} value={prompt.id}>
                <div className="flex flex-col">
                  <span className="font-medium text-xs">{prompt.name}</span>
                  {prompt.description && (
                    <span className="text-xs text-muted-foreground">
                      {prompt.description.slice(0, 30)}...
                    </span>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default InputControls;
