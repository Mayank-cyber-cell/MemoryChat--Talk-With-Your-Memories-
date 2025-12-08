import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  ArrowLeft,
  User,
  MessageSquare,
  Calendar,
  TrendingUp,
} from "lucide-react";

const Profile = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [stats, setStats] = useState({
    totalConversations: 0,
    totalMessages: 0,
    favoriteCount: 0,
  });

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setUserEmail(user.email || "");

      const { data: preferences } = await supabase
        .from('user_preferences')
        .select('display_name')
        .eq('user_id', user.id)
        .maybeSingle();

      setDisplayName(preferences?.display_name || "");

      const { data: sessions } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('user_id', user.id);

      if (sessions) {
        const totalMessages = sessions.reduce((sum, s) => sum + (s.total_messages || 0), 0);
        const favoriteCount = sessions.filter((s: any) => s.is_favorite).length;

        setStats({
          totalConversations: sessions.length,
          totalMessages,
          favoriteCount,
        });
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen chat-gradient-bg flex items-center justify-center">
        <div className="animate-pulse text-foreground">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen chat-gradient-bg px-4 py-8 relative overflow-hidden">
      <div className="fixed top-6 right-6 z-50">
        <ThemeToggle />
      </div>

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
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <Card className="glass-effect p-8 border-border/50">
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 rounded-full gradient-primary flex items-center justify-center text-4xl font-bold text-white">
                {(displayName || userEmail).charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <h1 className="text-3xl font-bold mb-1">
                  {displayName || "User"}
                </h1>
                <p className="text-muted-foreground">{userEmail}</p>
                <Button
                  onClick={() => navigate("/settings")}
                  variant="outline"
                  size="sm"
                  className="mt-3 border-border"
                >
                  Edit Profile
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="glass-effect p-6 border-border/50">
              <div className="flex items-center gap-3 mb-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                <div className="text-sm text-muted-foreground">Conversations</div>
              </div>
              <div className="text-3xl font-bold">
                {stats.totalConversations}
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="glass-effect p-6 border-border/50">
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="h-5 w-5 text-secondary" />
                <div className="text-sm text-muted-foreground">Total Messages</div>
              </div>
              <div className="text-3xl font-bold">
                {stats.totalMessages.toLocaleString()}
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="glass-effect p-6 border-border/50">
              <div className="flex items-center gap-3 mb-2">
                <Badge className="w-fit">Favorites</Badge>
              </div>
              <div className="text-3xl font-bold">
                {stats.favoriteCount}
              </div>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
