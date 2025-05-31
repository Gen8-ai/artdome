
import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Settings, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import ChatMessage from './ChatMessage';
import ArtifactPreview from './ArtifactPreview';
import { useAuth } from '@/contexts/AuthContext';

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
  const [isLoading, setIsLoading] = useState(false);
  const [selectedArtifact, setSelectedArtifact] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
    setIsLoading(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 1000));

      const aiMessage: Message = {
        id: `ai-${Date.now()}`,
        content: `I understand you want to: "${inputValue}". This is a demo response. The AI chat functionality would be implemented here with your preferred AI service.`,
        isUser: false,
        timestamp: new Date(),
        mode: 'canvas',
        artifact: Math.random() > 0.7 ? {
          type: 'react',
          code: `import React from 'react';\n\nconst ExampleComponent = () => {\n  return (\n    <div className="p-4 bg-blue-100 rounded-lg">\n      <h2 className="text-xl font-bold mb-2">Generated Component</h2>\n      <p>This is an example artifact generated from your request.</p>\n    </div>\n  );\n};\n\nexport default ExampleComponent;`,
          title: 'Example Component'
        } : undefined,
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
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
              {onShowSettings && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onShowSettings}
                  className="text-white hover:bg-white/10"
                >
                  <Settings className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-white/60 mt-12">
              <h2 className="text-xl mb-2">Welcome to AI Chat Assistant</h2>
              <p>Start a conversation by typing a message below.</p>
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
                disabled={isLoading}
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
              disabled={!inputValue.trim() || isLoading}
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
