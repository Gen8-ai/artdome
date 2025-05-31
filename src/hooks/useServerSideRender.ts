
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ServerRenderOptions {
  componentCode: string;
  props?: Record<string, any>;
  wrapperHtml?: string;
}

interface ServerRenderResult {
  html: string;
  componentHtml: string;
  success: boolean;
  error?: string;
}

export const useServerSideRender = () => {
  const [isRendering, setIsRendering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const renderComponent = async (options: ServerRenderOptions): Promise<ServerRenderResult | null> => {
    setIsRendering(true);
    setError(null);

    try {
      const { data, error: functionError } = await supabase.functions.invoke('render-react', {
        body: options
      });

      if (functionError) {
        throw new Error(`Server function error: ${functionError.message}`);
      }

      if (!data.success) {
        throw new Error(data.error || 'Server-side rendering failed');
      }

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Server-side render error:', err);
      return null;
    } finally {
      setIsRendering(false);
    }
  };

  return {
    renderComponent,
    isRendering,
    error,
    clearError: () => setError(null)
  };
};
