
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Sparkles, MessageSquare, Bot, Code2, BookOpen, Search } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAI } from '@/hooks/useAI';
import ChatMessage from './ChatMessage';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const ChatInterface = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { 
    prompts,
    promptsLoading,
    selectedModelId, 
    selectedPromptId, 
    parameters,
    setSelectedPromptId
  } = useAI();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const promptButtons = [
    {
      id: 'code',
      label: 'Code Prompt',
      icon: Code2,
      category: 'interact'
    },
    {
      id: 'creative',
      label: 'Creative Writing',
      icon: BookOpen,
      category: 'story'
    },
    {
      id: 'research',
      label: 'Research',
      icon: Search,
      category: 'search'
    }
  ];

  const handlePromptSelect = (category: string) => {
    const prompt = prompts?.find(p => p.category === category);
    if (prompt) {
      setSelectedPromptId(prompt.id);
    }
  };

  const handleGeneralPrompt = () => {
    setSelectedPromptId('');
  };

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('openai-chat', {
        body: {
          messages: [...messages, userMessage].map(msg => ({
            role: msg.role,
            content: msg.content,
          })),
          model: selectedModelId || 'gpt-4o-mini',
          ...parameters,
        },
      });

      if (error) throw error;

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.choices[0].message.content,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* System Prompt Buttons */}
      <div className="border-b border-border/50 bg-background/80 backdrop-blur-sm p-4">
        <div className="max-w-4xl mx-auto">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">System Prompts</h3>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={!selectedPromptId ? "default" : "outline"}
              onClick={handleGeneralPrompt}
              className="h-auto p-3 flex-shrink-0"
            >
              <Bot className="w-4 h-4 mr-2" />
              <span>General</span>
            </Button>
            
            {promptButtons.map((button) => {
              const isSelected = prompts?.find(p => p.category === button.category)?.id === selectedPromptId;
              const IconComponent = button.icon;
              
              return (
                <Button
                  key={button.id}
                  variant={isSelected ? "default" : "outline"}
                  onClick={() => handlePromptSelect(button.category)}
                  className="h-auto p-3 flex-shrink-0"
                  disabled={promptsLoading}
                >
                  <IconComponent className="w-4 h-4 mr-2" />
                  <span>{button.label}</span>
                </Button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-semibold mb-2">Welcome to AI Assistant</h2>
              <p className="text-muted-foreground max-w-md">
                Start a conversation by typing a message below. I'm here to help with any questions or tasks you might have.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}
              {isLoading && (
                <div className="flex items-center space-x-2 text-muted-foreground">
                  <div className="w-2 h-2 bg-current rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-2 h-2 bg-current rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-2 h-2 bg-current rounded-full animate-bounce"></div>
                  <span className="text-sm">AI is thinking...</span>
                </div>
              )}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto p-4">
          <div className="relative">
            <Textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Type your message here..."
              className="min-h-[60px] max-h-[200px] resize-none pr-12 border-border/50"
              disabled={isLoading}
            />
            <Button
              onClick={sendMessage}
              disabled={!inputValue.trim() || isLoading}
              size="sm"
              className="absolute right-2 bottom-2 h-8 w-8 p-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
