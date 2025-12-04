import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { ChatPreviewCard } from "@/components/ChatPreviewCard";
import { ArrowLeft, Search, Filter, X, Calendar, MessageSquare, Sparkles, Archive, ArrowUpDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ChatSession = Tables<"chat_sessions">;

const History = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState<string>("all");
  const [selectedDateRange, setSelectedDateRange] = useState<string>("all");
  const [selectedTag, setSelectedTag] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [sortBy, setSortBy] = useState<string>("date-desc");

  useEffect(() => {
    loadChatSessions();
  }, []);

  const loadChatSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setSessions(data || []);
    } catch (error) {
      console.error('Error loading chat sessions:', error);
      toast({
        title: "Error",
        description: "Failed to load chat history",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Get unique platforms
  const platforms = useMemo(() => {
    const uniquePlatforms = new Set(
      sessions
        .map(s => s.chat_platform)
        .filter((p): p is string => !!p)
    );
    return Array.from(uniquePlatforms);
  }, [sessions]);

  // Get all unique tags
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    sessions.forEach(session => {
      if (session.tags && Array.isArray(session.tags)) {
        session.tags.forEach(tag => tagSet.add(tag));
      }
    });
    return Array.from(tagSet).sort();
  }, [sessions]);

  // Filter sessions
  const filteredSessions = useMemo(() => {
    const filtered = sessions.filter(session => {
      // Archive filter
      const isArchived = (session as any).is_archived || false;
      if (!showArchived && isArchived) return false;
      if (showArchived && !isArchived) return false;

      // Search filter
      const matchesSearch = searchQuery === "" || 
        session.session_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        session.original_filename?.toLowerCase().includes(searchQuery.toLowerCase());

      // Platform filter
      const matchesPlatform = selectedPlatform === "all" || 
        session.chat_platform === selectedPlatform;

      // Tag filter
      const matchesTag = selectedTag === "all" || 
        (session.tags && Array.isArray(session.tags) && session.tags.includes(selectedTag));

      // Date range filter
      let matchesDate = true;
      if (selectedDateRange !== "all") {
        const sessionDate = new Date(session.updated_at);
        const now = new Date();
        const daysDiff = Math.floor((now.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24));
        
        switch (selectedDateRange) {
          case "today":
            matchesDate = daysDiff === 0;
            break;
          case "week":
            matchesDate = daysDiff <= 7;
            break;
          case "month":
            matchesDate = daysDiff <= 30;
            break;
          case "year":
            matchesDate = daysDiff <= 365;
            break;
        }
      }

      return matchesSearch && matchesPlatform && matchesTag && matchesDate;
    });

    // Sort filtered results
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case "date-desc":
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        case "date-asc":
          return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
        case "name-asc":
          return a.session_name.localeCompare(b.session_name);
        case "name-desc":
          return b.session_name.localeCompare(a.session_name);
        case "messages-desc":
          return (b.total_messages || 0) - (a.total_messages || 0);
        case "messages-asc":
          return (a.total_messages || 0) - (b.total_messages || 0);
        default:
          return 0;
      }
    });
  }, [sessions, searchQuery, selectedPlatform, selectedTag, selectedDateRange, showArchived, sortBy]);

  // Calculate stats
  const stats = useMemo(() => {
    const totalMessages = sessions.reduce((sum, s) => sum + (s.total_messages || 0), 0);
    const analyzedCount = sessions.filter(s => s.analysis_complete).length;
    
    return {
      total: sessions.length,
      messages: totalMessages,
      analyzed: analyzedCount,
    };
  }, [sessions]);

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedPlatform("all");
    setSelectedTag("all");
    setSelectedDateRange("all");
    setSortBy("date-desc");
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      // Delete messages first (due to foreign key)
      await supabase
        .from('parsed_messages')
        .delete()
        .eq('session_id', sessionId);
      
      // Then delete the session
      const { error } = await supabase
        .from('chat_sessions')
        .delete()
        .eq('id', sessionId);

      if (error) throw error;

      setSessions(prev => prev.filter(s => s.id !== sessionId));
      toast({
        title: "Deleted",
        description: "Conversation has been removed",
      });
    } catch (error) {
      console.error('Error deleting session:', error);
      toast({
        title: "Error",
        description: "Failed to delete conversation",
        variant: "destructive",
      });
    }
  };

  const handleArchiveSession = async (sessionId: string, archive: boolean) => {
    try {
      const { error } = await supabase
        .from('chat_sessions')
        .update({ is_archived: archive } as any)
        .eq('id', sessionId);

      if (error) throw error;

      setSessions(prev => prev.map(s => 
        s.id === sessionId ? { ...s, is_archived: archive } as any : s
      ));
      toast({
        title: archive ? "Archived" : "Unarchived",
        description: archive ? "Conversation moved to archive" : "Conversation restored",
      });
    } catch (error) {
      console.error('Error archiving session:', error);
      toast({
        title: "Error",
        description: "Failed to update conversation",
        variant: "destructive",
      });
    }
  };

  const hasActiveFilters = searchQuery !== "" || selectedPlatform !== "all" || selectedTag !== "all" || selectedDateRange !== "all" || sortBy !== "date-desc";

  return (
    <div className="min-h-screen chat-gradient-bg px-4 py-8 relative overflow-hidden">
      {/* Theme Toggle - Fixed position */}
      <div className="fixed top-6 right-6 z-50">
        <ThemeToggle />
      </div>

      {/* Animated background elements */}
      <motion.div
        className="absolute top-0 right-0 w-96 h-96 rounded-full bg-primary/10 blur-3xl"
        animate={{
          scale: [1, 1.2, 1],
          x: [0, -50, 0],
          y: [0, 50, 0],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="absolute bottom-0 left-0 w-96 h-96 rounded-full bg-secondary/10 blur-3xl"
        animate={{
          scale: [1.2, 1, 1.2],
          x: [0, 50, 0],
          y: [0, -50, 0],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <motion.div
            whileHover={{ x: -5 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button
              variant="ghost"
              onClick={() => navigate("/")}
              className="mb-6 text-muted-foreground hover:text-foreground hover:bg-primary/5 rounded-xl px-4 py-2 transition-all"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </motion.div>
          
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
            <div>
              <motion.h1 
                className="text-4xl md:text-5xl font-heading font-bold mb-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                <span 
                  style={{
                    background: "linear-gradient(135deg, hsl(280, 79%, 61%), hsl(330, 81%, 60%))",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  Your Conversations
                </span>
              </motion.h1>
              <motion.p 
                className="text-lg text-muted-foreground font-medium"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                {filteredSessions.length} {filteredSessions.length === 1 ? 'conversation' : 'conversations'} found
              </motion.p>
            </div>

            {/* Stats Cards */}
            <motion.div 
              className="flex gap-3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <motion.div whileHover={{ scale: 1.05, y: -5 }} transition={{ type: "spring", stiffness: 400 }}>
                <Card className="glass-effect px-5 py-3 border-border/50 hover:border-primary/30 transition-all shadow-lg hover:shadow-primary/20">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <MessageSquare className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Total</div>
                      <div className="text-2xl font-heading font-bold text-foreground">{stats.total}</div>
                    </div>
                  </div>
                </Card>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05, y: -5 }} transition={{ type: "spring", stiffness: 400 }}>
                <Card className="glass-effect px-5 py-3 border-border/50 hover:border-secondary/30 transition-all shadow-lg hover:shadow-secondary/20">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-secondary/10">
                      <Sparkles className="h-5 w-5 text-secondary" />
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Messages</div>
                      <div className="text-2xl font-heading font-bold text-foreground">{stats.messages.toLocaleString()}</div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            </motion.div>
          </div>

          {/* Search and Filters */}
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search conversations by name or filename..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-24 h-14 glass-effect border-border/50 hover:border-primary/30 focus:border-primary text-foreground placeholder:text-muted-foreground rounded-2xl text-lg transition-all shadow-lg"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
                {hasActiveFilters && (
                  <Badge className="ml-2 h-5 w-5 p-0 flex items-center justify-center rounded-full bg-primary text-primary-foreground">
                    {[searchQuery !== "", selectedPlatform !== "all", selectedTag !== "all", selectedDateRange !== "all", sortBy !== "date-desc"].filter(Boolean).length}
                  </Badge>
                )}
              </Button>
            </div>

            {/* Archive Toggle */}
            <div className="flex items-center gap-4">
              <Button
                variant={showArchived ? "default" : "outline"}
                size="sm"
                onClick={() => setShowArchived(!showArchived)}
                className={showArchived ? "gradient-primary" : "border-border hover:border-primary"}
              >
                <Archive className="h-4 w-4 mr-2" />
                {showArchived ? "Viewing Archived" : "View Archive"}
              </Button>
              {showArchived && (
                <span className="text-sm text-muted-foreground">
                  Showing archived conversations
                </span>
              )}
            </div>

            {/* Filter Panel */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <Card className="glass-effect p-6 border-border rounded-2xl">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                      {/* Platform Filter */}
                      <div>
                        <label className="text-sm font-medium text-foreground mb-2 block">
                          Platform
                        </label>
                        <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
                          <SelectTrigger className="glass-effect border-border bg-background">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-background border-border">
                            <SelectItem value="all">All Platforms</SelectItem>
                            {platforms.map(platform => (
                              <SelectItem key={platform} value={platform}>
                                {platform}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Tag Filter */}
                      <div>
                        <label className="text-sm font-medium text-foreground mb-2 block">
                          Tag
                        </label>
                        <Select value={selectedTag} onValueChange={setSelectedTag}>
                          <SelectTrigger className="glass-effect border-border bg-background">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-background border-border">
                            <SelectItem value="all">All Tags</SelectItem>
                            {allTags.map(tag => (
                              <SelectItem key={tag} value={tag}>
                                {tag}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Date Range Filter */}
                      <div>
                        <label className="text-sm font-medium text-foreground mb-2 block">
                          Date Range
                        </label>
                        <Select value={selectedDateRange} onValueChange={setSelectedDateRange}>
                          <SelectTrigger className="glass-effect border-border bg-background">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-background border-border">
                            <SelectItem value="all">All Time</SelectItem>
                            <SelectItem value="today">Today</SelectItem>
                            <SelectItem value="week">Last 7 Days</SelectItem>
                            <SelectItem value="month">Last 30 Days</SelectItem>
                            <SelectItem value="year">Last Year</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Sort By */}
                      <div>
                        <label className="text-sm font-medium text-foreground mb-2 block">
                          Sort By
                        </label>
                        <Select value={sortBy} onValueChange={setSortBy}>
                          <SelectTrigger className="glass-effect border-border bg-background">
                            <ArrowUpDown className="h-4 w-4 mr-2" />
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-background border-border">
                            <SelectItem value="date-desc">Newest First</SelectItem>
                            <SelectItem value="date-asc">Oldest First</SelectItem>
                            <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                            <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                            <SelectItem value="messages-desc">Most Messages</SelectItem>
                            <SelectItem value="messages-asc">Least Messages</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Clear Filters */}
                      <div className="flex items-end">
                        {hasActiveFilters && (
                          <Button
                            variant="outline"
                            onClick={clearFilters}
                            className="w-full border-border hover:border-destructive hover:text-destructive"
                          >
                            <X className="h-4 w-4 mr-2" />
                            Clear Filters
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Chat Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="glass-effect rounded-2xl p-6 h-80 animate-pulse" />
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="text-center py-16"
          >
            <div className="mb-6">
              <div className="w-24 h-24 mx-auto mb-4 rounded-full gradient-primary flex items-center justify-center">
                <MessageSquare className="h-12 w-12 text-primary-foreground" />
              </div>
              <p className="text-xl text-muted-foreground mb-2">
                No conversations yet
              </p>
              <p className="text-sm text-muted-foreground">
                Start by uploading your first chat to create memories
              </p>
            </div>
            <Button
              onClick={() => navigate("/upload")}
              className="gradient-primary text-lg px-8 py-6 rounded-2xl font-heading font-semibold hover:scale-105 transition-transform shadow-lg"
            >
              Upload Chat
            </Button>
          </motion.div>
        ) : filteredSessions.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="text-center py-16"
          >
            <div className="mb-6">
              <div className="w-24 h-24 mx-auto mb-4 rounded-full glass-effect flex items-center justify-center border-2 border-border">
                <Search className="h-12 w-12 text-muted-foreground" />
              </div>
              <p className="text-xl text-foreground mb-2">
                No conversations found
              </p>
              <p className="text-sm text-muted-foreground">
                Try adjusting your filters or search query
              </p>
            </div>
            <Button
              onClick={clearFilters}
              variant="outline"
              className="border-border hover:border-primary"
            >
              Clear Filters
            </Button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredSessions.map((session, index) => (
                <motion.div
                  key={session.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ 
                    delay: Math.min(index * 0.05, 0.3),
                    duration: 0.3,
                    layout: { duration: 0.3 }
                  }}
                >
                  <ChatPreviewCard 
                    session={session} 
                    onDelete={handleDeleteSession} 
                    onArchive={handleArchiveSession}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};

export default History;
