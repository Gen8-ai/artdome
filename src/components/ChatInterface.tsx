import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import ChatMessage from './ChatMessage';
import ArtifactPreview from './ArtifactPreview';
import PreferencesPanel from './PreferencesPanel';
import InputControls from './InputControls';
import { useAuth } from '@/contexts/AuthContext';
import { useAI } from '@/hooks/useAI';

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  artifact?: any;
  mode?: string;
  model?: string;
}

const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [selectedArtifact, setSelectedArtifact] = useState<any>(null);
  const [conversationId, setConversationId] = useState<string>();
  const [selectedModelId, setSelectedModelId] = useState<string>();
  const [selectedPromptId, setSelectedPromptId] = useState<string>();
  const [parameters, setParameters] = useState({
    temperature: 0.7,
    max_tokens: 1000,
    top_p: 1.0,
    frequency_penalty: 0.0,
    presence_penalty: 0.0,
  });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const { models, prompts, modelsLoading, promptsLoading, sendMessage, isLoading } = useAI();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Set default model when models load
  useEffect(() => {
    if (models && models.length > 0 && !selectedModelId) {
      setSelectedModelId(models[0].id);
    }
  }, [models, selectedModelId]);

  // Set default prompt when prompts load
  useEffect(() => {
    if (prompts && prompts.length > 0 && !selectedPromptId) {
      const defaultPrompt = prompts.find(p => p.name === 'Default Assistant');
      if (defaultPrompt) {
        setSelectedPromptId(defaultPrompt.id);
      }
    }
  }, [prompts, selectedPromptId]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      content: inputValue,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');

    try {
      const selectedPrompt = prompts?.find(p => p.id === selectedPromptId);
      const systemPrompt = selectedPrompt?.content;

      const result = await sendMessage.mutateAsync({
        message: inputValue,
        conversationId,
        modelId: selectedModelId,
        systemPrompt,
        parameters,
      });

      if (result.success) {
        // Update conversation ID if this is a new conversation
        if (!conversationId && result.conversationId) {
          setConversationId(result.conversationId);
        }

        const aiMessage: Message = {
          id: `ai-${Date.now()}`,
          content: result.message,
          isUser: false,
          timestamp: new Date(),
          mode: 'openai',
          model: selectedModelId,
        };

        setMessages(prev => [...prev, aiMessage]);

        // Show usage info
        if (result.usage) {
          toast({
            title: "Message sent",
            description: `Tokens used: ${result.usage.tokens}, Cost: $${result.usage.cost.toFixed(6)}`,
          });
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleArtifactClick = (artifact: any) => {
    setSelectedArtifact(artifact);
  };

  const closeArtifact = () => {
    setSelectedArtifact(null);
  };

  return (
    <div className="flex h-full bg-background">
      {/* Main Chat Container */}
      <div className={`flex flex-col transition-all duration-300 ease-in-out ${
        selectedArtifact ? 'w-1/2' : 'w-full'
      }`}>
        
        {/* Header */}
        <div className="flex-shrink-0 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <span className="text-primary font-semibold text-sm">AI</span>
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">AI Assistant</h1>
                <p className="text-sm text-muted-foreground">Powered by advanced AI models</p>
              </div>
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
              disabled={isLoading || modelsLoading || promptsLoading}
            />
          </div>
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6 scrollbar-thin">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="max-w-md text-center space-y-4">
                  <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-primary font-bold text-xl">AI</span>
                  </div>
                  <h2 className="text-2xl font-semibold text-foreground">
                    Welcome to AI Assistant
                  </h2>
                  <p className="text-muted-foreground">
                    Start a conversation by typing a message below. I'm here to help with any questions or tasks you have.
                  </p>
                  {modelsLoading && (
                    <div className="flex items-center justify-center space-x-2 mt-4">
                      <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                      <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                      <span className="text-sm text-muted-foreground ml-2">Loading AI models...</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <ChatMessage
                    key={message.id}
                    message={message}
                    onArtifactClick={() => message.artifact && handleArtifactClick(message.artifact)}
                  />
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="max-w-[80%] bg-muted/50 border border-border rounded-2xl p-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                        <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{animationDelay: '0.1s'}}></div>
                        <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                        <span className="text-sm text-muted-foreground ml-2">AI is thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Container */}
        <div className="flex-shrink-0 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="px-6 py-4 space-y-3">
            {/* Controls */}
            <InputControls
              models={models || []}
              prompts={prompts || []}
              selectedModelId={selectedModelId}
              selectedPromptId={selectedPromptId}
              onModelChange={setSelectedModelId}
              onPromptChange={setSelectedPromptId}
              disabled={isLoading || modelsLoading || promptsLoading}
            />
            
            {/* Input Area */}
            <div className="flex items-end space-x-3">
              <div className="flex-1 relative">
                <Textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message here... (Press Enter to send, Shift+Enter for new line)"
                  className="min-h-[56px] max-h-32 resize-none pr-12 bg-background border-border focus:border-primary transition-colors"
                  disabled={isLoading || modelsLoading || promptsLoading}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 bottom-2 h-8 w-8 p-0 hover:bg-muted"
                  disabled={isLoading}
                >
                  <Paperclip className="w-4 h-4" />
                </Button>
              </div>
              <Button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isLoading || modelsLoading || promptsLoading || !selectedModelId}
                className="h-14 px-6 bg-primary hover:bg-primary/90 transition-colors"
                size="lg"
              >
                <Send className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Artifact Preview */}
      {selectedArtifact && (
        <div className="w-1/2 border-l border-border">
          <ArtifactPreview
            artifact={selectedArtifact}
            onClose={closeArtifact}
          />
        </div>
      )}
    </div>
  );
};

export default ChatInterface;
