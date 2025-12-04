import { useState } from "react";
import { Send } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ReplyPreview from "./ReplyPreview";

interface ReplyTo {
  id: number;
  text: string;
  sender: "user" | "ai";
}

interface ChatInputProps {
  onSend: (text: string) => void;
  replyTo?: ReplyTo | null;
  onCancelReply?: () => void;
}

const ChatInput = ({ onSend, replyTo, onCancelReply }: ChatInputProps) => {
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (input.trim()) {
      onSend(input);
      setInput("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="glass-effect border-t border-border">
      <AnimatePresence>
        {replyTo && (
          <ReplyPreview
            text={replyTo.text}
            sender={replyTo.sender === "user" ? "You" : "Them"}
            onCancel={onCancelReply || (() => {})}
          />
        )}
      </AnimatePresence>
      <div className="flex gap-2 p-4 pt-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type a message..."
          className="flex-1 bg-background/50 border-border rounded-2xl"
        />
        <Button
          onClick={handleSend}
          disabled={!input.trim()}
          className="gradient-primary rounded-2xl px-6 hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100"
        >
          <Send className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
};

export default ChatInput;
