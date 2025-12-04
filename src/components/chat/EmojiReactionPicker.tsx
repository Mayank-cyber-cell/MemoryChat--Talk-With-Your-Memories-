import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

interface EmojiReactionPickerProps {
  isOpen: boolean;
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

const REACTIONS = ["❤️", "😂", "😮", "😢", "😡", "👍"];

const EmojiReactionPicker = ({ isOpen, onSelect, onClose }: EmojiReactionPickerProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 10 }}
          transition={{ duration: 0.15 }}
          className="absolute bottom-full mb-2 left-0 z-50"
        >
          <div className="bg-card border border-border rounded-full px-2 py-1.5 shadow-lg flex gap-1">
            {REACTIONS.map((emoji) => (
              <motion.button
                key={emoji}
                whileHover={{ scale: 1.3 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  onSelect(emoji);
                  onClose();
                }}
                className="w-8 h-8 flex items-center justify-center text-lg hover:bg-muted rounded-full transition-colors"
              >
                {emoji}
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default EmojiReactionPicker;
