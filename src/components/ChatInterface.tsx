
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
    <div className="h-full flex flex-col lg:flex-row">
      {/* Main Chat Area */}
      <div className={`flex flex-col ${selectedArtifact ? 'lg:w-1/2' : 'w-full'} transition-all duration-300`}>
        {/* Chat Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/50 bg-background/80 backdrop-blur-sm">
          <div className="flex items-center space-x-3">
            <h1 className="text-lg lg:text-xl font-semibold text-foreground">AI Assistant</h1>
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

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-muted-foreground max-w-md">
                <h2 className="text-xl lg:text-2xl font-semibold mb-2 text-foreground">
                  Welcome to AI Assistant
                </h2>
                <p className="text-sm lg:text-base">
                  Start a conversation by typing a message below.
                </p>
                {modelsLoading && (
                  <p className="mt-2 text-sm">Loading AI models...</p>
                )}
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                onArtifactClick={() => message.artifact && handleArtifactClick(message.artifact)}
              />
            ))
          )}
          {isLoading && (
            <div className="flex justify-start mb-4">
              <div className="bg-muted/50 border border-border rounded-2xl p-4 max-w-[80%]">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{animationDelay: '0.1s'}}></div>
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-border/50 bg-background/80 backdrop-blur-sm">
          <InputControls
            models={models || []}
            prompts={prompts || []}
            selectedModelId={selectedModelId}
            selectedPromptId={selectedPromptId}
            onModelChange={setSelectedModelId}
            onPromptChange={setSelectedPromptId}
            disabled={isLoading || modelsLoading || promptsLoading}
          />
          <div className="flex items-end space-x-2">
            <div className="flex-1 relative">
              <Textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message here..."
                className="min-h-[50px] lg:min-h-[60px] max-h-32 resize-none pr-20"
                disabled={isLoading || modelsLoading || promptsLoading}
              />
              <div className="absolute right-2 bottom-2 flex space-x-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  disabled={isLoading}
                >
                  <Paperclip className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <Button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading || modelsLoading || promptsLoading || !selectedModelId}
              className="h-[50px] lg:h-[60px] px-4 lg:px-6"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Artifact Preview */}
      {selectedArtifact && (
        <ArtifactPreview
          artifact={selectedArtifact}
          onClose={closeArtifact}
        />
      )}
    </div>
  );
};

export default ChatInterface;
