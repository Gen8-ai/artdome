
import React, { useState } from 'react';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAI } from '@/hooks/useAI';
import AppSidebar from './AppSidebar';
import ModelSelector from './ModelSelector';
import SettingsPage from './auth/SettingsPage';

interface ResponsiveLayoutProps {
  children: React.ReactNode;
}

const ResponsiveLayout: React.FC<ResponsiveLayoutProps> = ({ children }) => {
  const isMobile = useIsMobile();
  const [showSettings, setShowSettings] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState('profile');
  
  const {
    models,
    modelsLoading,
    selectedModelId,
    setSelectedModelId
  } = useAI();

  const handleShowSettings = (tab: string) => {
    setActiveSettingsTab(tab);
    setShowSettings(true);
  };

  const handleBackFromSettings = () => {
    setShowSettings(false);
  };

  // Show settings page if settings is active - this completely replaces the chat interface
  if (showSettings) {
    return <SettingsPage onBack={handleBackFromSettings} activeTab={activeSettingsTab} />;
  }

  return (
    <SidebarProvider defaultOpen={!isMobile}>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar onShowSettings={handleShowSettings} />
        <SidebarInset className="flex-1">
          <header className="flex h-14 lg:h-16 items-center gap-2 px-4 border-b border-border/50 min-h-16">
            <SidebarTrigger className="-ml-1" />
            <div className="flex-1 flex justify-center my-0 py-0 px-0 max-h-10 outline-none">
              <div className="w-64">
                <ModelSelector 
                  models={models || []} 
                  selectedModelId={selectedModelId} 
                  onModelChange={setSelectedModelId} 
                  disabled={modelsLoading} 
                />
              </div>
            </div>
          </header>
          <main className="flex-1 overflow-hidden">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default ResponsiveLayout;
