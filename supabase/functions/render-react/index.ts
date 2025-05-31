
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import React from "https://esm.sh/react@18.2.0";
import { renderToString } from "https://esm.sh/react-dom@18.2.0/server";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RenderRequest {
  componentCode: string;
  props?: Record<string, any>;
  wrapperHtml?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { componentCode, props = {}, wrapperHtml }: RenderRequest = await req.json();
    
    console.log('Server-side rendering React component...');

    // Create a safe evaluation context
    const componentFunction = new Function('React', `
      ${componentCode}
      
      // Try to find and return the component
      if (typeof App !== 'undefined') return App;
      if (typeof Component !== 'undefined') return Component;
      
      // Try to find any exported component
      const componentMatch = \`${componentCode}\`.match(/(?:const|function)\\s+(\\w+)\\s*[=\\(]/);
      if (componentMatch) {
        const componentName = componentMatch[1];
        if (typeof eval(componentName) === 'function') {
          return eval(componentName);
        }
      }
      
      throw new Error('No valid React component found');
    `);

    // Execute the component code and get the component
    const ComponentClass = componentFunction(React);
    
    // Render the component to HTML string
    const element = React.createElement(ComponentClass, props);
    const htmlString = renderToString(element);
    
    // Wrap in complete HTML document if wrapper provided
    const finalHtml = wrapperHtml 
      ? wrapperHtml.replace('{{COMPONENT_HTML}}', htmlString)
      : `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Server-Side Rendered React</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { margin: 0; padding: 20px; font-family: system-ui, sans-serif; }
  </style>
</head>
<body>
  <div id="root">${htmlString}</div>
</body>
</html>`;

    console.log('Component rendered successfully');

    return new Response(JSON.stringify({ 
      html: finalHtml,
      componentHtml: htmlString,
      success: true 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Server-side rendering error:', error);
    
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown rendering error',
      success: false
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
};

serve(handler);
