import { motion } from "framer-motion";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Upload as UploadIcon, Loader as Loader2, CircleCheck as CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/lib/api-client";
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
  const [detectedPlatform, setDetectedPlatform] = useState<string | null>(null);

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
    // WhatsApp with brackets: [DD/MM/YY, HH:MM:SS]
    const whatsappBracket = /\[\d{1,2}\/\d{1,2}\/\d{2,4},\s*\d{1,2}:\d{2}/;
    // WhatsApp dash format: DD/MM/YY, HH:MM -
    const whatsappDash = /\d{1,2}\/\d{1,2}\/\d{2,4},\s*\d{1,2}:\d{2}\s*-/;
    // Telegram: [DD.MM.YYYY HH:MM:SS]
    const telegramPattern = /\[\d{2}\.\d{2}\.\d{4}\s+\d{2}:\d{2}:\d{2}\]/;

    if (whatsappBracket.test(chatText) || whatsappDash.test(chatText)) return "whatsapp";
    if (telegramPattern.test(chatText)) return "telegram";
    return "manual";
  };

  const handleAnalyze = async () => {
    try {
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
      const result = await apiClient.uploadChat(
        text,
        platform as 'whatsapp' | 'telegram' | 'manual',
        file?.name || `${platform}-chat-${Date.now()}.txt`
      );

      if (result.error) {
        throw new Error(result.error);
      }

      if (!result.data?.sessionId) {
        throw new Error('No session ID returned');
      }

      toast({
        title: "Chat uploaded!",
        description: `Found ${result.data.messageCount} messages`,
      });

      navigate(`/loading?sessionId=${result.data.sessionId}`);
    } catch (error) {
      console.error('Error uploading chat:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Could not upload the chat. Please check the format.",
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
              onChange={(e) => {
                setText(e.target.value);
                if (e.target.value.trim().length > 20) {
                  setDetectedPlatform(detectPlatform(e.target.value));
                } else {
                  setDetectedPlatform(null);
                }
              }}
              placeholder={`Paste your conversation here...\n\nSupported formats:\n• WhatsApp: [DD/MM/YY, HH:MM] Name: message\n• Telegram: [DD.MM.YYYY HH:MM:SS] Name: message\n• Any "Name: message" format`}
              className="min-h-[160px] bg-background/50 border-border rounded-xl resize-none text-foreground placeholder:text-muted-foreground/60"
              maxLength={500000}
            />
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-muted-foreground">
                {text.length.toLocaleString()} / 500,000 characters
              </p>
              {detectedPlatform && (
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                  <span className="text-xs text-muted-foreground">
                    Detected:{" "}
                    <Badge variant="secondary" className="text-xs py-0 px-2 capitalize">
                      {detectedPlatform}
                    </Badge>
                  </span>
                </div>
              )}
            </div>
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
