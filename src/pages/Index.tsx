
import React, { useState, useEffect } from 'react';
import ChatInterface from '../components/ChatInterface';
import OnboardingModal from '../components/OnboardingModal';
import AuthGuard from '../components/auth/AuthGuard';
import SettingsPage from '../components/auth/SettingsPage';
import ResponsiveLayout from '../components/ResponsiveLayout';
import { useToast } from '@/hooks/use-toast';

const Index = () => {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const hasCompletedOnboarding = localStorage.getItem('ai_chat_onboarding_completed');
    if (!hasCompletedOnboarding) {
      setShowOnboarding(true);
    }
  }, []);

  const handleOnboardingComplete = (preferences: any) => {
    localStorage.setItem('ai_chat_onboarding_completed', 'true');
    localStorage.setItem('ai_chat_preferences', JSON.stringify(preferences));
    setShowOnboarding(false);
    toast({
      title: "Welcome!",
      description: "Your AI chat interface is ready to use.",
    });
  };

  const handleShowSettings = () => {
    setShowSettings(true);
  };

  const handleBackFromSettings = () => {
    setShowSettings(false);
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background text-foreground">
        {showSettings ? (
          <SettingsPage onBack={handleBackFromSettings} />
        ) : (
          <ResponsiveLayout>
            <ChatInterface />
          </ResponsiveLayout>
        )}
        <OnboardingModal 
          isOpen={showOnboarding} 
          onComplete={handleOnboardingComplete}
        />
      </div>
    </AuthGuard>
  );
};

export default Index;
