
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
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
  const [loading, setLoading] = useState(false);
  const [clearingChats, setClearingChats] = useState(false);
  const [preferences, setPreferences] = useState<UserPreferences>({
    theme: 'dark',
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
        
        // Apply theme immediately
        applyTheme(data.theme);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load preferences',
        variant: 'destructive',
      });
    }
  };

  const applyTheme = (theme: string) => {
    const root = window.document.documentElement;
    
    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.remove('light', 'dark');
      root.classList.add(systemTheme);
      
      // Apply dimmed effect for system theme
      if (systemTheme === 'dark') {
        root.style.filter = 'brightness(0.9)';
      } else {
        root.style.filter = 'brightness(0.95)';
      }
    } else {
      root.style.filter = '';
      root.classList.remove('light', 'dark');
      root.classList.add(theme);
    }
  };

  const updatePreferences = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user?.id,
          theme: preferences.theme,
          language: preferences.language,
          notifications_enabled: preferences.notifications_enabled,
          email_notifications: preferences.email_notifications,
          auto_save: preferences.auto_save,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      // Apply theme immediately
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
    setClearingChats(true);
    try {
      // Delete all conversations and their messages for the user
      const { error: messagesError } = await supabase
        .from('chat_messages')
        .delete()
        .in('conversation_id', 
          (await supabase
            .from('chat_conversations')
            .select('id')
            .eq('user_id', user?.id)
          ).data?.map(conv => conv.id) || []
        );

      if (messagesError) throw messagesError;

      const { error: conversationsError } = await supabase
        .from('chat_conversations')
        .delete()
        .eq('user_id', user?.id);

      if (conversationsError) throw conversationsError;

      toast({
        title: 'Success',
        description: 'Chat history cleared successfully',
      });
    } catch (error) {
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
    <Card className="w-full max-w-2xl bg-card border-border">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Settings className="h-6 w-6" />
          App Preferences
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
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
                <SelectItem value="system">System (Mixed-Dimmed)</SelectItem>
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

        <div className="space-y-4">
          <div className="flex items-center justify-between space-x-2">
            <div className="space-y-1">
              <Label htmlFor="notifications" className="text-foreground">Enable Notifications</Label>
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

        <div className="space-y-4 pt-4 border-t border-border">
          <div className="space-y-2">
            <Label className="text-foreground">Chat History Management</Label>
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

        <Button
          onClick={updatePreferences}
          disabled={loading}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          {loading ? 'Saving...' : 'Save Preferences'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default AppPreferences;
