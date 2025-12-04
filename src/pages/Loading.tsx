import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";

const loadingMessages = [
  "Reading old words…",
  "Understanding tone…",
  "Rebuilding personality…",
  "Preparing your chatroom…",
];

const Loading = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("sessionId");
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const messageInterval = setInterval(() => {
      setMessageIndex((prev) => {
        if (prev < loadingMessages.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 2000);

    const navigateTimeout = setTimeout(() => {
      if (sessionId) {
        navigate(`/chat?sessionId=${sessionId}`);
      } else {
        navigate("/chat");
      }
    }, 8000);

    return () => {
      clearInterval(messageInterval);
      clearTimeout(navigateTimeout);
    };
  }, [navigate, sessionId]);

  return (
    <div className="min-h-screen gradient-bg flex flex-col items-center justify-center px-4 relative">
      {/* Theme Toggle - Fixed position */}
      <div className="fixed top-6 right-6 z-50">
        <ThemeToggle />
      </div>

      {/* Loading Spinner */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full mb-8"
      />

      {/* Loading Messages */}
      <motion.p
        key={messageIndex}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.5 }}
        className="text-xl md:text-2xl text-muted-foreground font-heading"
      >
        {loadingMessages[messageIndex]}
      </motion.p>
    </div>
  );
};

export default Loading;
