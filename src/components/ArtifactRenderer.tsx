
import React from 'react';
import UniversalRenderer from './UniversalRenderer';
import { ContentBlock } from '@/utils/contentRenderer';

interface ArtifactRendererProps {
  code: string;
  title?: string;
  description?: string;
  useModuleWrapper?: boolean;
}

const ArtifactRenderer: React.FC<ArtifactRendererProps> = ({ 
  code, 
  title, 
  description, 
  useModuleWrapper = true 
}) => {
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
        useCompilation: !useModuleWrapper, // Use compilation for iframe, not for module wrapper
        includeTailwind: true,
        includeLucideIcons: true,
        includeShadcnUI: true
      }}
    />
  );
};

export default ArtifactRenderer;
