
import { useState, useEffect, useMemo } from 'react';
import { contentRenderer, ContentBlock } from '@/utils/contentRenderer';

export const useContentParser = (content: string) => {
  const [parsedBlocks, setParsedBlocks] = useState<ContentBlock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const parseContent = useMemo(() => {
    return (text: string): ContentBlock[] => {
      if (!text || typeof text !== 'string') {
        return [];
      }

      const blocks: ContentBlock[] = [];
      
      try {
        // Enhanced regex patterns for better detection
        const patterns = {
          canvas: /```canvas\n([\s\S]*?)```/g,
          artifact: /<artifact[^>]*>([\s\S]*?)<\/artifact>/g,
          html: /```html\n([\s\S]*?)```/g,
          jsx: /```jsx\n([\s\S]*?)```/g,
          react: /```react\n([\s\S]*?)```/g,
          css: /```css\n([\s\S]*?)```/g,
          javascript: /```javascript\n([\s\S]*?)```/g,
          js: /```js\n([\s\S]*?)```/g,
        };

        // Process each pattern type
        Object.entries(patterns).forEach(([patternType, regex]) => {
          let match;
          while ((match = regex.exec(text)) !== null) {
            const code = match[1];
            if (code && code.trim()) {
              const detectedType = contentRenderer.detectContentType(code);
              
              blocks.push({
                id: `${patternType}-${blocks.length}`,
                type: detectedType,
                code: code.trim(),
                title: `${patternType.charAt(0).toUpperCase() + patternType.slice(1)} Content`,
                language: patternType === 'jsx' || patternType === 'react' ? 'javascript' : patternType,
                metadata: {
                  originalPattern: patternType,
                  matchIndex: match.index
                }
              });
            }
          }
        });

        // Sort blocks by their appearance in the original text
        blocks.sort((a, b) => {
          const aIndex = a.metadata?.matchIndex || 0;
          const bIndex = b.metadata?.matchIndex || 0;
          return aIndex - bIndex;
        });

        // If no specific patterns found, try to detect the whole content
        if (blocks.length === 0 && text.trim().length > 0) {
          const detectedType = contentRenderer.detectContentType(text);
          blocks.push({
            id: 'content-0',
            type: detectedType,
            code: text.trim(),
            title: 'Detected Content',
            metadata: {
              isFullContent: true
            }
          });
        }

        return blocks;
      } catch (err) {
        console.error('Error parsing content:', err);
        setError(err instanceof Error ? err.message : 'Unknown parsing error');
        return [];
      }
    };
  }, []);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    
    try {
      const blocks = parseContent(content);
      setParsedBlocks(blocks);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse content');
      setParsedBlocks([]);
    } finally {
      setIsLoading(false);
    }
  }, [content, parseContent]);

  const getBlocksByType = (type: ContentBlock['type']) => {
    return parsedBlocks.filter(block => block.type === type);
  };

  const hasContent = parsedBlocks.length > 0;
  const contentTypes = [...new Set(parsedBlocks.map(block => block.type))];

  return {
    blocks: parsedBlocks,
    isLoading,
    error,
    hasContent,
    contentTypes,
    getBlocksByType,
    totalBlocks: parsedBlocks.length
  };
};
