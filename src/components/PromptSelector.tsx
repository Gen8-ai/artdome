
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AIPrompt } from '@/types/ai';

interface PromptSelectorProps {
  prompts: AIPrompt[];
  selectedPromptId?: string;
  onPromptChange: (promptId: string) => void;
  disabled?: boolean;
}

const PromptSelector: React.FC<PromptSelectorProps> = ({
  prompts,
  selectedPromptId,
  onPromptChange,
  disabled = false,
}) => {
  const groupedPrompts = prompts?.reduce((acc, prompt) => {
    const category = prompt.category || 'general';
    if (!acc[category]) acc[category] = [];
    acc[category].push(prompt);
    return acc;
  }, {} as Record<string, AIPrompt[]>) || {};

  return (
    <div className="flex flex-col space-y-2">
      <label className="text-sm font-medium">System Prompt</label>
      <Select
        value={selectedPromptId}
        onValueChange={onPromptChange}
        disabled={disabled}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select a prompt template" />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(groupedPrompts).map(([category, categoryPrompts]) => (
            <div key={category}>
              <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase">
                {category}
              </div>
              {categoryPrompts.map((prompt) => (
                <SelectItem key={prompt.id} value={prompt.id}>
                  <div className="flex flex-col">
                    <span className="font-medium">{prompt.name}</span>
                    {prompt.description && (
                      <span className="text-xs text-muted-foreground">
                        {prompt.description}
                      </span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </div>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default PromptSelector;
