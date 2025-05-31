
import React, { useState, useEffect } from 'react';
import ChatInterface from '../components/ChatInterface';
import OnboardingModal from '../components/OnboardingModal';
import { useToast } from '@/hooks/use-toast';

const Index = () => {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Check if user has completed onboarding
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <ChatInterface />
      <OnboardingModal 
        isOpen={showOnboarding} 
        onComplete={handleOnboardingComplete}
      />
    </div>
  );
};

export default Index;
