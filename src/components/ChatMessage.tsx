
import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
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

  const getModeColor = (mode?: string) => {
    switch (mode) {
      case 'canvas': return 'from-pink-500 to-purple-500';
      case 'research': return 'from-blue-500 to-cyan-500';
      case 'web': return 'from-green-500 to-emerald-500';
      case 'repositories': return 'from-orange-500 to-red-500';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  return (
    <div className={`flex ${message.isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-[80%] ${message.isUser ? 'order-2' : 'order-1'}`}>
        {/* Message Header */}
        <div className={`flex items-center space-x-2 mb-2 ${message.isUser ? 'justify-end' : 'justify-start'}`}>
          <div className={`flex items-center space-x-2 ${message.isUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              message.isUser 
                ? 'bg-gradient-to-r from-blue-500 to-purple-500' 
                : 'bg-gradient-to-r from-purple-500 to-pink-500'
            }`}>
              {message.isUser ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
            </div>
            <div className="text-white/60 text-sm">
              {message.isUser ? 'You' : 'AI'} • {formatTime(message.timestamp)}
              {message.mode && !message.isUser && (
                <span className={`ml-2 px-2 py-1 rounded-full text-xs bg-gradient-to-r ${getModeColor(message.mode)} text-white`}>
                  {message.mode}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Message Content */}
        <div className={`backdrop-blur-xl border border-white/20 rounded-2xl p-4 ${
          message.isUser 
            ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 ml-4' 
            : 'bg-white/10 mr-4'
        }`}>
          <div className="text-white prose prose-invert max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code({ className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '');
                  const isInline = !match;
                  
                  return !isInline ? (
                    <SyntaxHighlighter
                      style={atomDark}
                      language={match[1]}
                      PreTag="div"
                      className="rounded-lg"
                      {...props}
                    >
                      {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                  ) : (
                    <code className="bg-white/20 px-1 py-0.5 rounded text-purple-200" {...props}>
                      {children}
                    </code>
                  );
                },
                h1: ({ children }) => <h1 className="text-2xl font-bold text-white mb-4">{children}</h1>,
                h2: ({ children }) => <h2 className="text-xl font-bold text-white mb-3">{children}</h2>,
                h3: ({ children }) => <h3 className="text-lg font-bold text-white mb-2">{children}</h3>,
                p: ({ children }) => <p className="text-white/90 mb-3 leading-relaxed">{children}</p>,
                ul: ({ children }) => <ul className="text-white/90 mb-3 space-y-1">{children}</ul>,
                ol: ({ children }) => <ol className="text-white/90 mb-3 space-y-1">{children}</ol>,
                li: ({ children }) => <li className="text-white/90">{children}</li>,
                strong: ({ children }) => <strong className="text-white font-semibold">{children}</strong>,
                em: ({ children }) => <em className="text-purple-200">{children}</em>,
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-purple-400 pl-4 italic text-white/80 bg-white/5 rounded-r-lg py-2">
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
            <div className="mt-4 pt-4 border-t border-white/20">
              <Button
                onClick={onArtifactClick}
                className="flex items-center space-x-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
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
