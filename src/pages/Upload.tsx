import { motion } from "framer-motion";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Upload as UploadIcon, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { ThemeToggle } from "@/components/ThemeToggle";

const chatInputSchema = z.object({
  text: z.string()
    .trim()
    .min(10, { message: "Chat text must be at least 10 characters" })
    .max(500000, { message: "Chat text must be less than 500,000 characters" })
});

const Upload = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isDragging, setIsDragging] = useState(false);
  const [text, setText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      await handleFileSelect(droppedFile);
    }
  };

  const handleFileSelect = async (selectedFile: File) => {
    // Validate file size (max 10MB)
    if (selectedFile.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 10MB",
        variant: "destructive",
      });
      return;
    }

    // Validate file type
    if (!selectedFile.name.match(/\.(txt|log|chat)$/i)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a .txt, .log, or .chat file",
        variant: "destructive",
      });
      return;
    }

    setFile(selectedFile);
    
    try {
      const fileText = await selectedFile.text();
      setText(fileText);
      
      toast({
        title: "File loaded",
        description: `${selectedFile.name} is ready to analyze`,
      });
    } catch (error) {
      toast({
        title: "Error reading file",
        description: "Could not read the file content",
        variant: "destructive",
      });
    }
  };

  const detectPlatform = (chatText: string): "whatsapp" | "telegram" | "manual" => {
    // WhatsApp format: [DD/MM/YY, HH:MM:SS] Name: Message
    const whatsappPattern = /\[\d{1,2}\/\d{1,2}\/\d{2,4},?\s+\d{1,2}:\d{2}/;
    // Telegram format: [DD.MM.YYYY HH:MM:SS] Name: Message
    const telegramPattern = /\[\d{2}\.\d{2}\.\d{4}\s+\d{2}:\d{2}:\d{2}\]/;
    
    if (whatsappPattern.test(chatText)) return "whatsapp";
    if (telegramPattern.test(chatText)) return "telegram";
    return "manual";
  };

  const handleAnalyze = async () => {
    try {
      // Validate input
      const validation = chatInputSchema.safeParse({ text });
      if (!validation.success) {
        toast({
          title: "Invalid input",
          description: validation.error.errors[0].message,
          variant: "destructive",
        });
        return;
      }

      setIsLoading(true);

      const platform = detectPlatform(text);
      
      const { data, error } = await supabase.functions.invoke('parse-chat', {
        body: {
          chatText: text,
          platform: platform,
          filename: file?.name || `${platform}-chat-${Date.now()}.txt`
        }
      });

      if (error) {
        console.error('Parse error:', error);
        throw new Error(error.message || 'Failed to parse chat');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to parse chat');
      }

      toast({
        title: "Chat analyzed!",
        description: `Found ${data.messageCount} messages`,
      });

      // Navigate to loading page with session ID
      navigate(`/loading?sessionId=${data.sessionId}`);
    } catch (error) {
      console.error('Error analyzing chat:', error);
      toast({
        title: "Analysis failed",
        description: error instanceof Error ? error.message : "Could not analyze the chat. Please check the format.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center px-4 py-12 relative">
      {/* Theme Toggle - Fixed position */}
      <div className="fixed top-6 right-6 z-50">
        <ThemeToggle />
      </div>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-2xl"
      >
        <div className="glass-effect rounded-3xl p-8 md:p-12 shadow-2xl">
          <h2 className="text-3xl md:text-4xl font-heading font-bold mb-8 text-center text-foreground">
            Share Your Story
          </h2>

          {/* Drag & Drop Area */}
          <label
            htmlFor="file-upload"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`block border-2 border-dashed rounded-2xl p-12 mb-6 text-center transition-all cursor-pointer ${
              isDragging
                ? "border-primary bg-primary/10 scale-105"
                : "border-border hover:border-primary/50"
            }`}
          >
            <UploadIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              {file ? file.name : "Drag & drop your chat file here"}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              or click to browse (max 10MB)
            </p>
            <input
              id="file-upload"
              type="file"
              accept=".txt,.log,.chat"
              onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
              className="hidden"
            />
          </label>

          {/* Manual Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2 text-foreground">
              Or paste your chat here (WhatsApp/Telegram format)
            </label>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste your conversation here..."
              className="min-h-[150px] bg-background/50 border-border rounded-xl resize-none"
              maxLength={500000}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {text.length.toLocaleString()} / 500,000 characters
            </p>
          </div>

          {/* Analyze Button */}
          <Button
            onClick={handleAnalyze}
            disabled={!text.trim() || isLoading}
            className="w-full gradient-primary py-6 rounded-2xl font-heading font-semibold text-lg hover:scale-105 transition-transform shadow-lg disabled:opacity-50 disabled:hover:scale-100"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              "Analyze Chat"
            )}
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default Upload;
