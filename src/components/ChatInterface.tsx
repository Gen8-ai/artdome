
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAI } from '@/hooks/useAI';
import { useMessages } from '@/hooks/useMessages';
import { useConversation } from '@/contexts/ConversationContext';
import { useConversations } from '@/hooks/useConversations';
import ChatMessage from './ChatMessage';
import HtmlRenderer from './HtmlRenderer';
import PromptSelector from './PromptSelector';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const ChatInterface = () => {
  const { user } = useAuth();
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPromptSelector, setShowPromptSelector] = useState(false);
  const [showHtmlRenderer, setShowHtmlRenderer] = useState(false);
  const [htmlContent, setHtmlContent] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const { currentConversationId } = useConversation();
  const { createConversation } = useConversations();
  const { messages, addMessage } = useMessages(currentConversationId || undefined);
  const {
    prompts,
    promptsLoading,
    selectedModelId,
    selectedPromptId,
    parameters,
    setSelectedPromptId
  } = useAI();

  // Convert database messages to component format
  const displayMessages: Message[] = messages.map(msg => ({
    id: msg.id,
    role: msg.role as 'user' | 'assistant',
    content: msg.content,
    timestamp: new Date(msg.created_at)
  }));

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [displayMessages]);

  // Group prompts by category for quick access
  const getPromptsByCategory = (category: string) => {
    return prompts?.filter(p => p.category === category && (p.is_public || p.user_id === user?.id)) || [];
  };

  // Get all available categories from prompts
  const availableCategories = prompts ? [...new Set(prompts.map(p => p.category).filter(Boolean))] : [];

  const handlePromptSelect = (promptId: string) => {
    setSelectedPromptId(promptId);
    const selectedPrompt = prompts?.find(p => p.id === promptId);
    if (selectedPrompt) {
      console.log('Selected prompt:', selectedPrompt.name, selectedPrompt.content);
    }
  };

  const handleHtmlRender = (content: string) => {
    setHtmlContent(content);
    setShowHtmlRenderer(true);
  };

  const handleCloseHtmlRenderer = () => {
    setShowHtmlRenderer(false);
    setHtmlContent('');
  };

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;
    
    let conversationId = currentConversationId;

    // Create new conversation if none exists
    if (!conversationId) {
      try {
        const newConversation = await createConversation.mutateAsync('New Chat');
        conversationId = newConversation.id;
      } catch (error) {
        console.error('Failed to create conversation:', error);
        return;
      }
    }

    const userMessageContent = inputValue.trim();
    setInputValue('');
    setIsLoading(true);

    try {
      // Add user message to database
      await addMessage.mutateAsync({
        conversation_id: conversationId,
        role: 'user',
        content: userMessageContent
      });

      // Get the selected prompt content for system message
      const selectedPrompt = prompts?.find(p => p.id === selectedPromptId);
      const systemPrompt = selectedPrompt?.content;

      const { data, error } = await supabase.functions.invoke('openai-chat', {
        body: {
          messages: [
            ...displayMessages.map(msg => ({
              role: msg.role,
              content: msg.content
            })),
            {
              role: 'user',
              content: userMessageContent
            }
          ],
          model: selectedModelId || 'gpt-4o',
          systemPrompt,
          ...parameters
        }
      });

      if (error) throw error;

      // Add assistant response to database
      await addMessage.mutateAsync({
        conversation_id: conversationId,
        role: 'assistant',
        content: data.choices[0].message.content,
        model_used: selectedModelId || 'gpt-4o',
        tokens_used: data.usage?.total_tokens,
        cost: 0
      });
    } catch (error) {
      console.error('Error sending message:', error);

      // Add error message to database
      if (conversationId) {
        await addMessage.mutateAsync({
          conversation_id: conversationId,
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.'
        });
      }
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

  // Show HTML renderer if active
  if (showHtmlRenderer) {
    return <HtmlRenderer content={htmlContent} onClose={handleCloseHtmlRenderer} />;
  }

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Messages Container with ScrollArea */}
      <div className="flex-1 min-h-0">
        <ScrollArea className="h-full">
          <div className="max-w-4xl mx-auto px-4 py-6">
            {displayMessages.length === 0 ? (
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
                {displayMessages.map(message => (
                  <ChatMessage 
                    key={message.id} 
                    message={message} 
                    onHtmlRender={handleHtmlRender}
                  />
                ))}
                {isLoading && (
                  <div className="flex items-center space-x-2 text-muted-foreground px-4">
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
        </ScrollArea>
      </div>

      {/* Input Area */}
      <div className="border-t border-border/50 bg-background/80 backdrop-blur-sm flex-shrink-0">
        <div className="max-w-4xl mx-auto p-4">
          <div className="space-y-3">
            {/* Quick Prompt Buttons */}
            {!promptsLoading && prompts && availableCategories.length > 0 && (
              <div className="flex flex-wrap gap-1 overflow-x-auto">
                {availableCategories.slice(0, 4).map(category =>
                  getPromptsByCategory(category).slice(0, 1).map(prompt => (
                    <Button
                      key={prompt.id}
                      variant={selectedPromptId === prompt.id ? "default" : "outline"}
                      onClick={() => handlePromptSelect(prompt.id)}
                      className="h-6 px-2 text-xs flex-shrink-0"
                    >
                      {prompt.name}
                    </Button>
                  ))
                )}
                <Button
                  variant={!selectedPromptId ? "default" : "outline"}
                  onClick={() => setSelectedPromptId('')}
                  className="h-6 px-2 text-xs flex-shrink-0"
                >
                  General
                </Button>
              </div>
            )}

            {promptsLoading && (
              <div className="text-xs text-muted-foreground">Loading prompts...</div>
            )}
            
            {/* Input Container */}
            <div className="relative">
              <Textarea
                ref={textareaRef}
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
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
    </div>
  );
};

export default ChatInterface;
