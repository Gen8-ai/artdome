
import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark, prism } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import remarkGfm from 'remark-gfm';
import { User, Bot, Code2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
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
  const isUser = message.role === 'user';

  return (
    <div className={`flex group w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex w-full max-w-[85%] space-x-3 ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
        
        {/* Avatar */}
        <div className="flex-shrink-0">
          <Avatar className="w-10 h-10">
            <AvatarFallback className={`${
              isUser 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted text-muted-foreground'
            }`}>
              {isUser ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
            </AvatarFallback>
          </Avatar>
        </div>

        {/* Message Content */}
        <div className="flex-1 min-w-0 space-y-2">
          
          {/* Message Header */}
          <div className={`flex items-center space-x-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
            <span className="text-sm font-medium text-foreground">
              {isUser ? 'You' : 'AI Assistant'}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatTime(message.timestamp)}
            </span>
            {message.mode && !isUser && (
              <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">
                {message.mode}
              </span>
            )}
          </div>

          {/* Message Bubble */}
          <div className={`rounded-2xl p-4 break-words overflow-hidden ${
            isUser 
              ? 'bg-primary text-primary-foreground' 
              : 'bg-muted/50 border border-border'
          }`}>
            <div className={`prose prose-sm max-w-none break-words ${
              isUser 
                ? 'prose-invert' 
                : 'prose-neutral dark:prose-invert'
            }`}>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '');
                    const isInline = !match;
                    
                    return !isInline ? (
                      <div className="my-4 overflow-hidden rounded-lg border border-border">
                        <SyntaxHighlighter
                          style={isDarkMode ? atomDark : prism}
                          language={match[1]}
                          PreTag="div"
                          className="text-sm"
                          customStyle={{
                            margin: 0,
                            background: 'transparent',
                            WebkitOverflowScrolling: 'touch',
                            overflowX: 'auto'
                          }}
                          wrapLines={true}
                          wrapLongLines={true}
                        >
                          {String(children).replace(/\n$/, '')}
                        </SyntaxHighlighter>
                      </div>
                    ) : (
                      <code className={`px-1.5 py-0.5 rounded text-sm font-mono break-all ${
                        isUser 
                          ? 'bg-primary-foreground/20' 
                          : 'bg-muted'
                      }`} {...props}>
                        {children}
                      </code>
                    );
                  },
                  h1: ({ children }) => <h1 className="text-xl font-bold mb-3 mt-4 first:mt-0 break-words">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-lg font-bold mb-2 mt-3 break-words">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-base font-bold mb-2 mt-3 break-words">{children}</h3>,
                  p: ({ children }) => <p className="mb-3 leading-relaxed last:mb-0 break-words">{children}</p>,
                  ul: ({ children }) => <ul className="mb-3 space-y-1 last:mb-0">{children}</ul>,
                  ol: ({ children }) => <ol className="mb-3 space-y-1 last:mb-0">{children}</ol>,
                  li: ({ children }) => <li className="leading-relaxed break-words">{children}</li>,
                  strong: ({ children }) => <strong className="font-semibold break-words">{children}</strong>,
                  blockquote: ({ children }) => (
                    <blockquote className={`border-l-4 pl-4 italic my-4 break-words ${
                      isUser 
                        ? 'border-primary-foreground/30 bg-primary-foreground/10' 
                        : 'border-primary bg-muted/50'
                    } rounded-r-lg py-2`}>
                      {children}
                    </blockquote>
                  ),
                  // Handle long URLs and links
                  a: ({ children, href, ...props }) => (
                    <a 
                      href={href} 
                      className="break-all underline hover:no-underline" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      {...props}
                    >
                      {children}
                    </a>
                  ),
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>

            {/* Artifact Button */}
            {message.artifact && (
              <div className="mt-4 pt-4 border-t border-border/20">
                <Button
                  onClick={onArtifactClick}
                  variant={isUser ? "secondary" : "outline"}
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
    </div>
  );
};

export default ChatMessage;
