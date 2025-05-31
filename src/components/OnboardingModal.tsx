
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, Key, Brain, Zap } from 'lucide-react';

interface OnboardingModalProps {
  isOpen: boolean;
  onComplete: (preferences: any) => void;
}

const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onComplete }) => {
  const [step, setStep] = useState(1);
  const [preferences, setPreferences] = useState({
    preferredModel: 'gpt-4o',
    apiKeys: {
      openai: '',
      anthropic: '',
      google: ''
    },
    defaultMode: 'canvas'
  });

  const handleApiKeyChange = (provider: string, value: string) => {
    setPreferences(prev => ({
      ...prev,
      apiKeys: {
        ...prev.apiKeys,
        [provider]: value
      }
    }));
  };

  const handleComplete = () => {
    // Store preferences in localStorage
    localStorage.setItem('ai_api_keys', JSON.stringify(preferences.apiKeys));
    localStorage.setItem('ai_preferred_model', preferences.preferredModel);
    localStorage.setItem('ai_default_mode', preferences.defaultMode);
    
    onComplete(preferences);
  };

  const nextStep = () => setStep(step + 1);
  const prevStep = () => setStep(step - 1);

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-[600px] bg-gradient-to-br from-purple-900/90 via-blue-900/90 to-indigo-900/90 backdrop-blur-xl border border-white/20 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2 text-2xl">
            <Sparkles className="w-6 h-6 text-purple-300" />
            <span>Welcome to AI Canvas</span>
          </DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                <Brain className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-2">Choose Your AI Model</h3>
              <p className="text-white/70">Select your preferred AI model for the best experience</p>
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
                  className={`cursor-pointer transition-all duration-200 ${
                    preferences.preferredModel === model.id
                      ? 'bg-gradient-to-r from-purple-500/30 to-pink-500/30 border-purple-400'
                      : 'bg-white/10 border-white/20 hover:bg-white/20'
                  }`}
                  onClick={() => setPreferences(prev => ({ ...prev, preferredModel: model.id }))}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-white text-lg">{model.name}</CardTitle>
                      <span className="text-xs text-white/60 bg-white/10 px-2 py-1 rounded">
                        {model.provider}
                      </span>
                    </div>
                    <CardDescription className="text-white/70">{model.description}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>

            <Button onClick={nextStep} className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
              Continue
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
                <Key className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-2">API Keys Setup</h3>
              <p className="text-white/70">Add your API keys to start using AI models</p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="openai-key" className="text-white">OpenAI API Key</Label>
                <Input
                  id="openai-key"
                  type="password"
                  placeholder="sk-..."
                  value={preferences.apiKeys.openai}
                  onChange={(e) => handleApiKeyChange('openai', e.target.value)}
                  className="bg-white/10 border-white/20 text-white placeholder-white/50"
                />
              </div>

              <div>
                <Label htmlFor="anthropic-key" className="text-white">Anthropic API Key (Optional)</Label>
                <Input
                  id="anthropic-key"
                  type="password"
                  placeholder="sk-ant-..."
                  value={preferences.apiKeys.anthropic}
                  onChange={(e) => handleApiKeyChange('anthropic', e.target.value)}
                  className="bg-white/10 border-white/20 text-white placeholder-white/50"
                />
              </div>

              <div>
                <Label htmlFor="google-key" className="text-white">Google API Key (Optional)</Label>
                <Input
                  id="google-key"
                  type="password"
                  placeholder="AIza..."
                  value={preferences.apiKeys.google}
                  onChange={(e) => handleApiKeyChange('google', e.target.value)}
                  className="bg-white/10 border-white/20 text-white placeholder-white/50"
                />
              </div>
            </div>

            <div className="flex space-x-2">
              <Button onClick={prevStep} variant="outline" className="flex-1 border-white/20 text-white hover:bg-white/10">
                Back
              </Button>
              <Button onClick={nextStep} className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
                Continue
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
                <Zap className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-2">Default Mode</h3>
              <p className="text-white/70">Choose your preferred AI interaction mode</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                { id: 'canvas', name: 'Canvas', description: 'Create visual content', icon: '🎨' },
                { id: 'research', name: 'Research', description: 'Deep analysis', icon: '🔍' },
                { id: 'web', name: 'Web', description: 'Web search', icon: '🌐' },
                { id: 'repositories', name: 'Repositories', description: 'Code search', icon: '📦' }
              ].map((mode) => (
                <Card
                  key={mode.id}
                  className={`cursor-pointer transition-all duration-200 ${
                    preferences.defaultMode === mode.id
                      ? 'bg-gradient-to-r from-purple-500/30 to-pink-500/30 border-purple-400'
                      : 'bg-white/10 border-white/20 hover:bg-white/20'
                  }`}
                  onClick={() => setPreferences(prev => ({ ...prev, defaultMode: mode.id }))}
                >
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl mb-2">{mode.icon}</div>
                    <h4 className="text-white font-semibold">{mode.name}</h4>
                    <p className="text-white/70 text-sm">{mode.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex space-x-2">
              <Button onClick={prevStep} variant="outline" className="flex-1 border-white/20 text-white hover:bg-white/10">
                Back
              </Button>
              <Button onClick={handleComplete} className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600">
                Get Started
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default OnboardingModal;
