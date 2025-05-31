
import React from 'react';
import ChatInterface from '../components/ChatInterface';
import AuthGuard from '../components/auth/AuthGuard';
import ResponsiveLayout from '../components/ResponsiveLayout';

const Index = () => {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-background text-foreground">
        <ResponsiveLayout>
          <ChatInterface />
        </ResponsiveLayout>
      </div>
    </AuthGuard>
  );
};

export default Index;
