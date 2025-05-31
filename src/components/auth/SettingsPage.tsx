
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import ProfileSettings from './ProfileSettings';
import AppPreferences from './AppPreferences';
import AIPreferences from './AIPreferences';
import { ArrowLeft, User, Settings, LogOut, Bot } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SettingsPageProps {
  onBack: () => void;
  activeTab?: string;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ onBack, activeTab = 'profile' }) => {
  const { signOut } = useAuth();
  const { toast } = useToast();
  const [currentTab, setCurrentTab] = useState(activeTab);

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to sign out',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Signed out',
        description: 'You have been signed out successfully',
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <ScrollArea className="h-screen">
        <div className="max-w-4xl mx-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <Button
              variant="ghost"
              onClick={onBack}
              className="text-foreground hover:bg-accent"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Chat
            </Button>
            
            <Button
              variant="outline"
              onClick={handleSignOut}
              className="border-destructive/30 text-destructive hover:bg-destructive/10"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>

          <Tabs value={currentTab} onValueChange={setCurrentTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 bg-muted">
              <TabsTrigger value="profile" className="data-[state=active]:bg-background">
                <User className="h-4 w-4 mr-2" />
                Profile
              </TabsTrigger>
              <TabsTrigger value="ai-preferences" className="data-[state=active]:bg-background">
                <Bot className="h-4 w-4 mr-2" />
                AI Preferences
              </TabsTrigger>
              <TabsTrigger value="app-preferences" className="data-[state=active]:bg-background">
                <Settings className="h-4 w-4 mr-2" />
                App Settings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="flex justify-center">
              <ProfileSettings />
            </TabsContent>

            <TabsContent value="ai-preferences" className="flex justify-center">
              <AIPreferences />
            </TabsContent>

            <TabsContent value="app-preferences" className="flex justify-center">
              <AppPreferences />
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>
    </div>
  );
};

export default SettingsPage;
