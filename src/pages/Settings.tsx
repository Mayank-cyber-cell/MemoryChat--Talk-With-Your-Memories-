import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ArrowLeft, User, Bell, Save, Zap } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const Settings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState({
    display_name: "",
    notifications_enabled: true,
    auto_save_enabled: true,
    ai_response_speed: "balanced",
  });

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setPreferences({
          display_name: data.display_name || "",
          notifications_enabled: data.notifications_enabled ?? true,
          auto_save_enabled: data.auto_save_enabled ?? true,
          ai_response_speed: data.ai_response_speed || "balanced",
        });
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          ...preferences,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      toast({
        title: "Settings saved",
        description: "Your preferences have been updated",
      });
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen chat-gradient-bg flex items-center justify-center">
        <div className="animate-pulse text-foreground">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen chat-gradient-bg px-4 py-8 relative overflow-hidden">
      <div className="fixed top-6 right-6 z-50">
        <ThemeToggle />
      </div>

      <motion.div
        className="absolute top-0 right-0 w-96 h-96 rounded-full bg-primary/10 blur-3xl"
        animate={{ scale: [1, 1.2, 1], x: [0, -50, 0] }}
        transition={{ duration: 15, repeat: Infinity }}
      />

      <div className="max-w-4xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="mb-6 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>

          <h1 className="text-4xl font-bold mb-2">Settings</h1>
          <p className="text-lg text-muted-foreground mb-8">
            Customize your experience
          </p>
        </motion.div>

        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="glass-effect p-6 border-border/50">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-primary/10">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-xl font-bold">Profile</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium mb-2 block">
                    Display Name
                  </Label>
                  <Input
                    value={preferences.display_name}
                    onChange={(e) => setPreferences({ ...preferences, display_name: e.target.value })}
                    placeholder="Enter your name"
                    className="glass-effect border-border"
                  />
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="glass-effect p-6 border-border/50">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-secondary/10">
                  <Zap className="h-5 w-5 text-secondary" />
                </div>
                <h2 className="text-xl font-bold">AI Behavior</h2>
              </div>

              <div>
                <Label className="text-sm font-medium mb-2 block">
                  Response Speed
                </Label>
                <Select
                  value={preferences.ai_response_speed}
                  onValueChange={(value) => setPreferences({ ...preferences, ai_response_speed: value })}
                >
                  <SelectTrigger className="glass-effect border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fast">Fast</SelectItem>
                    <SelectItem value="balanced">Balanced</SelectItem>
                    <SelectItem value="thoughtful">Thoughtful</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="glass-effect p-6 border-border/50">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Bell className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-xl font-bold">Preferences</h2>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Notifications</Label>
                    <p className="text-xs text-muted-foreground">
                      Receive notifications when AI responds
                    </p>
                  </div>
                  <Switch
                    checked={preferences.notifications_enabled}
                    onCheckedChange={(checked) =>
                      setPreferences({ ...preferences, notifications_enabled: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Auto-save</Label>
                    <p className="text-xs text-muted-foreground">
                      Automatically save your chats
                    </p>
                  </div>
                  <Switch
                    checked={preferences.auto_save_enabled}
                    onCheckedChange={(checked) =>
                      setPreferences({ ...preferences, auto_save_enabled: checked })
                    }
                  />
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex justify-end gap-3"
          >
            <Button
              variant="outline"
              onClick={() => navigate("/")}
              className="border-border"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="gradient-primary"
            >
              {saving ? "Saving..." : "Save"}
            </Button>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
