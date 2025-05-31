import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark, prism } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import remarkGfm from 'remark-gfm';
import { User, Bot, Code2, Eye, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useIsMobile } from '@/hooks/use-mobile';

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
  onContentRender?: (content: string) => void;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, onArtifactClick, onContentRender }) => {
  const isMobile = useIsMobile();
  
  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const isDarkMode = document.documentElement.classList.contains('dark');
  const isUser = message.role === 'user';

  // Enhanced detection for renderable content
  const hasRenderableCode = message.content.includes('```html') || 
                           message.content.includes('```jsx') || 
                           message.content.includes('```react') ||
                           message.content.includes('```css') ||
                           message.content.includes('```javascript') ||
                           message.content.includes('```canvas') ||
                           message.content.includes('<artifact') ||
                           message.content.includes('Canvas]');

  const handleContentRender = () => {
    if (onContentRender) {
      onContentRender(message.content);
    }
  };

  return (
    <div className={`flex group w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex w-full ${isMobile ? 'max-w-[95%]' : 'max-w-[85%]'} space-x-3 ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
        
        {/* Avatar */}
        <div className="flex-shrink-0">
          <Avatar className={`${isMobile ? 'w-8 h-8' : 'w-10 h-10'}`}>
            <AvatarFallback className={`${
              isUser 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted text-muted-foreground'
            }`}>
              {isUser ? <User className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'}`} /> : <Bot className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'}`} />}
            </AvatarFallback>
          </Avatar>
        </div>

        {/* Message Content */}
        <div className="flex-1 min-w-0 space-y-2">
          
          {/* Message Header */}
          <div className={`flex items-center space-x-2 ${isUser ? 'justify-end' : 'justify-start'} ${isMobile ? 'flex-wrap gap-1' : ''}`}>
            <span className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-foreground`}>
              {isUser ? 'You' : 'AI Assistant'}
            </span>
            <span className={`${isMobile ? 'text-xs' : 'text-xs'} text-muted-foreground`}>
              {formatTime(message.timestamp)}
            </span>
            {message.mode && !isUser && (
              <span className={`${isMobile ? 'text-xs px-1.5 py-0.5' : 'text-xs px-2 py-1'} rounded-full bg-primary/10 text-primary font-medium`}>
                {message.mode}
              </span>
            )}
          </div>

          {/* Message Bubble */}
          <div className={`rounded-2xl ${isMobile ? 'p-3' : 'p-4'} break-words overflow-hidden ${
            isUser 
              ? 'bg-primary text-primary-foreground' 
              : 'bg-muted/50 border border-border'
          }`}>
            <div className={`prose ${isMobile ? 'prose-sm' : 'prose-sm'} max-w-none break-words ${
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
                      <div className={`${isMobile ? 'my-2' : 'my-4'} overflow-hidden rounded-lg border border-border`}>
                        <SyntaxHighlighter
                          style={isDarkMode ? atomDark : prism}
                          language={match[1]}
                          PreTag="div"
                          className={`${isMobile ? 'text-xs' : 'text-sm'}`}
                          customStyle={{
                            margin: 0,
                            background: 'transparent',
                            WebkitOverflowScrolling: 'touch',
                            overflowX: 'auto',
                            fontSize: isMobile ? '12px' : '14px'
                          }}
                          wrapLines={true}
                          wrapLongLines={true}
                        >
                          {String(children).replace(/\n$/, '')}
                        </SyntaxHighlighter>
                      </div>
                    ) : (
                      <code className={`px-1.5 py-0.5 rounded ${isMobile ? 'text-xs' : 'text-sm'} font-mono break-all ${
                        isUser 
                          ? 'bg-primary-foreground/20' 
                          : 'bg-muted'
                      }`} {...props}>
                        {children}
                      </code>
                    );
                  },
                  h1: ({ children }) => <h1 className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold ${isMobile ? 'mb-2 mt-3' : 'mb-3 mt-4'} first:mt-0 break-words`}>{children}</h1>,
                  h2: ({ children }) => <h2 className={`${isMobile ? 'text-base' : 'text-lg'} font-bold ${isMobile ? 'mb-1.5 mt-2' : 'mb-2 mt-3'} break-words`}>{children}</h2>,
                  h3: ({ children }) => <h3 className={`${isMobile ? 'text-sm' : 'text-base'} font-bold ${isMobile ? 'mb-1.5 mt-2' : 'mb-2 mt-3'} break-words`}>{children}</h3>,
                  p: ({ children }) => <p className={`${isMobile ? 'mb-2' : 'mb-3'} leading-relaxed last:mb-0 break-words`}>{children}</p>,
                  ul: ({ children }) => <ul className={`${isMobile ? 'mb-2' : 'mb-3'} space-y-1 last:mb-0`}>{children}</ul>,
                  ol: ({ children }) => <ol className={`${isMobile ? 'mb-2' : 'mb-3'} space-y-1 last:mb-0`}>{children}</ol>,
                  li: ({ children }) => <li className="leading-relaxed break-words">{children}</li>,
                  strong: ({ children }) => <strong className="font-semibold break-words">{children}</strong>,
                  blockquote: ({ children }) => (
                    <blockquote className={`border-l-4 ${isMobile ? 'pl-3 my-3' : 'pl-4 my-4'} italic break-words ${
                      isUser 
                        ? 'border-primary-foreground/30 bg-primary-foreground/10' 
                        : 'border-primary bg-muted/50'
                    } rounded-r-lg py-2`}>
                      {children}
                    </blockquote>
                  ),
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

            {/* Action Buttons */}
            {(message.artifact || hasRenderableCode) && (
              <div className={`${isMobile ? 'mt-3 pt-3' : 'mt-4 pt-4'} border-t border-border/20 flex gap-2 ${isMobile ? 'flex-col' : 'flex-wrap'}`}>
                {message.artifact && (
                  <Button
                    onClick={onArtifactClick}
                    variant={isUser ? "secondary" : "outline"}
                    size={isMobile ? "sm" : "sm"}
                    className={`flex items-center space-x-2 ${isMobile ? 'w-full justify-center' : ''}`}
                  >
                    <Eye className="w-4 h-4" />
                    <span>View Artifact</span>
                    <Code2 className="w-4 h-4" />
                  </Button>
                )}
                {hasRenderableCode && !isUser && (
                  <Button
                    onClick={handleContentRender}
                    variant="outline"
                    size={isMobile ? "sm" : "sm"}
                    className={`flex items-center space-x-2 ${isMobile ? 'w-full justify-center' : ''}`}
                  >
                    <Globe className="w-4 h-4" />
                    <span>Render Content</span>
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
