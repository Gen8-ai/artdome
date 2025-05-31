
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
  disabled = false
}) => {
  // Set default model if none selected and models are available
  React.useEffect(() => {
    if (!selectedModelId && models.length > 0) {
      const defaultModel = models.find(m => m.id === 'gpt-4o') || models[0];
      onModelChange(defaultModel.id);
    }
  }, [models, selectedModelId, onModelChange]);

  return (
    <div className="flex align-center justify-center item-center py-0 my-0 mx-0 px-0 max-h-[20px]">
      <Select value={selectedModelId} onValueChange={onModelChange} disabled={disabled}>
        <SelectTrigger className="border-none outline-none shadow-none bg-transparent hover:bg-muted/50 focus:ring-0 focus:ring-offset-0">
          <SelectValue placeholder="Select a model" />
        </SelectTrigger>
        <SelectContent>
          {models?.map(model => (
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
