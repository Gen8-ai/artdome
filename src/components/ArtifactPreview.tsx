
import React, { useState } from 'react';
import { X, Code, Eye, Copy, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useToast } from '@/hooks/use-toast';

interface ArtifactPreviewProps {
  artifact: {
    type: string;
    code: string;
    title: string;
  };
  onClose: () => void;
}

const ArtifactPreview: React.FC<ArtifactPreviewProps> = ({ artifact, onClose }) => {
  const [activeTab, setActiveTab] = useState('preview');
  const { toast } = useToast();

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(artifact.code);
      toast({
        title: "Copied!",
        description: "Code copied to clipboard",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to copy code",
        variant: "destructive"
      });
    }
  };

  const downloadCode = () => {
    const blob = new Blob([artifact.code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${artifact.title.replace(/\s+/g, '_')}.jsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Downloaded!",
      description: "Code file downloaded successfully",
    });
  };

  // Create a safe preview component
  const PreviewComponent = () => {
    try {
      // This is a simplified preview - in a real app, you'd want to use a sandboxed iframe
      // or a more sophisticated code execution environment
      return (
        <div className="p-6 bg-white rounded-lg">
          <div className="text-gray-800">
            <h3 className="text-lg font-bold mb-4">Live Preview</h3>
            <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
              <p className="text-sm text-gray-600 mb-2">
                Preview of: {artifact.title}
              </p>
              <div className="p-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg text-white">
                <h2 className="text-xl font-bold mb-2">Generated Component</h2>
                <p className="mb-4">This is a live preview of your generated artifact.</p>
                <button className="px-4 py-2 bg-white text-blue-600 rounded hover:bg-gray-100 transition-colors">
                  Interactive Button
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    } catch (error) {
      return (
        <div className="p-6 text-center text-red-400">
          <p>Preview not available for this artifact type.</p>
        </div>
      );
    }
  };

  return (
    <div className="lg:w-1/2 border-l border-white/20 backdrop-blur-xl bg-white/5 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-white/20 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Code className="w-5 h-5 text-purple-300" />
          <h2 className="text-lg font-semibold text-white">{artifact.title}</h2>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={copyToClipboard}
            className="text-white hover:bg-white/10"
          >
            <Copy className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={downloadCode}
            className="text-white hover:bg-white/10"
          >
            <Download className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-white hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="mx-4 mt-4 bg-white/10 border border-white/20">
            <TabsTrigger value="preview" className="data-[state=active]:bg-white/20 text-white">
              <Eye className="w-4 h-4 mr-2" />
              Preview
            </TabsTrigger>
            <TabsTrigger value="code" className="data-[state=active]:bg-white/20 text-white">
              <Code className="w-4 h-4 mr-2" />
              Code
            </TabsTrigger>
          </TabsList>

          <TabsContent value="preview" className="flex-1 m-4 mt-2 overflow-auto">
            <div className="h-full">
              <PreviewComponent />
            </div>
          </TabsContent>

          <TabsContent value="code" className="flex-1 m-4 mt-2 overflow-auto">
            <div className="h-full">
              <SyntaxHighlighter
                language={artifact.type === 'react' ? 'jsx' : 'javascript'}
                style={atomDark}
                className="rounded-lg h-full"
                showLineNumbers
                wrapLines
              >
                {artifact.code}
              </SyntaxHighlighter>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ArtifactPreview;
