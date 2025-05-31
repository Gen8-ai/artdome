
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';

interface OnboardingModalProps {
  isOpen: boolean;
  onComplete: (preferences: any) => void;
}

const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onComplete }) => {
  const [preferences, setPreferences] = useState({
    preferredModel: 'gpt-4o',
    apiKeys: {
      openai: '',
      anthropic: '',
      google: ''
    },
    defaultMode: 'canvas'
  });

  const handleModelSelection = (modelId: string) => {
    const updatedPreferences = {
      ...preferences,
      preferredModel: modelId
    };
    
    // Store preferences in localStorage
    localStorage.setItem('ai_api_keys', JSON.stringify(updatedPreferences.apiKeys));
    localStorage.setItem('ai_preferred_model', updatedPreferences.preferredModel);
    localStorage.setItem('ai_default_mode', updatedPreferences.defaultMode);
    
    onComplete(updatedPreferences);
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-[600px] bg-gradient-to-br from-background to-muted backdrop-blur-xl border border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2 text-2xl">
            <Sparkles className="w-6 h-6 text-primary" />
            <span>Welcome to AI Canvas</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="text-center">
            <h3 className="text-xl font-bold mb-2">Choose Your AI Model</h3>
            <p className="text-muted-foreground">Select your preferred AI model to get started</p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {[
              { id: 'gpt-4o', name: 'GPT-4O', description: 'Most capable OpenAI model', provider: 'OpenAI' },
              { id: 'gpt-4o-mini', name: 'GPT-4O Mini', description: 'Fast and efficient', provider: 'OpenAI' },
              { id: 'claude-3', name: 'Claude 3', description: 'Anthropic\'s powerful model', provider: 'Anthropic' },
              { id: 'gemini-pro', name: 'Gemini Pro', description: 'Google\'s advanced AI', provider: 'Google' }
            ].map((model) => (
              <Card
                key={model.id}
                className="cursor-pointer transition-all duration-200 hover:bg-accent hover:border-primary"
                onClick={() => handleModelSelection(model.id)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{model.name}</CardTitle>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                      {model.provider}
                    </span>
                  </div>
                  <CardDescription>{model.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OnboardingModal;
