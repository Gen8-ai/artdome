
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AIModel } from '@/types/ai';

interface ModelSelectorProps {
  models: AIModel[];
  selectedModelId?: string;
  onModelChange: (modelId: string) => void;
  disabled?: boolean;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({
  models,
  selectedModelId,
  onModelChange,
  disabled = false,
}) => {
  return (
    <div className="flex flex-col space-y-2">
      <label className="text-sm font-medium text-white/80">AI Model</label>
      <Select
        value={selectedModelId}
        onValueChange={onModelChange}
        disabled={disabled}
      >
        <SelectTrigger className="bg-white/10 border-white/20 text-white">
          <SelectValue placeholder="Select a model" />
        </SelectTrigger>
        <SelectContent>
          {models?.map((model) => (
            <SelectItem key={model.id} value={model.id}>
              <div className="flex flex-col">
                <span className="font-medium">{model.display_name}</span>
                <span className="text-xs text-muted-foreground">
                  Max tokens: {model.max_tokens.toLocaleString()}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default ModelSelector;
