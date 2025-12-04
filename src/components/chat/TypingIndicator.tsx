import { motion } from "framer-motion";

const TypingIndicator = () => {
  return (
    <div className="flex justify-start">
      <div className="glass-effect bg-chat-ai/20 px-4 py-3 rounded-2xl rounded-bl-sm">
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{ y: [0, -8, 0] }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                delay: i * 0.2,
              }}
              className="w-2 h-2 bg-muted-foreground rounded-full"
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default TypingIndicator;
