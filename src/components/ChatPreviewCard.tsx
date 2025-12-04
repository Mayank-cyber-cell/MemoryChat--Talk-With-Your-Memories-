import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tables } from "@/integrations/supabase/types";
import { MessageSquare, Calendar, Sparkles, Trash2, Archive, ArchiveRestore, Download } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { TagManager } from "@/components/TagManager";
import { useState } from "react";
import { motion } from "framer-motion";
import { exportAsJSON, exportAsText } from "@/lib/exportConversation";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type ChatSession = Tables<"chat_sessions">;

interface ChatPreviewCardProps {
  session: ChatSession;
  onDelete?: (sessionId: string) => void;
  onArchive?: (sessionId: string, archive: boolean) => void;
}

export const ChatPreviewCard = ({ session, onDelete, onArchive }: ChatPreviewCardProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tags, setTags] = useState<string[]>(session.tags || []);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const isArchived = (session as any).is_archived || false;
  
  const personalityTraits = session.personality_traits as Record<string, any> | null;
  const conversationInsights = session.conversation_insights as Record<string, any> | null;

  const handleClick = () => {
    navigate(`/chat?sessionId=${session.id}`);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    onDelete?.(session.id);
  };

  const handleArchiveToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    onArchive?.(session.id, !isArchived);
  };

  const handleExport = async (format: 'json' | 'text') => {
    setIsExporting(true);
    try {
      if (format === 'json') {
        await exportAsJSON(session);
      } else {
        await exportAsText(session);
      }
      toast({
        title: "Exported",
        description: `Conversation exported as ${format.toUpperCase()}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export conversation",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Card 
      onClick={handleClick}
      className="relative glass-effect p-6 rounded-2xl border-border/50 hover:border-primary/50 transition-all duration-500 cursor-pointer group overflow-hidden hover:shadow-2xl hover:shadow-primary/20 hover:-translate-y-1"
    >
      {/* Gradient overlay on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500 gradient-primary pointer-events-none" />
      
      {/* Top gradient line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-secondary to-primary transform scale-x-0 group-hover:scale-x-100 transition-transform duration-700 origin-center" />
      
      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <div className="mb-4">
          <div className="flex items-start justify-between gap-2 mb-3">
            <h3 className="text-xl font-heading font-bold text-foreground group-hover:gradient-primary group-hover:bg-clip-text group-hover:text-transparent transition-all duration-300 line-clamp-2 flex-1">
              {session.session_name}
            </h3>
            <div className="flex items-center gap-1 flex-shrink-0">
              {session.analysis_complete && (
                <motion.div 
                  className="w-2.5 h-2.5 rounded-full bg-primary"
                  animate={{ 
                    scale: [1, 1.3, 1],
                    opacity: [1, 0.7, 1]
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary hover:bg-primary/10"
                    disabled={isExporting}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
                  <DropdownMenuItem onClick={() => handleExport('json')}>
                    Export as JSON
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('text')}>
                    Export as Text
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              {onArchive && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleArchiveToggle}
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary hover:bg-primary/10"
                  title={isArchived ? "Unarchive" : "Archive"}
                >
                  {isArchived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                </Button>
              )}
              {onDelete && (
                <AlertDialog>
                  <AlertDialogTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Conversation</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete "{session.session_name}"? This action cannot be undone and all messages will be permanently removed.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {isDeleting ? "Deleting..." : "Delete"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground group-hover:text-foreground/80 transition-colors">
            <Calendar className="h-4 w-4" />
            <span className="font-medium">
              {formatDistanceToNow(new Date(session.updated_at), { addSuffix: true })}
            </span>
          </div>
        </div>

        {/* Stats Row */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full glass-effect border border-border/30 group-hover:border-primary/30 transition-colors">
            <MessageSquare className="h-4 w-4 text-primary" />
            <span className="text-sm font-bold text-foreground">
              {session.total_messages || 0}
            </span>
            <span className="text-xs text-muted-foreground font-medium">messages</span>
          </div>

          {session.chat_platform && (
            <Badge 
              variant="secondary" 
              className="rounded-full px-4 py-1.5 text-xs font-bold gradient-primary text-primary-foreground border-0 shadow-lg"
            >
              {session.chat_platform}
            </Badge>
          )}
        </div>

        {/* Personality Traits */}
        {personalityTraits && Object.keys(personalityTraits).length > 0 && (
          <div className="mb-4 p-5 rounded-xl glass-effect border border-border/30 group-hover:border-secondary/30 transition-all duration-300">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded-lg bg-secondary/10">
                <Sparkles className="h-4 w-4 text-secondary" />
              </div>
              <span className="text-sm font-bold text-foreground">
                Personality Insights
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(personalityTraits).slice(0, 3).map(([key, value], idx) => (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.1 }}
                >
                  <Badge
                    variant="outline"
                    className="text-xs border-secondary/30 bg-secondary/5 text-foreground hover:bg-secondary/10 transition-colors font-semibold"
                  >
                    {key}: {typeof value === 'string' ? value : JSON.stringify(value).slice(0, 20)}
                  </Badge>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Tags Section */}
        <div className="mb-4 p-5 rounded-xl glass-effect border border-border/30 hover:border-border/50 transition-colors" onClick={(e) => e.stopPropagation()}>
          <TagManager 
            sessionId={session.id} 
            currentTags={tags}
            onTagsUpdate={setTags}
          />
        </div>

        {/* Insights Preview */}
        {conversationInsights && (
          <div className="p-4 rounded-lg bg-muted/5 border border-border/20">
            <p className="text-xs text-muted-foreground line-clamp-2 italic leading-relaxed">
              "{typeof conversationInsights === 'string' 
                ? conversationInsights 
                : Object.values(conversationInsights).join(' • ')
              }"
            </p>
          </div>
        )}

        {/* Analysis Status */}
        {!session.analysis_complete && (
          <div className="mt-4 pt-4 border-t border-border/30 flex items-center gap-3">
            <motion.div 
              className="h-2 w-2 rounded-full bg-secondary"
              animate={{ 
                scale: [1, 1.5, 1],
                opacity: [1, 0.5, 1]
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
            <span className="text-xs text-secondary font-bold">Analyzing conversation...</span>
          </div>
        )}
      </div>

      {/* Bottom gradient indicator */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-secondary to-primary transform scale-x-0 group-hover:scale-x-100 transition-transform duration-700 origin-center rounded-b-2xl" />
    </Card>
  );
};
