
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from '@/hooks/useTheme';
import { supabase } from '@/integrations/supabase/client';
import { Settings, Trash2, Bell } from 'lucide-react';

interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  notifications_enabled: boolean;
  email_notifications: boolean;
  auto_save: boolean;
}

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'ja', name: '日本語 (Japanese)' },
  { code: 'es', name: 'Español (Spanish)' },
  { code: 'fr', name: 'Français (French)' },
  { code: 'de', name: 'Deutsch (German)' },
  { code: 'it', name: 'Italiano (Italian)' },
  { code: 'pt', name: 'Português (Portuguese)' },
  { code: 'nl', name: 'Nederlands (Dutch)' },
  { code: 'sv', name: 'Svenska (Swedish)' },
  { code: 'no', name: 'Norsk (Norwegian)' },
  { code: 'da', name: 'Dansk (Danish)' },
  { code: 'fi', name: 'Suomi (Finnish)' },
];

const AppPreferences = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { theme, applyTheme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [clearingChats, setClearingChats] = useState(false);
  const [preferences, setPreferences] = useState<UserPreferences>({
    theme: theme,
    language: 'en',
    notifications_enabled: true,
    email_notifications: true,
    auto_save: true,
  });

  useEffect(() => {
    if (user) {
      fetchPreferences();
    }
  }, [user]);

  const fetchPreferences = async () => {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setPreferences({
          theme: data.theme as 'light' | 'dark' | 'system',
          language: data.language,
          notifications_enabled: data.notifications_enabled,
          email_notifications: data.email_notifications,
          auto_save: data.auto_save,
        });
        // Don't automatically apply theme here - only when user saves
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
      toast({
        title: 'Error',
        description: 'Failed to load preferences',
        variant: 'destructive',
      });
    }
  };

  const updatePreferences = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          theme: preferences.theme,
          language: preferences.language,
          notifications_enabled: preferences.notifications_enabled,
          email_notifications: preferences.email_notifications,
          auto_save: preferences.auto_save,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      // Only apply theme when user explicitly saves preferences
      applyTheme(preferences.theme);

      // Request notification permission if enabled
      if (preferences.notifications_enabled && 'Notification' in window) {
        if (Notification.permission === 'default') {
          await Notification.requestPermission();
        }
      }

      toast({
        title: 'Success',
        description: 'Preferences updated successfully',
      });
    } catch (error) {
      console.error('Error updating preferences:', error);
      toast({
        title: 'Error',
        description: 'Failed to update preferences',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const clearChatHistory = async () => {
    if (!user) return;
    
    setClearingChats(true);
    try {
      // Get all conversation IDs for the user
      const { data: conversations, error: conversationsError } = await supabase
        .from('chat_conversations')
        .select('id')
        .eq('user_id', user.id);

      if (conversationsError) throw conversationsError;

      if (conversations && conversations.length > 0) {
        // Delete all messages for these conversations
        const { error: messagesError } = await supabase
          .from('chat_messages')
          .delete()
          .in('conversation_id', conversations.map(conv => conv.id));

        if (messagesError) throw messagesError;

        // Delete all conversations
        const { error: deleteConversationsError } = await supabase
          .from('chat_conversations')
          .delete()
          .eq('user_id', user.id);

        if (deleteConversationsError) throw deleteConversationsError;
      }

      toast({
        title: 'Success',
        description: 'Chat history cleared successfully',
      });
    } catch (error) {
      console.error('Error clearing chat history:', error);
      toast({
        title: 'Error',
        description: 'Failed to clear chat history',
        variant: 'destructive',
      });
    } finally {
      setClearingChats(false);
    }
  };

  const testNotification = () => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Test Notification', {
        body: 'This is a test notification from your AI Assistant',
        icon: '/favicon.ico'
      });
    } else {
      toast({
        title: 'Notifications not available',
        description: 'Please enable notifications in your browser settings',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Settings className="h-6 w-6" />
            App Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Theme and Language Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-foreground">Appearance</h3>
            
            <div className="space-y-2">
              <Label htmlFor="theme" className="text-foreground">Theme</Label>
              <Select value={preferences.theme} onValueChange={(value: 'light' | 'dark' | 'system') => 
                setPreferences({ ...preferences, theme: value })
              }>
                <SelectTrigger className="bg-background border-border text-foreground">
                  <SelectValue placeholder="Select theme" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="language" className="text-foreground">Language</Label>
              <Select value={preferences.language} onValueChange={(value) => 
                setPreferences({ ...preferences, language: value })
              }>
                <SelectTrigger className="bg-background border-border text-foreground">
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code}>
                      {lang.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notification Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-foreground">Notifications</h3>
            
            <div className="flex items-center justify-between space-x-2">
              <div className="space-y-1">
                <Label htmlFor="notifications" className="text-foreground">Browser Notifications</Label>
                <p className="text-sm text-muted-foreground">Receive push notifications for updates</p>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="notifications"
                  checked={preferences.notifications_enabled}
                  onCheckedChange={(checked) => 
                    setPreferences({ ...preferences, notifications_enabled: checked })
                  }
                />
                {preferences.notifications_enabled && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={testNotification}
                    className="text-xs"
                  >
                    <Bell className="h-3 w-3 mr-1" />
                    Test
                  </Button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between space-x-2">
              <div className="space-y-1">
                <Label htmlFor="email-notifications" className="text-foreground">Email Notifications</Label>
                <p className="text-sm text-muted-foreground">Receive notifications via email</p>
              </div>
              <Switch
                id="email-notifications"
                checked={preferences.email_notifications}
                onCheckedChange={(checked) => 
                  setPreferences({ ...preferences, email_notifications: checked })
                }
              />
            </div>
          </div>

          {/* General Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-foreground">General</h3>
            
            <div className="flex items-center justify-between space-x-2">
              <div className="space-y-1">
                <Label htmlFor="auto-save" className="text-foreground">Auto Save</Label>
                <p className="text-sm text-muted-foreground">Automatically save your work</p>
              </div>
              <Switch
                id="auto-save"
                checked={preferences.auto_save}
                onCheckedChange={(checked) => 
                  setPreferences({ ...preferences, auto_save: checked })
                }
              />
            </div>
          </div>

          {/* Data Management */}
          <div className="space-y-4 pt-4 border-t border-border">
            <div className="space-y-2">
              <h3 className="text-lg font-medium text-foreground">Data Management</h3>
              <p className="text-sm text-muted-foreground">Manage your conversation history</p>
            </div>
            
            <Button
              variant="destructive"
              onClick={clearChatHistory}
              disabled={clearingChats}
              className="w-full"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {clearingChats ? 'Clearing...' : 'Clear All Chat History'}
            </Button>
          </div>

          {/* Save Button */}
          <Button
            onClick={updatePreferences}
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {loading ? 'Saving...' : 'Save Preferences'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AppPreferences;
