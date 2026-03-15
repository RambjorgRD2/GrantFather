import React, { useState, useEffect } from 'react';
import { Bell, Mail, Smartphone, Save } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface NotificationSettings {
  email: {
    grantOpportunities: boolean;
    applicationUpdates: boolean;
    teamActivity: boolean;
    systemUpdates: boolean;
  };
  app: {
    grantOpportunities: boolean;
    applicationUpdates: boolean;
    teamActivity: boolean;
    systemUpdates: boolean;
  };
}

const DEFAULT_SETTINGS: NotificationSettings = {
  email: {
    grantOpportunities: true,
    applicationUpdates: true,
    teamActivity: false,
    systemUpdates: true,
  },
  app: {
    grantOpportunities: true,
    applicationUpdates: true,
    teamActivity: true,
    systemUpdates: false,
  },
};

export function NotificationPreferences() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const saved = data.user?.user_metadata?.notification_preferences;
      if (saved) setSettings(saved as NotificationSettings);
    });
  }, []);

  const handleSettingChange = (
    category: 'email' | 'app',
    setting: keyof NotificationSettings['email'],
    value: boolean
  ) => {
    setSettings((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [setting]: value,
      },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.auth.updateUser({
      data: { notification_preferences: settings },
    });
    setSaving(false);
    if (error) {
      toast({ title: 'Save failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Preferences saved', description: 'Your notification preferences have been updated' });
    }
  };

  const notificationTypes = [
    {
      key: 'grantOpportunities' as const,
      title: 'Grant Opportunities',
      description: 'New grant opportunities matching your criteria',
      icon: <Bell className="h-5 w-5" />,
    },
    {
      key: 'applicationUpdates' as const,
      title: 'Application Updates',
      description: 'Status changes and updates on your applications',
      icon: <Mail className="h-5 w-5" />,
    },
    {
      key: 'teamActivity' as const,
      title: 'Team Activity',
      description: 'When team members join, leave, or update applications',
      icon: <Bell className="h-5 w-5" />,
    },
    {
      key: 'systemUpdates' as const,
      title: 'System Updates',
      description: 'Platform updates, maintenance, and new features',
      icon: <Smartphone className="h-5 w-5" />,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-muted-foreground">
          Choose how you want to be notified about important updates
        </p>
      </div>

      <div className="space-y-8">
        {/* Email Notifications */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-lg font-medium text-foreground">
              Email Notifications
            </h3>
          </div>

          <div className="space-y-4 pl-7">
            {notificationTypes.map((type) => (
              <div
                key={`email-${type.key}`}
                className="flex items-center justify-between py-3 border-b border-border last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div className="text-muted-foreground">{type.icon}</div>
                  <div>
                    <Label className="text-sm font-medium text-foreground">
                      {type.title}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {type.description}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={settings.email[type.key]}
                  onCheckedChange={(checked) =>
                    handleSettingChange('email', type.key, checked)
                  }
                />
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* In-App Notifications */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-lg font-medium text-foreground">
              In-App Notifications
            </h3>
          </div>

          <div className="space-y-4 pl-7">
            {notificationTypes.map((type) => (
              <div
                key={`app-${type.key}`}
                className="flex items-center justify-between py-3 border-b border-border last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div className="text-muted-foreground">{type.icon}</div>
                  <div>
                    <Label className="text-sm font-medium text-foreground">
                      {type.title}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {type.description}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={settings.app[type.key]}
                  onCheckedChange={(checked) =>
                    handleSettingChange('app', type.key, checked)
                  }
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-6 border-t border-border">
        <Button onClick={handleSave} className="gap-2" disabled={saving}>
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : 'Save Preferences'}
        </Button>
      </div>
    </div>
  );
}
