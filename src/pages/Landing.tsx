import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LogOut, BarChart3, User, Settings as SettingsIcon, Upload, History, Search } from "lucide-react";

const Landing = () => {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
  };

  return (
    <div className="min-h-screen gradient-bg flex flex-col relative">
      {/* Top Navigation Bar */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="fixed top-0 left-0 right-0 z-50 glass-effect border-b border-border/30 backdrop-blur-lg"
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <h2 className="text-xl font-heading font-bold gradient-primary bg-clip-text text-transparent">
              MemoryChat
            </h2>
            <nav className="hidden md:flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/upload")}
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                Upload
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/history")}
                className="gap-2"
              >
                <History className="h-4 w-4" />
                History
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/stats")}
                className="gap-2"
              >
                <BarChart3 className="h-4 w-4" />
                Analytics
              </Button>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 border-border"
            >
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline text-xs">Search...</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/profile")}
              className="relative"
            >
              <User className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/settings")}
            >
              <SettingsIcon className="h-4 w-4" />
            </Button>
            <ThemeToggle />
            <Button
              onClick={handleSignOut}
              variant="outline"
              size="sm"
              className="gap-2 border-border/50 hover:border-destructive/50 hover:text-destructive"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Hero Section */}
      <div className="flex-1 flex items-center justify-center px-4 pt-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center max-w-4xl"
        >
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 1 }}
          className="text-5xl md:text-7xl font-heading font-bold mb-6 text-foreground"
        >
          Talk to your memories.
        </motion.h1>
        
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 1 }}
          className="text-xl md:text-2xl text-muted-foreground mb-12"
        >
          Upload your old chats and let AI bring their words back — softly, safely.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.9, duration: 0.5 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <Button
            onClick={() => navigate("/upload")}
            className="gradient-primary text-lg px-8 py-6 rounded-2xl font-heading font-semibold hover:scale-105 transition-transform shadow-lg"
          >
            Start Now
          </Button>
          <Button
            onClick={() => navigate("/history")}
            variant="outline"
            className="text-lg px-8 py-6 rounded-2xl font-heading font-semibold hover:scale-105 transition-transform border-2 border-primary/30 hover:border-primary"
          >
            View History
          </Button>
          <Button
            onClick={() => navigate("/stats")}
            variant="outline"
            className="text-lg px-8 py-6 rounded-2xl font-heading font-semibold hover:scale-105 transition-transform border-2 border-secondary/30 hover:border-secondary gap-2"
          >
            <BarChart3 className="h-5 w-5" />
            Analytics
          </Button>
        </motion.div>
      </motion.div>
      </div>
    </div>
  );
};

export default Landing;
