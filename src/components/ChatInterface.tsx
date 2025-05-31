
import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import ChatMessage from './ChatMessage';
import ArtifactPreview from './ArtifactPreview';
import AISettings from './AISettings';
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

interface ChatInterfaceProps {
  onShowSettings?: () => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ onShowSettings }) => {
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
      // Error handling is done in the useAI hook
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
    <div className="h-screen flex">
      <div className={`flex flex-col ${selectedArtifact ? 'lg:w-1/2' : 'w-full'} transition-all duration-300`}>
        <header className="bg-white/10 backdrop-blur-xl border-b border-white/20 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-white">AI Chat Assistant</h1>
              <div className="flex items-center space-x-2 text-white/60 text-sm">
                <User className="w-4 h-4" />
                <span>{user?.email}</span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <AISettings
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
              {onShowSettings && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onShowSettings}
                  className="text-white hover:bg-white/10"
                >
                  <User className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-white/60 mt-12">
              <h2 className="text-xl mb-2">Welcome to AI Chat Assistant</h2>
              <p>Start a conversation with OpenAI by typing a message below.</p>
              {modelsLoading && <p className="mt-2">Loading AI models...</p>}
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
              <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-4 max-w-[80%]">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse delay-75"></div>
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse delay-150"></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-6 bg-white/5 backdrop-blur-xl border-t border-white/20">
          <div className="flex items-end space-x-2">
            <div className="flex-1 relative">
              <Textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message here..."
                className="min-h-[60px] max-h-32 resize-none bg-white/10 border-white/20 text-white placeholder:text-white/50 pr-20"
                disabled={isLoading || modelsLoading || promptsLoading}
              />
              <div className="absolute right-2 bottom-2 flex space-x-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white/60 hover:text-white hover:bg-white/10"
                  disabled={isLoading}
                >
                  <Paperclip className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <Button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading || modelsLoading || promptsLoading || !selectedModelId}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white h-[60px] px-6"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

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
