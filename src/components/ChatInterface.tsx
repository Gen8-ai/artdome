
import React, { useState, useEffect, useRef } from 'react';
import { Send, Sparkles, Search, Globe, GitBranch, Palette, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ChatMessage from './ChatMessage';
import ArtifactPreview from './ArtifactPreview';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  artifact?: any;
  mode?: string;
  model?: string;
}

interface AIMode {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  color: string;
}

const aiModes: AIMode[] = [
  {
    id: 'canvas',
    name: 'Canvas',
    icon: <Palette className="w-4 h-4" />,
    description: 'Create visual content and artifacts',
    color: 'from-pink-500 to-purple-500'
  },
  {
    id: 'research',
    name: 'Research',
    icon: <Search className="w-4 h-4" />,
    description: 'Deep research and analysis',
    color: 'from-blue-500 to-cyan-500'
  },
  {
    id: 'web',
    name: 'Web',
    icon: <Globe className="w-4 h-4" />,
    description: 'Web search and browsing',
    color: 'from-green-500 to-emerald-500'
  },
  {
    id: 'repositories',
    name: 'Repos',
    icon: <GitBranch className="w-4 h-4" />,
    description: 'Code repositories search',
    color: 'from-orange-500 to-red-500'
  }
];

const ChatInterface = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [selectedMode, setSelectedMode] = useState('canvas');
  const [selectedModel, setSelectedModel] = useState('gpt-4o');
  const [isLoading, setIsLoading] = useState(false);
  const [showArtifact, setShowArtifact] = useState(false);
  const [currentArtifact, setCurrentArtifact] = useState(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Load chat history from localStorage
    const savedMessages = localStorage.getItem('ai_chat_history');
    if (savedMessages) {
      setMessages(JSON.parse(savedMessages));
    }
  }, []);

  useEffect(() => {
    // Save messages to localStorage
    if (messages.length > 0) {
      localStorage.setItem('ai_chat_history', JSON.stringify(messages));
    }
  }, [messages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      isUser: true,
      timestamp: new Date(),
      mode: selectedMode,
      model: selectedModel
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Simulate AI response (replace with actual API call)
      await simulateAIResponse(inputValue, selectedMode, selectedModel);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to get AI response. Please check your API key.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const simulateAIResponse = async (prompt: string, mode: string, model: string) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    let responseContent = '';
    let artifact = null;

    switch (mode) {
      case 'canvas':
        responseContent = `I'll create a visual artifact for you. Here's a React component based on your request: "${prompt}"`;
        artifact = {
          type: 'react',
          code: generateSampleReactCode(prompt),
          title: 'Generated Component'
        };
        break;
      case 'research':
        responseContent = `Based on my research about "${prompt}", here are the key findings:\n\n## Key Points\n- Research finding 1\n- Research finding 2\n- Research finding 3\n\n\`\`\`javascript\nconst example = "code snippet";\n\`\`\``;
        break;
      case 'web':
        responseContent = `I searched the web for "${prompt}" and found relevant information:\n\n**Search Results:**\n- Result 1: Detailed information\n- Result 2: Additional context\n- Result 3: Supporting data`;
        break;
      case 'repositories':
        responseContent = `Found relevant code repositories for "${prompt}":\n\n\`\`\`bash\ngit clone https://github.com/example/repo.git\n\`\`\`\n\n**Repository Analysis:**\n- Main language: JavaScript/TypeScript\n- Stars: 1.2k\n- Last updated: 2 days ago`;
        break;
      default:
        responseContent = `Here's my response to: "${prompt}"`;
    }

    const aiMessage: Message = {
      id: (Date.now() + 1).toString(),
      content: responseContent,
      isUser: false,
      timestamp: new Date(),
      artifact,
      mode,
      model
    };

    setMessages(prev => [...prev, aiMessage]);

    if (artifact) {
      setCurrentArtifact(artifact);
      setShowArtifact(true);
    }
  };

  const generateSampleReactCode = (prompt: string) => {
    return `import React from 'react';

const GeneratedComponent = () => {
  return (
    <div className="p-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg text-white">
      <h2 className="text-2xl font-bold mb-4">Generated from: ${prompt}</h2>
      <p className="text-lg">This is a sample component generated based on your prompt.</p>
      <button className="mt-4 px-4 py-2 bg-white text-blue-600 rounded hover:bg-gray-100 transition-colors">
        Interactive Button
      </button>
    </div>
  );
};

export default GeneratedComponent;`;
  };

  const clearChat = () => {
    setMessages([]);
    localStorage.removeItem('ai_chat_history');
    setShowArtifact(false);
    setCurrentArtifact(null);
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Main Chat Area */}
      <div className={`flex-1 flex flex-col ${showArtifact ? 'lg:w-1/2' : 'w-full'}`}>
        {/* Header */}
        <div className="backdrop-blur-xl bg-white/10 border-b border-white/20 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-6 h-6 text-purple-300" />
              <h1 className="text-xl font-bold text-white">AI Canvas</h1>
            </div>
            <div className="flex items-center space-x-2">
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger className="w-32 bg-white/10 border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gpt-4o">GPT-4O</SelectItem>
                  <SelectItem value="gpt-4o-mini">GPT-4O Mini</SelectItem>
                  <SelectItem value="claude-3">Claude 3</SelectItem>
                  <SelectItem value="gemini-pro">Gemini Pro</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearChat}
                className="text-white hover:bg-white/10"
              >
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-white/60 mt-20">
              <Sparkles className="w-16 h-16 mx-auto mb-4 text-purple-300" />
              <h2 className="text-2xl font-bold mb-2">Welcome to AI Canvas</h2>
              <p className="text-lg">Choose a mode and start chatting with AI</p>
            </div>
          )}
          {messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message}
              onArtifactClick={() => {
                if (message.artifact) {
                  setCurrentArtifact(message.artifact);
                  setShowArtifact(true);
                }
              }}
            />
          ))}
          {isLoading && (
            <div className="flex items-center space-x-2 text-white/60">
              <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
              <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
              <span className="ml-2">AI is thinking...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* AI Mode Selection */}
        <div className="p-4 backdrop-blur-xl bg-white/5 border-t border-white/20">
          <div className="grid grid-cols-4 gap-2 mb-4">
            {aiModes.map((mode) => (
              <button
                key={mode.id}
                onClick={() => setSelectedMode(mode.id)}
                className={`p-3 rounded-xl transition-all duration-200 ${
                  selectedMode === mode.id
                    ? `bg-gradient-to-r ${mode.color} shadow-lg scale-105`
                    : 'bg-white/10 hover:bg-white/20'
                }`}
              >
                <div className="flex flex-col items-center space-y-1">
                  <div className="text-white">{mode.icon}</div>
                  <span className="text-xs text-white font-medium">{mode.name}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="flex space-x-2">
            <div className="flex-1 relative">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder={`Ask AI in ${aiModes.find(m => m.id === selectedMode)?.name} mode...`}
                className="w-full px-4 py-3 bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                disabled={isLoading}
              />
            </div>
            <Button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading}
              className="px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-xl"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Artifact Preview */}
      {showArtifact && currentArtifact && (
        <ArtifactPreview
          artifact={currentArtifact}
          onClose={() => setShowArtifact(false)}
        />
      )}
    </div>
  );
};

export default ChatInterface;
