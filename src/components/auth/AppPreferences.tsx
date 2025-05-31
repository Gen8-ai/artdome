
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/hooks/useTheme';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { Settings } from 'lucide-react';
import { UserPreferences } from '@/types/preferences';
import AppearanceSettings from './preferences/AppearanceSettings';
import NotificationSettings from './preferences/NotificationSettings';
import GeneralSettings from './preferences/GeneralSettings';
import DataManagement from './preferences/DataManagement';

const AppPreferences = () => {
  const { user } = useAuth();
  const { theme, applyTheme } = useTheme();
  const { preferences: dbPreferences, isLoading, updatePreferences } = useUserPreferences();
  const [preferences, setPreferences] = useState<UserPreferences>({
    theme: theme,
    language: 'en',
    notifications_enabled: true,
    email_notifications: true,
    auto_save: true,
  });

  // Update local preferences when database preferences are loaded
  useEffect(() => {
    if (dbPreferences) {
      setPreferences({
        theme: (dbPreferences.theme as 'light' | 'dark' | 'system') || theme,
        language: dbPreferences.language || 'en',
        notifications_enabled: dbPreferences.notifications_enabled ?? true,
        email_notifications: dbPreferences.email_notifications ?? true,
        auto_save: dbPreferences.auto_save ?? true,
      });
    }
  }, [dbPreferences, theme]);

  const handleSavePreferences = async () => {
    if (!user) return;
    
    try {
      // Use the useUserPreferences hook to update preferences
      await updatePreferences.mutateAsync({
        theme: preferences.theme,
        language: preferences.language,
        notifications_enabled: preferences.notifications_enabled,
        email_notifications: preferences.email_notifications,
        auto_save: preferences.auto_save,
      });

      // Only apply theme when user explicitly saves preferences
      applyTheme(preferences.theme);

      // Request notification permission if enabled
      if (preferences.notifications_enabled && 'Notification' in window) {
        if (Notification.permission === 'default') {
          await Notification.requestPermission();
        }
      }
    } catch (error) {
      console.error('Error updating preferences:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full max-w-2xl mx-auto">
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="text-center">Loading preferences...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

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
          <AppearanceSettings 
            preferences={preferences}
            onPreferencesChange={setPreferences}
          />

          <NotificationSettings 
            preferences={preferences}
            onPreferencesChange={setPreferences}
          />

          <GeneralSettings 
            preferences={preferences}
            onPreferencesChange={setPreferences}
          />

          <DataManagement />

          {/* Save Button */}
          <Button
            onClick={handleSavePreferences}
            disabled={updatePreferences.isPending}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {updatePreferences.isPending ? 'Saving...' : 'Save Preferences'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AppPreferences;
