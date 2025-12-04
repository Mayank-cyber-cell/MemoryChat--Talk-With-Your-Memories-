import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { SmilePlus, Reply } from "lucide-react";
import EmojiReactionPicker from "./EmojiReactionPicker";

interface ReplyTo {
  id: number;
  text: string;
  sender: "user" | "ai";
}

interface ChatBubbleProps {
  text: string;
  sender: "user" | "ai";
  timestamp: Date;
  reactions?: string[];
  replyTo?: ReplyTo | null;
  onReact?: (emoji: string) => void;
  onReply?: () => void;
}

const ChatBubble = ({ text, sender, timestamp, reactions = [], replyTo, onReact, onReply }: ChatBubbleProps) => {
  const isUser = sender === "user";
  const [showPicker, setShowPicker] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleReaction = (emoji: string) => {
    onReact?.(emoji);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: isUser ? 20 : -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setShowPicker(false);
      }}
    >
      <div className="relative">
        <div
          className={`max-w-[75%] md:max-w-[60%] px-4 py-3 rounded-2xl shadow-lg ${
            isUser
              ? "bg-primary text-primary-foreground rounded-br-sm"
              : "bg-card border border-border text-card-foreground rounded-bl-sm"
          }`}
        >
          {replyTo && (
            <div className="mb-2 px-2 py-1 bg-background/30 border-l-2 border-primary/50 rounded-r text-xs">
              <p className="font-medium text-primary/80">{replyTo.sender === "user" ? "You" : "Them"}</p>
              <p className="text-muted-foreground truncate">{replyTo.text}</p>
            </div>
          )}
          <p className="text-sm md:text-base text-inherit">{text}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {timestamp.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>

        {/* Reactions Display */}
        {reactions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`absolute -bottom-3 ${isUser ? "right-2" : "left-2"} flex gap-0.5`}
          >
            <div className="bg-card border border-border rounded-full px-1.5 py-0.5 shadow-sm flex items-center gap-0.5">
              {[...new Set(reactions)].slice(0, 3).map((emoji, idx) => (
                <span key={idx} className="text-sm">
                  {emoji}
                </span>
              ))}
              {reactions.length > 1 && (
                <span className="text-xs text-muted-foreground ml-0.5">
                  {reactions.length}
                </span>
              )}
            </div>
          </motion.div>
        )}

        {/* Reaction Button */}
        <AnimatePresence>
          {isHovered && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className={`absolute top-1/2 -translate-y-1/2 ${
                isUser ? "-left-10" : "-right-10"
              }`}
            >
              <div className="flex gap-1">
                <button
                  onClick={onReply}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-card border border-border shadow-sm hover:bg-muted transition-colors"
                >
                  <Reply className="w-4 h-4 text-muted-foreground" />
                </button>
                <button
                  onClick={() => setShowPicker(!showPicker)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-card border border-border shadow-sm hover:bg-muted transition-colors"
                >
                  <SmilePlus className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
              
              <EmojiReactionPicker
                isOpen={showPicker}
                onSelect={handleReaction}
                onClose={() => setShowPicker(false)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default ChatBubble;
