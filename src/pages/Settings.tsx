import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';

export default function Settings() {
  return (
    <MainLayout>
      <div className="flex-1 p-8 space-y-8 overflow-y-auto">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground text-lg">
            Manage your account and preferences.
          </p>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>
                Customize how the workspace looks on your device.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Dark Mode</Label>
                  <div className="text-sm text-muted-foreground">
                    Switch between light and dark themes.
                  </div>
                </div>
                <Switch
                  checked={document.documentElement.classList.contains('dark')}
                  onCheckedChange={() => document.documentElement.classList.toggle('dark')}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>
                Configure how you receive alerts.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                 <div className="space-y-0.5">
                  <Label>Email Notifications</Label>
                  <div className="text-sm text-muted-foreground">
                    Receive emails about project updates.
                  </div>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>

           <div className="flex justify-end">
              <Button>Save Changes</Button>
           </div>
        </div>
      </div>
    </MainLayout>
  );
}
