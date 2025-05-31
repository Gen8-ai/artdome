import React from 'react';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAI } from '@/hooks/useAI';
import AppSidebar from './AppSidebar';
import ModelSelector from './ModelSelector';
interface ResponsiveLayoutProps {
  children: React.ReactNode;
}
const ResponsiveLayout: React.FC<ResponsiveLayoutProps> = ({
  children
}) => {
  const isMobile = useIsMobile();
  const {
    models,
    modelsLoading,
    selectedModelId,
    setSelectedModelId
  } = useAI();
  return <SidebarProvider defaultOpen={!isMobile}>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <SidebarInset className="flex-1">
          <header className="flex h-14 lg:h-16 items-center gap-2 px-4 border-b border-border/50 min-h-16">
            <SidebarTrigger className="-ml-1" />
            <div className="flex-1 flex justify-center my-0 py-0 px-0 max-h-10 outline-none">
              <div className="w-64">
                <ModelSelector models={models || []} selectedModelId={selectedModelId} onModelChange={setSelectedModelId} disabled={modelsLoading} />
              </div>
            </div>
          </header>
          <main className="flex-1 overflow-hidden">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>;
};
export default ResponsiveLayout;