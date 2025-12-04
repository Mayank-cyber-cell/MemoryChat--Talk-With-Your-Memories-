import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { ArrowLeft, MessageSquare, Users, Calendar, TrendingUp, BarChart3 } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { format, subDays, startOfDay, eachDayOfInterval } from "date-fns";

type ChatSession = Tables<"chat_sessions">;
type ParsedMessage = Tables<"parsed_messages">;

const COLORS = ["hsl(280, 79%, 61%)", "hsl(330, 81%, 60%)", "hsl(200, 80%, 55%)", "hsl(150, 70%, 50%)", "hsl(45, 90%, 55%)"];

const Stats = () => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [messages, setMessages] = useState<ParsedMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [sessionsResult, messagesResult] = await Promise.all([
        supabase.from('chat_sessions').select('*').order('created_at', { ascending: false }),
        supabase.from('parsed_messages').select('*').order('created_at', { ascending: false }),
      ]);

      if (sessionsResult.data) setSessions(sessionsResult.data);
      if (messagesResult.data) setMessages(messagesResult.data);
    } catch (error) {
      console.error('Error loading stats data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate overall stats
  const overallStats = useMemo(() => {
    const totalMessages = sessions.reduce((sum, s) => sum + (s.total_messages || 0), 0);
    const totalConversations = sessions.length;
    const analyzedConversations = sessions.filter(s => s.analysis_complete).length;
    const uniqueSenders = new Set(messages.map(m => m.sender_name)).size;
    
    return {
      totalMessages,
      totalConversations,
      analyzedConversations,
      uniqueSenders,
      avgMessagesPerConversation: totalConversations > 0 ? Math.round(totalMessages / totalConversations) : 0,
    };
  }, [sessions, messages]);

  // Message trends over time (last 30 days)
  const messageTrends = useMemo(() => {
    const last30Days = eachDayOfInterval({
      start: subDays(new Date(), 29),
      end: new Date(),
    });

    return last30Days.map(date => {
      const dayStart = startOfDay(date);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const count = messages.filter(m => {
        const msgDate = new Date(m.created_at);
        return msgDate >= dayStart && msgDate < dayEnd;
      }).length;

      return {
        date: format(date, 'MMM dd'),
        messages: count,
      };
    });
  }, [messages]);

  // Platform distribution
  const platformDistribution = useMemo(() => {
    const distribution: Record<string, number> = {};
    sessions.forEach(s => {
      const platform = s.chat_platform || 'Unknown';
      distribution[platform] = (distribution[platform] || 0) + 1;
    });

    return Object.entries(distribution).map(([name, value]) => ({
      name,
      value,
    }));
  }, [sessions]);

  // Top senders by message count
  const topSenders = useMemo(() => {
    const senderCounts: Record<string, number> = {};
    messages.forEach(m => {
      senderCounts[m.sender_name] = (senderCounts[m.sender_name] || 0) + 1;
    });

    return Object.entries(senderCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, messages: count }));
  }, [messages]);

  // Messages by day of week
  const messagesByDayOfWeek = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const counts = new Array(7).fill(0);
    
    messages.forEach(m => {
      const date = new Date(m.timestamp || m.created_at);
      counts[date.getDay()]++;
    });

    return days.map((day, i) => ({ day, messages: counts[i] }));
  }, [messages]);

  if (isLoading) {
    return (
      <div className="min-h-screen chat-gradient-bg flex items-center justify-center">
        <div className="animate-pulse text-foreground">Loading statistics...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen chat-gradient-bg px-4 py-8 relative overflow-hidden">
      {/* Theme Toggle */}
      <div className="fixed top-6 right-6 z-50">
        <ThemeToggle />
      </div>

      {/* Animated background */}
      <motion.div
        className="absolute top-0 right-0 w-96 h-96 rounded-full bg-primary/10 blur-3xl"
        animate={{ scale: [1, 1.2, 1], x: [0, -50, 0], y: [0, 50, 0] }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-0 left-0 w-96 h-96 rounded-full bg-secondary/10 blur-3xl"
        animate={{ scale: [1.2, 1, 1.2], x: [0, 50, 0], y: [0, -50, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="mb-6 text-muted-foreground hover:text-foreground hover:bg-primary/5 rounded-xl"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>

          <h1 className="text-4xl md:text-5xl font-heading font-bold mb-2">
            <span
              style={{
                background: "linear-gradient(135deg, hsl(280, 79%, 61%), hsl(330, 81%, 60%))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Conversation Analytics
            </span>
          </h1>
          <p className="text-lg text-muted-foreground font-medium">
            Insights and trends from your conversations
          </p>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
        >
          <Card className="glass-effect p-5 border-border/50 hover:border-primary/30 transition-all">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <MessageSquare className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground font-semibold uppercase">Total Messages</div>
                <div className="text-2xl font-heading font-bold text-foreground">{overallStats.totalMessages.toLocaleString()}</div>
              </div>
            </div>
          </Card>

          <Card className="glass-effect p-5 border-border/50 hover:border-secondary/30 transition-all">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-secondary/10">
                <Calendar className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground font-semibold uppercase">Conversations</div>
                <div className="text-2xl font-heading font-bold text-foreground">{overallStats.totalConversations}</div>
              </div>
            </div>
          </Card>

          <Card className="glass-effect p-5 border-border/50 hover:border-primary/30 transition-all">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground font-semibold uppercase">Unique Senders</div>
                <div className="text-2xl font-heading font-bold text-foreground">{overallStats.uniqueSenders}</div>
              </div>
            </div>
          </Card>

          <Card className="glass-effect p-5 border-border/50 hover:border-secondary/30 transition-all">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-secondary/10">
                <TrendingUp className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground font-semibold uppercase">Avg/Conversation</div>
                <div className="text-2xl font-heading font-bold text-foreground">{overallStats.avgMessagesPerConversation}</div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Message Trends Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="glass-effect p-6 border-border/50">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-heading font-bold text-foreground">Message Trends (Last 30 Days)</h3>
              </div>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={messageTrends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="date" 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={12}
                      tickLine={false}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={12}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                      labelStyle={{ color: "hsl(var(--foreground))" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="messages"
                      stroke="hsl(280, 79%, 61%)"
                      strokeWidth={2}
                      dot={{ fill: "hsl(280, 79%, 61%)", strokeWidth: 2 }}
                      activeDot={{ r: 6, fill: "hsl(330, 81%, 60%)" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </motion.div>

          {/* Platform Distribution */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="glass-effect p-6 border-border/50">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="h-5 w-5 text-secondary" />
                <h3 className="text-lg font-heading font-bold text-foreground">Platform Distribution</h3>
              </div>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={platformDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={100}
                      dataKey="value"
                    >
                      {platformDistribution.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </motion.div>

          {/* Top Senders */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="glass-effect p-6 border-border/50">
              <div className="flex items-center gap-2 mb-4">
                <Users className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-heading font-bold text-foreground">Top Senders</h3>
              </div>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topSenders} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={12}
                      width={100}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Bar dataKey="messages" fill="hsl(280, 79%, 61%)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </motion.div>

          {/* Messages by Day of Week */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="glass-effect p-6 border-border/50">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="h-5 w-5 text-secondary" />
                <h3 className="text-lg font-heading font-bold text-foreground">Activity by Day of Week</h3>
              </div>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={messagesByDayOfWeek}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Bar dataKey="messages" fill="hsl(330, 81%, 60%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Stats;
