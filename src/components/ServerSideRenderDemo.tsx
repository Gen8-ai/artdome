
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useServerSideRender } from '@/hooks/useServerSideRender';
import { useToast } from '@/hooks/use-toast';
import { Download, Play, Copy } from 'lucide-react';

const ServerSideRenderDemo: React.FC = () => {
  const [componentCode, setComponentCode] = useState(`function HelloWorld({ name = "World" }) {
  return React.createElement('div', {
    className: 'p-6 bg-blue-50 rounded-lg text-center'
  }, [
    React.createElement('h1', {
      key: 'title',
      className: 'text-2xl font-bold text-blue-800 mb-2'
    }, 'Hello, ' + name + '!'),
    React.createElement('p', {
      key: 'desc',
      className: 'text-blue-600'
    }, 'This was rendered server-side!')
  ]);
}`);

  const [props, setProps] = useState('{"name": "Server-Side React"}');
  const [renderedHtml, setRenderedHtml] = useState<string>('');
  
  const { renderComponent, isRendering, error } = useServerSideRender();
  const { toast } = useToast();

  const handleRender = async () => {
    try {
      const parsedProps = props.trim() ? JSON.parse(props) : {};
      
      const result = await renderComponent({
        componentCode,
        props: parsedProps
      });

      if (result) {
        setRenderedHtml(result.html);
        toast({
          title: "Success!",
          description: "Component rendered server-side successfully",
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : 'Failed to parse props JSON',
        variant: "destructive",
      });
    }
  };

  const handleCopyHtml = async () => {
    if (renderedHtml) {
      await navigator.clipboard.writeText(renderedHtml);
      toast({
        title: "Copied!",
        description: "HTML copied to clipboard",
      });
    }
  };

  const handleDownloadHtml = () => {
    if (renderedHtml) {
      const blob = new Blob([renderedHtml], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'server-rendered.html';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Server-Side React DOM Rendering</CardTitle>
          <CardDescription>
            Render React components to HTML strings using Supabase Edge Functions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">React Component Code:</label>
            <Textarea
              value={componentCode}
              onChange={(e) => setComponentCode(e.target.value)}
              className="min-h-[200px] font-mono text-sm"
              placeholder="Enter your React component code..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Props (JSON):</label>
            <Textarea
              value={props}
              onChange={(e) => setProps(e.target.value)}
              className="min-h-[60px] font-mono text-sm"
              placeholder='{"prop1": "value1", "prop2": "value2"}'
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={handleRender} disabled={isRendering}>
              <Play className="w-4 h-4 mr-2" />
              {isRendering ? 'Rendering...' : 'Render Server-Side'}
            </Button>
            
            {renderedHtml && (
              <>
                <Button onClick={handleCopyHtml} variant="outline">
                  <Copy className="w-4 h-4 mr-2" />
                  Copy HTML
                </Button>
                <Button onClick={handleDownloadHtml} variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Download HTML
                </Button>
              </>
            )}
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              Error: {error}
            </div>
          )}
        </CardContent>
      </Card>

      {renderedHtml && (
        <Card>
          <CardHeader>
            <CardTitle>Rendered Output</CardTitle>
            <CardDescription>Complete HTML document with server-rendered React component</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">Preview:</h3>
                <iframe
                  srcDoc={renderedHtml}
                  className="w-full h-64 border rounded"
                  sandbox="allow-scripts"
                  title="Server-rendered React preview"
                />
              </div>
              
              <div>
                <h3 className="font-medium mb-2">HTML Source:</h3>
                <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto max-h-64">
                  {renderedHtml}
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ServerSideRenderDemo;
