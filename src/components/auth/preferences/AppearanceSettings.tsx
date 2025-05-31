
import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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

interface AppearanceSettingsProps {
  preferences: UserPreferences;
  onPreferencesChange: (preferences: UserPreferences) => void;
}

const AppearanceSettings: React.FC<AppearanceSettingsProps> = ({
  preferences,
  onPreferencesChange
}) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-foreground">Appearance</h3>
      
      <div className="space-y-2">
        <Label htmlFor="theme" className="text-foreground">Theme</Label>
        <Select 
          value={preferences.theme} 
          onValueChange={(value: 'light' | 'dark' | 'system') => 
            onPreferencesChange({ ...preferences, theme: value })
          }
        >
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
        <Select 
          value={preferences.language} 
          onValueChange={(value) => 
            onPreferencesChange({ ...preferences, language: value })
          }
        >
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
  );
};

export default AppearanceSettings;
