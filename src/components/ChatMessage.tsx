
import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark, prism } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import remarkGfm from 'remark-gfm';
import { User, Bot, Code2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  artifact?: any;
  mode?: string;
  model?: string;
}

interface ChatMessageProps {
  message: Message;
  onArtifactClick?: () => void;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, onArtifactClick }) => {
  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const isDarkMode = document.documentElement.classList.contains('dark');

  return (
    <div className={`flex ${message.isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-[85%] lg:max-w-[80%] ${message.isUser ? 'order-2' : 'order-1'}`}>
        {/* Message Header */}
        <div className={`flex items-center space-x-2 mb-2 ${message.isUser ? 'justify-end' : 'justify-start'}`}>
          <div className={`flex items-center space-x-2 ${message.isUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
            <div className={`w-7 h-7 lg:w-8 lg:h-8 rounded-full flex items-center justify-center ${
              message.isUser 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted text-muted-foreground'
            }`}>
              {message.isUser ? <User className="w-3 h-3 lg:w-4 lg:h-4" /> : <Bot className="w-3 h-3 lg:w-4 lg:h-4" />}
            </div>
            <div className="text-muted-foreground text-xs lg:text-sm">
              {message.isUser ? 'You' : 'AI'} • {formatTime(message.timestamp)}
              {message.mode && !message.isUser && (
                <span className="ml-2 px-2 py-1 rounded-full text-xs bg-primary/10 text-primary">
                  {message.mode}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Message Content */}
        <div className={`bg-card border border-border rounded-2xl p-3 lg:p-4 ${
          message.isUser 
            ? 'ml-2 lg:ml-4' 
            : 'mr-2 lg:mr-4'
        }`}>
          <div className="text-card-foreground prose prose-sm lg:prose-base prose-neutral dark:prose-invert max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code({ className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '');
                  const isInline = !match;
                  
                  return !isInline ? (
                    <div className="overflow-x-auto">
                      <SyntaxHighlighter
                        style={isDarkMode ? atomDark : prism}
                        language={match[1]}
                        PreTag="div"
                        className="rounded-lg text-sm"
                        customStyle={{
                          margin: 0,
                          WebkitOverflowScrolling: 'touch'
                        }}
                      >
                        {String(children).replace(/\n$/, '')}
                      </SyntaxHighlighter>
                    </div>
                  ) : (
                    <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
                      {children}
                    </code>
                  );
                },
                h1: ({ children }) => <h1 className="text-xl lg:text-2xl font-bold mb-4">{children}</h1>,
                h2: ({ children }) => <h2 className="text-lg lg:text-xl font-bold mb-3">{children}</h2>,
                h3: ({ children }) => <h3 className="text-base lg:text-lg font-bold mb-2">{children}</h3>,
                p: ({ children }) => <p className="mb-3 leading-relaxed text-sm lg:text-base">{children}</p>,
                ul: ({ children }) => <ul className="mb-3 space-y-1 text-sm lg:text-base">{children}</ul>,
                ol: ({ children }) => <ol className="mb-3 space-y-1 text-sm lg:text-base">{children}</ol>,
                li: ({ children }) => <li className="text-sm lg:text-base">{children}</li>,
                strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-primary pl-4 italic bg-muted/50 rounded-r-lg py-2 text-sm lg:text-base">
                    {children}
                  </blockquote>
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>

          {/* Artifact Button */}
          {message.artifact && (
            <div className="mt-4 pt-4 border-t border-border">
              <Button
                onClick={onArtifactClick}
                variant="outline"
                size="sm"
                className="flex items-center space-x-2"
              >
                <Eye className="w-4 h-4" />
                <span>View Artifact</span>
                <Code2 className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
