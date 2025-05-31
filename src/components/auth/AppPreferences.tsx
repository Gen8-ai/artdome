
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Settings } from 'lucide-react';

interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  notifications_enabled: boolean;
  email_notifications: boolean;
  auto_save: boolean;
}

const AppPreferences = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
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
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load preferences',
        variant: 'destructive',
      });
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

  return (
    <Card className="w-full max-w-2xl backdrop-blur-xl bg-white/10 border-white/20">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-white flex items-center gap-2">
          <Settings className="h-6 w-6" />
          App Preferences
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="theme" className="text-white">Theme</Label>
            <Select value={preferences.theme} onValueChange={(value: 'light' | 'dark' | 'system') => 
              setPreferences({ ...preferences, theme: value })
            }>
              <SelectTrigger className="bg-white/10 border-white/20 text-white">
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
            <Label htmlFor="language" className="text-white">Language</Label>
            <Select value={preferences.language} onValueChange={(value) => 
              setPreferences({ ...preferences, language: value })
            }>
              <SelectTrigger className="bg-white/10 border-white/20 text-white">
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="es">Spanish</SelectItem>
                <SelectItem value="fr">French</SelectItem>
                <SelectItem value="de">German</SelectItem>
                <SelectItem value="it">Italian</SelectItem>
                <SelectItem value="pt">Portuguese</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between space-x-2">
            <div className="space-y-1">
              <Label htmlFor="notifications" className="text-white">Enable Notifications</Label>
              <p className="text-sm text-white/60">Receive push notifications for updates</p>
            </div>
            <Switch
              id="notifications"
              checked={preferences.notifications_enabled}
              onCheckedChange={(checked) => 
                setPreferences({ ...preferences, notifications_enabled: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between space-x-2">
            <div className="space-y-1">
              <Label htmlFor="email-notifications" className="text-white">Email Notifications</Label>
              <p className="text-sm text-white/60">Receive notifications via email</p>
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
              <Label htmlFor="auto-save" className="text-white">Auto Save</Label>
              <p className="text-sm text-white/60">Automatically save your work</p>
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

        <Button
          onClick={updatePreferences}
          disabled={loading}
          className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
        >
          {loading ? 'Saving...' : 'Save Preferences'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default AppPreferences;
