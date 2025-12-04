import { X } from "lucide-react";
import { motion } from "framer-motion";

interface ReplyPreviewProps {
  text: string;
  sender: string;
  onCancel: () => void;
}

const ReplyPreview = ({ text, sender, onCancel }: ReplyPreviewProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="flex items-center gap-2 px-4 py-2 bg-muted/50 border-l-4 border-primary rounded-r-lg mx-4 mb-2"
    >
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-primary">{sender}</p>
        <p className="text-sm text-muted-foreground truncate">{text}</p>
      </div>
      <button
        onClick={onCancel}
        className="p-1 rounded-full hover:bg-muted transition-colors"
      >
        <X className="w-4 h-4 text-muted-foreground" />
      </button>
    </motion.div>
  );
};

export default ReplyPreview;
