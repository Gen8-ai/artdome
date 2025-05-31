
import React from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  notifications_enabled: boolean;
  email_notifications: boolean;
  auto_save: boolean;
}

interface GeneralSettingsProps {
  preferences: UserPreferences;
  onPreferencesChange: (preferences: UserPreferences) => void;
}

const GeneralSettings: React.FC<GeneralSettingsProps> = ({
  preferences,
  onPreferencesChange
}) => {
  return (
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
            onPreferencesChange({ ...preferences, auto_save: checked })
          }
        />
      </div>
    </div>
  );
};

export default GeneralSettings;
