
import React from 'react';
import UniversalRenderer from './UniversalRenderer';
import { ContentBlock } from '@/utils/contentRenderer';

interface ArtifactRendererProps {
  code: string;
  title?: string;
  description?: string;
}

const ArtifactRenderer: React.FC<ArtifactRendererProps> = ({ code, title, description }) => {
  // Create a content block for the UniversalRenderer
  const block: ContentBlock = {
    type: 'artifact',
    code,
    title,
    description
  };

  return (
    <UniversalRenderer 
      block={block}
      options={{
        theme: 'light',
        useCompilation: false,
        includeTailwind: true,
        includeLucideIcons: true,
        includeShadcnUI: true
      }}
    />
  );
};

export default ArtifactRenderer;
