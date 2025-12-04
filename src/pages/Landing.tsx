import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LogOut, BarChart3 } from "lucide-react";

const Landing = () => {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
  };

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center px-4 relative">
      {/* Top right controls */}
      <div className="fixed top-6 right-6 z-50 flex items-center gap-3">
        <Button
          onClick={handleSignOut}
          variant="outline"
          size="sm"
          className="gap-2 glass-effect border-border/50 hover:border-destructive/50 hover:text-destructive"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
        <ThemeToggle />
      </div>

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
  );
};

export default Landing;
