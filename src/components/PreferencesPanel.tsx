
import React from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Settings } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import ModelSelector from './ModelSelector';
import { AIModel, AIPrompt } from '@/types/ai';

interface AIParameters {
  temperature: number;
  max_tokens: number;
  top_p: number;
  frequency_penalty: number;
  presence_penalty: number;
}

interface PreferencesPanelProps {
  models: AIModel[];
  prompts: AIPrompt[];
  selectedModelId?: string;
  selectedPromptId?: string;
  parameters: AIParameters;
  onModelChange: (modelId: string) => void;
  onPromptChange: (promptId: string) => void;
  onParametersChange: (parameters: AIParameters) => void;
  disabled?: boolean;
}

const PreferencesPanel: React.FC<PreferencesPanelProps> = ({
  models,
  prompts,
  selectedModelId,
  selectedPromptId,
  parameters,
  onModelChange,
  onPromptChange,
  onParametersChange,
  disabled = false,
}) => {
  const updateParameter = (key: keyof AIParameters, value: number) => {
    onParametersChange({
      ...parameters,
      [key]: value,
    });
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          disabled={disabled}
        >
          <Settings className="w-4 h-4" />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>AI Preferences</SheetTitle>
          <SheetDescription>
            Configure your AI model and parameters
          </SheetDescription>
        </SheetHeader>
        
        <div className="space-y-6 mt-6">
          <ModelSelector
            models={models || []}
            selectedModelId={selectedModelId}
            onModelChange={onModelChange}
            disabled={disabled}
          />
          
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Parameters</h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Temperature: {parameters.temperature}
                </label>
                <Slider
                  value={[parameters.temperature]}
                  onValueChange={([value]) => updateParameter('temperature', value)}
                  max={2}
                  min={0}
                  step={0.1}
                  className="w-full"
                  disabled={disabled}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Controls randomness. Lower = more focused, higher = more creative
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Max Tokens: {parameters.max_tokens}
                </label>
                <Slider
                  value={[parameters.max_tokens]}
                  onValueChange={([value]) => updateParameter('max_tokens', value)}
                  max={4000}
                  min={50}
                  step={50}
                  className="w-full"
                  disabled={disabled}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Maximum length of the response
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Top P: {parameters.top_p}
                </label>
                <Slider
                  value={[parameters.top_p]}
                  onValueChange={([value]) => updateParameter('top_p', value)}
                  max={1}
                  min={0}
                  step={0.1}
                  className="w-full"
                  disabled={disabled}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Controls diversity via nucleus sampling
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Frequency Penalty: {parameters.frequency_penalty}
                </label>
                <Slider
                  value={[parameters.frequency_penalty]}
                  onValueChange={([value]) => updateParameter('frequency_penalty', value)}
                  max={2}
                  min={-2}
                  step={0.1}
                  className="w-full"
                  disabled={disabled}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Reduces repetition of frequent tokens
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Presence Penalty: {parameters.presence_penalty}
                </label>
                <Slider
                  value={[parameters.presence_penalty]}
                  onValueChange={([value]) => updateParameter('presence_penalty', value)}
                  max={2}
                  min={-2}
                  step={0.1}
                  className="w-full"
                  disabled={disabled}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Encourages talking about new topics
                </p>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default PreferencesPanel;
