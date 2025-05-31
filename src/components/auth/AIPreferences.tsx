import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAI } from '@/hooks/useAI';
import ModelSelector from '../ModelSelector';
import PromptSelector from '../PromptSelector';
import { Slider } from '@/components/ui/slider';
import { Loader2 } from 'lucide-react';
const AIPreferences: React.FC = () => {
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
    setParameters
  } = useAI();
  const updateParameter = (key: keyof typeof parameters, value: number) => {
    setParameters({
      ...parameters,
      [key]: value
    });
  };
  if (modelsLoading || promptsLoading) {
    return <Card className="w-full max-w-2xl bg-card border-border">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">Loading AI preferences...</span>
        </CardContent>
      </Card>;
  }
  return <Card className="w-full max-w-2xl bg-card border-border">
      <CardHeader>
        <CardTitle className="text-foreground">AI Preferences</CardTitle>
        <CardDescription className="text-muted-foreground">
          Configure your AI model and parameters for optimal performance
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              AI Model
            </label>
            <ModelSelector models={models || []} selectedModelId={selectedModelId} onModelChange={setSelectedModelId} disabled={false} />
          </div>
          
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Prompt Template
            </label>
            <PromptSelector prompts={prompts || []} selectedPromptId={selectedPromptId} onPromptChange={setSelectedPromptId} disabled={false} />
          </div>
        </div>

        <div className="space-y-4 my-0 mr-[4rem]">
          <h3 className="text-lg font-medium text-foreground">Parameters</h3>
          
          <div className="space-y-4">
            <div className="p-3">
              <label className="text-sm font-medium text-foreground mb-2 block">
                Temperature: {parameters.temperature}
              </label>
              <Slider value={[parameters.temperature]} onValueChange={([value]) => updateParameter('temperature', value)} max={2} min={0} step={0.1} className="w-full" />
              <p className="text-xs text-muted-foreground mt-1">
                Controls randomness. Lower = more focused, higher = more creative
              </p>
            </div>
            
            <div className="p-3">
              <label className="text-sm font-medium text-foreground mb-2 block">
                Max Tokens: {parameters.max_tokens}
              </label>
              <Slider value={[parameters.max_tokens]} onValueChange={([value]) => updateParameter('max_tokens', value)} max={4000} min={50} step={50} className="w-full" />
              <p className="text-xs text-muted-foreground mt-1">
                Maximum length of the response
              </p>
            </div>
            
            <div className="p-3">
              <label className="text-sm font-medium text-foreground mb-2 block">
                Top P: {parameters.top_p}
              </label>
              <Slider value={[parameters.top_p]} onValueChange={([value]) => updateParameter('top_p', value)} max={1} min={0} step={0.1} className="w-full" />
              <p className="text-xs text-muted-foreground mt-1">
                Controls diversity via nucleus sampling
              </p>
            </div>
            
            <div className="p-3">
              <label className="text-sm font-medium text-foreground mb-2 block">
                Frequency Penalty: {parameters.frequency_penalty}
              </label>
              <Slider value={[parameters.frequency_penalty]} onValueChange={([value]) => updateParameter('frequency_penalty', value)} max={2} min={-2} step={0.1} className="w-full" />
              <p className="text-xs text-muted-foreground mt-1">
                Reduces repetition of frequent tokens
              </p>
            </div>
            
            <div className="p-3">
              <label className="text-sm font-medium text-foreground mb-2 block">
                Presence Penalty: {parameters.presence_penalty}
              </label>
              <Slider value={[parameters.presence_penalty]} onValueChange={([value]) => updateParameter('presence_penalty', value)} max={2} min={-2} step={0.1} className="w-full" />
              <p className="text-xs text-muted-foreground mt-1">
                Encourages talking about new topics
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>;
};
export default AIPreferences;