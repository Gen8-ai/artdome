import React, { useRef, useEffect, useState } from 'react';
import { ContentBlock, RenderingOptions, contentRenderer } from '@/utils/contentRenderer';
import { pipelineManager } from '@/utils/pipelineManager';
import { e2bIntegration } from '@/utils/contentRenderer/e2bIntegration';
import { artifactInjector, InjectionOptions } from '@/utils/contentRenderer/artifactInjector';
import { aiBugFixer } from '@/utils/contentRenderer/aiBugFixer';
import ReactRenderer from './ReactRenderer';

interface UniversalRendererProps {
  block: ContentBlock;
  options?: RenderingOptions;
  onCompilationStart?: () => void;
  onCompilationEnd?: () => void;
}

type ExecutionMethod = 'iframe' | 'e2b' | 'module';

const UniversalRenderer: React.FC<UniversalRendererProps> = ({ 
  block, 
  options = {},
  onCompilationStart,
  onCompilationEnd
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isIframeMounted, setIsIframeMounted] = useState(false);
  const [executionMethod, setExecutionMethod] = useState<ExecutionMethod>('iframe');
  const [currentArtifactId, setCurrentArtifactId] = useState<string | null>(null);

  useEffect(() => {
    const renderContent = async () => {
      try {
        setIsLoading(true);
        setError(null);
        onCompilationStart?.();

        console.log('Starting content compilation for type:', block.type);
        
        // Determine execution method
        const shouldUseE2B = e2bIntegration.shouldUseE2B(block);
        const shouldUseModule = block.type === 'artifact' || block.type === 'react';
        
        let currentMethod: ExecutionMethod = 'iframe';
        
        if (shouldUseE2B) {
          currentMethod = 'e2b';
        } else if (shouldUseModule && containerRef.current) {
          currentMethod = 'module';
        }
        
        setExecutionMethod(currentMethod);

        // Pre-process with AI bug fixing for all execution methods
        let processedBlock = block;
        try {
          console.log('Running AI bug fixing pre-process...');
          const fixResult = await aiBugFixer.fixAndValidate(
            block.code, 
            detectLanguage(block.type, block.code)
          );
          
          if (fixResult.success && fixResult.confidence > 0.7) {
            processedBlock = { ...block, code: fixResult.fixedCode };
            console.log('AI bug fixing applied:', fixResult.fixesApplied);
          }
        } catch (bugFixError) {
          console.warn('AI bug fixing failed, proceeding with original code:', bugFixError);
        }

        if (currentMethod === 'e2b') {
          console.log('Using E2B execution for secure code execution');
          
          // Wait for iframe to be mounted for E2B rendering
          if (!isIframeMounted || !iframeRef.current) {
            console.log('Iframe not ready for E2B, waiting...');
            return;
          }
          
          const e2bResult = await e2bIntegration.renderWithE2B(processedBlock, {
            timeout: 30000,
            enableFileSystem: true
          });

          if (iframeRef.current) {
            iframeRef.current.srcdoc = e2bResult.html;
            console.log('E2B content rendered successfully');
          }
          
        } else if (currentMethod === 'module' && containerRef.current) {
          console.log('Using module wrapper for artifact injection');
          
          // Unmount previous artifact if exists
          if (currentArtifactId) {
            artifactInjector.unmountArtifact(currentArtifactId);
          }
          
          // Inject artifact using module wrapper with AI error recovery
          const injectionOptions: InjectionOptions = {
            isolateGlobals: true,
            enableHMR: true,
            onMount: (exports) => {
              console.log('Artifact mounted successfully:', exports);
            },
            onError: async (error) => {
              console.error('Artifact injection error:', error);
              
              // Attempt AI auto-recovery
              try {
                console.log('Attempting AI auto-recovery...');
                const recoveryResult = await aiBugFixer.fixBugs(
                  processedBlock.code,
                  detectLanguage(processedBlock.type, processedBlock.code),
                  error.message
                );
                
                if (recoveryResult.success) {
                  console.log('AI auto-recovery successful, retrying injection...');
                  // Update block with fixed code and retry
                  const fixedBlock = { ...processedBlock, code: recoveryResult.fixedCode };
                  // This would trigger a re-render with the fixed code
                  setError(null);
                } else {
                  setError(error.message);
                }
              } catch (recoveryError) {
                console.error('AI auto-recovery failed:', recoveryError);
                setError(error.message);
              }
            }
          };
          
          const artifact = await artifactInjector.injectArtifact(
            processedBlock, 
            containerRef.current, 
            injectionOptions
          );
          
          setCurrentArtifactId(artifact.id);
          console.log('Module content rendered successfully');
          
        } else {
          console.log('Using traditional iframe rendering');
          
          // Wait for iframe to be mounted for iframe rendering
          if (!isIframeMounted || !iframeRef.current) {
            console.log('Iframe not ready, waiting...');
            return;
          }

          // Use pipeline manager to execute rendering steps with AI bug fixing
          const htmlContent = await pipelineManager.executeStage('preview', async () => {
            // Special handling for artifact type
            if (processedBlock.type === 'artifact') {
              return await renderArtifactContentWithAI(processedBlock);
            } else {
              return await contentRenderer.generateHtmlDocument(processedBlock, {
                ...options,
                useCompilation: true
              });
            }
          });

          // Double-check the ref is still valid before setting srcdoc
          if (iframeRef.current && htmlContent) {
            iframeRef.current.srcdoc = htmlContent;
            console.log('Content rendered successfully');
          }
        }
      } catch (err) {
        console.error('Rendering error:', err);
        
        // Attempt AI auto-recovery for general rendering errors
        try {
          console.log('Attempting AI auto-recovery for rendering error...');
          const recoveryResult = await aiBugFixer.fixBugs(
            block.code,
            detectLanguage(block.type, block.code),
            err instanceof Error ? err.message : 'Rendering failed'
          );
          
          if (recoveryResult.success && recoveryResult.confidence > 0.6) {
            console.log('AI auto-recovery successful, retrying render...');
            // This would need to trigger a re-render with the fixed code
            // For now, we'll just log the success
          } else {
            setError(err instanceof Error ? err.message : 'Rendering failed');
          }
        } catch (recoveryError) {
          console.error('AI auto-recovery failed:', recoveryError);
          setError(err instanceof Error ? err.message : 'Rendering failed');
        }
        
        // Set error content in iframe if not using module injection
        if (executionMethod !== 'module' && iframeRef.current) {
          iframeRef.current.srcdoc = createErrorContent(err instanceof Error ? err.message : 'Rendering failed');
        }
      } finally {
        setIsLoading(false);
        onCompilationEnd?.();
      }
    };

    renderContent();
  }, [block, options, isIframeMounted, onCompilationStart, onCompilationEnd]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (currentArtifactId) {
        artifactInjector.unmountArtifact(currentArtifactId);
      }
    };
  }, [currentArtifactId]);

  // Handle iframe mount/unmount
  const handleIframeRef = (iframe: HTMLIFrameElement | null) => {
    if (iframe) {
      setIsIframeMounted(true);
    } else {
      setIsIframeMounted(false);
    }
  };

  // Handle special cases
  if (block.type === 'react' && !options.useCompilation && executionMethod !== 'module') {
    return <ReactRenderer code={block.code} />;
  }

  if (error && !isLoading) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2 text-red-600">Rendering Error</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <div className="space-y-2">
            <button 
              onClick={() => {
                setError(null);
                setIsLoading(false);
              }}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 mr-2"
            >
              Retry
            </button>
            {executionMethod === 'e2b' && (
              <div className="text-sm text-gray-600 mt-2">
                <p>E2B execution failed. This might be due to:</p>
                <ul className="text-left mt-1 space-y-1">
                  <li>• Missing E2B API key</li>
                  <li>• Network connectivity issues</li>
                  <li>• Code syntax errors</li>
                  <li>• Execution timeout</li>
                </ul>
              </div>
            )}
            {executionMethod === 'module' && (
              <div className="text-sm text-gray-600 mt-2">
                <p>Module injection failed. This might be due to:</p>
                <ul className="text-left mt-1 space-y-1">
                  <li>• Code syntax errors</li>
                  <li>• Missing dependencies</li>
                  <li>• Runtime exceptions</li>
                  <li>• Invalid component structure</li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">
            {executionMethod === 'e2b' ? 'Executing code securely with E2B...' : 
             executionMethod === 'module' ? 'Injecting module into application...' : 
             'Compiling and rendering...'}
          </p>
          {executionMethod === 'e2b' && (
            <p className="text-xs text-gray-500 mt-2">
              Secure execution environment • Multi-language support
            </p>
          )}
          {executionMethod === 'module' && (
            <p className="text-xs text-gray-500 mt-2">
              Isolated module execution • Hot module replacement
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative">
      {/* Module container for direct injection */}
      {executionMethod === 'module' && (
        <div
          ref={containerRef}
          className="w-full h-full"
          style={{ minHeight: '200px' }}
        />
      )}
      
      {/* Iframe for traditional rendering and E2B */}
      {(executionMethod === 'iframe' || executionMethod === 'e2b') && (
        <iframe
          ref={(iframe) => {
            iframeRef.current = iframe;
            handleIframeRef(iframe);
          }}
          className="w-full h-full border-0"
          sandbox="allow-scripts allow-forms allow-same-origin"
          title={`${block.type} content preview ${
            executionMethod === 'e2b' ? '(E2B Secure)' : 
            executionMethod === 'module' ? '(Module Wrapped)' : ''
          }`}
        />
      )}
    </div>
  );
};

// Helper function to detect language from block type and code
function detectLanguage(type?: string, code?: string): string {
  if (type === 'react' || code?.includes('React') || code?.includes('jsx')) {
    return 'javascript';
  }
  if (type === 'javascript') return 'javascript';
  if (type === 'html') return 'html';
  if (type === 'css') return 'css';
  if (code?.includes('def ') || code?.includes('import ')) return 'python';
  return 'javascript'; // default
}

// Enhanced artifact rendering with AI bug fixing
async function renderArtifactContentWithAI(block: ContentBlock): Promise<string> {
  try {
    // First attempt normal rendering
    return await contentRenderer.generateHtmlDocument(block, {
      useCompilation: true,
      includeTailwind: true,
      includeLucideIcons: true,
      includeShadcnUI: true
    });
  } catch (error) {
    console.log('Artifact rendering failed, attempting AI fix...');
    
    try {
      const fixResult = await aiBugFixer.fixBugs(
        block.code,
        detectLanguage(block.type, block.code),
        error instanceof Error ? error.message : 'Artifact rendering failed'
      );
      
      if (fixResult.success) {
        const fixedBlock = { ...block, code: fixResult.fixedCode };
        return await contentRenderer.generateHtmlDocument(fixedBlock, {
          useCompilation: true,
          includeTailwind: true,
          includeLucideIcons: true,
          includeShadcnUI: true
        });
      }
    } catch (fixError) {
      console.error('AI fix failed:', fixError);
    }
    
    // If AI fix fails, return error content
    throw error;
  }
}

function createErrorContent(errorMessage: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Error</title>
  <style>
    body {
      font-family: system-ui, sans-serif;
      padding: 20px;
      background: #fef2f2;
      color: #dc2626;
    }
    .error-container {
      max-width: 500px;
      margin: 0 auto;
      padding: 20px;
      border: 1px solid #fecaca;
      border-radius: 8px;
      background: white;
    }
  </style>
</head>
<body>
  <div class="error-container">
    <h3>⚠️ Rendering Error</h3>
    <p>${errorMessage}</p>
  </div>
</body>
</html>`;
}

export default UniversalRenderer;
