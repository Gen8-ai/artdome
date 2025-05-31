
import React, { useState } from 'react';
import ChatInterface from '../components/ChatInterface';
import AuthGuard from '../components/auth/AuthGuard';
import SettingsPage from '../components/auth/SettingsPage';
import ResponsiveLayout from '../components/ResponsiveLayout';

const Index = () => {
  const [showSettings, setShowSettings] = useState(false);

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
      </div>
    </AuthGuard>
  );
};

export default Index;
