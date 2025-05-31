
import React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Bell } from 'lucide-react';

interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  notifications_enabled: boolean;
  email_notifications: boolean;
  auto_save: boolean;
}

interface NotificationSettingsProps {
  preferences: UserPreferences;
  onPreferencesChange: (preferences: UserPreferences) => void;
}

const NotificationSettings: React.FC<NotificationSettingsProps> = ({
  preferences,
  onPreferencesChange
}) => {
  const { toast } = useToast();

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
              onPreferencesChange({ ...preferences, notifications_enabled: checked })
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
            onPreferencesChange({ ...preferences, email_notifications: checked })
          }
        />
      </div>
    </div>
  );
};

export default NotificationSettings;
