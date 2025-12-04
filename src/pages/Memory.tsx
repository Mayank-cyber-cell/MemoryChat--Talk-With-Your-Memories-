import { motion } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { MessageSquare, Sparkles, Calendar } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

const Memory = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("sessionId");
  const [messageCount, setMessageCount] = useState(47);

  useEffect(() => {
    if (sessionId) {
      loadSessionStats();
    }
  }, [sessionId]);

  const loadSessionStats = async () => {
    if (!sessionId) return;

    try {
      const { data, error } = await supabase
        .from('chat_sessions')
        .select('total_messages')
        .eq('id', sessionId)
        .single();

      if (error) throw error;
      setMessageCount(data.total_messages);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  return (
    <div className="min-h-screen chat-gradient-bg flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Theme Toggle - Fixed position */}
      <div className="fixed top-6 right-6 z-50">
        <ThemeToggle />
      </div>

      {/* Animated background orbs */}
      <motion.div
        className="absolute top-20 left-10 w-72 h-72 rounded-full bg-primary/20 blur-3xl"
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.2, 0.4, 0.2],
          x: [0, 50, 0],
          y: [0, 30, 0],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="absolute bottom-20 right-10 w-96 h-96 rounded-full bg-secondary/20 blur-3xl"
        animate={{
          scale: [1.2, 1, 1.2],
          opacity: [0.3, 0.5, 0.3],
          x: [0, -40, 0],
          y: [0, -50, 0],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-2xl text-center relative z-10"
      >
        {/* Decorative icon */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ 
            delay: 0.2, 
            duration: 0.8,
            type: "spring",
            stiffness: 200 
          }}
          className="w-20 h-20 mx-auto mb-8 rounded-2xl gradient-primary flex items-center justify-center shadow-2xl"
        >
          <motion.div
            animate={{ 
              rotate: [0, 10, -10, 0],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <MessageSquare className="h-10 w-10 text-primary-foreground" />
          </motion.div>
        </motion.div>

        {/* Quote */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="text-2xl md:text-3xl font-heading italic text-foreground/80 mb-12 leading-relaxed"
        >
          "Some conversations never really end — <br className="hidden md:block" />
          <span className="gradient-primary bg-clip-text text-transparent font-semibold">
            they just change form.
          </span>"
        </motion.p>

        {/* Stats Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6, type: "spring", stiffness: 200 }}
          whileHover={{ scale: 1.02 }}
        >
          <Card className="glass-effect p-10 mb-8 border-border/50 rounded-3xl shadow-2xl hover:shadow-primary/20 transition-all duration-500">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              <p className="text-sm uppercase tracking-wider text-muted-foreground mb-3 font-semibold">
                Total Messages
              </p>
              <motion.p 
                className="text-7xl font-heading font-bold gradient-primary bg-clip-text text-transparent mb-2"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 1, type: "spring", stiffness: 300 }}
              >
                {messageCount}
              </motion.p>
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span>Memories preserved</span>
              </div>
            </motion.div>
          </Card>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.6 }}
          className="space-y-4"
        >
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button
              className="w-full gradient-primary py-7 rounded-2xl font-heading font-bold text-lg shadow-2xl shadow-primary/30 hover:shadow-primary/50 transition-all duration-300 border border-primary/20"
              onClick={() => navigate("/")}
            >
              <Sparkles className="mr-2 h-5 w-5" />
              Save Memory
            </Button>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button
              variant="outline"
              className="w-full py-7 rounded-2xl font-heading font-semibold text-lg border-2 border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all duration-300 backdrop-blur-sm"
              onClick={() => navigate("/upload")}
            >
              <Calendar className="mr-2 h-5 w-5" />
              Start Over
            </Button>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button
              variant="ghost"
              className="w-full py-7 rounded-2xl font-heading font-semibold text-lg hover:bg-secondary/10 hover:text-secondary transition-all duration-300"
              onClick={() => navigate("/chat" + (sessionId ? `?sessionId=${sessionId}` : ""))}
            >
              <MessageSquare className="mr-2 h-5 w-5" />
              Continue Chat
            </Button>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Memory;
