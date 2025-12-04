import { motion } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import ChatHeader from "@/components/chat/ChatHeader";
import ChatBubble from "@/components/chat/ChatBubble";
import TypingIndicator from "@/components/chat/TypingIndicator";
import ChatInput from "@/components/chat/ChatInput";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/ThemeToggle";

interface ReplyTo {
  id: number;
  text: string;
  sender: "user" | "ai";
}

interface Message {
  id: number;
  text: string;
  sender: "user" | "ai";
  timestamp: Date;
  reactions: string[];
  replyTo?: ReplyTo | null;
}

interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

const Chat = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("sessionId");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [aiPersona, setAiPersona] = useState("Riya");
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  const [replyTo, setReplyTo] = useState<ReplyTo | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (sessionId) {
      loadSession();
    } else {
      // Demo mode without session
      setMessages([
        {
          id: 1,
          text: "Hey... it's been a while.",
          sender: "ai",
          timestamp: new Date(),
          reactions: [],
        },
      ]);
    }
  }, [sessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadSession = async () => {
    if (!sessionId) return;

    try {
      const { data: sessionData, error: sessionError } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (sessionError) throw sessionError;

      const { data: messagesData, error: messagesError } = await supabase
        .from('parsed_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('message_order')
        .limit(5);

      if (messagesError) throw messagesError;

      // Extract AI persona name from first few messages
      const firstSender = messagesData.find(m => m.sender_name !== 'You')?.sender_name || 'Them';
      setAiPersona(firstSender);

      // Set initial AI greeting based on analysis
      const insights = sessionData.conversation_insights as any;
      const greeting = insights?.overall_tone === 'warm' 
        ? "Hey... it's been a while. I've missed this."
        : "Hi. It's strange talking again.";

      setMessages([
        {
          id: 1,
          text: greeting,
          sender: "ai",
          timestamp: new Date(),
          reactions: [],
        },
      ]);

      setConversationHistory([
        { role: "assistant", content: greeting }
      ]);

    } catch (error) {
      console.error('Error loading session:', error);
      toast({
        title: "Could not load chat",
        description: "Starting a demo conversation instead",
        variant: "destructive",
      });
    }
  };

  const handleSendMessage = async (text: string) => {
    const newMessage: Message = {
      id: messages.length + 1,
      text,
      sender: "user",
      timestamp: new Date(),
      reactions: [],
      replyTo: replyTo,
    };
    
    setReplyTo(null);

    setMessages((prev) => [...prev, newMessage]);
    setConversationHistory((prev) => [...prev, { role: "user", content: text }]);
    setIsTyping(true);

    try {
      if (sessionId) {
        // Get AI response based on personality
        const { data, error } = await supabase.functions.invoke('chat-response', {
          body: {
            sessionId,
            userMessage: text,
            conversationHistory: conversationHistory
          }
        });

        if (error) throw error;

        const aiMessage: Message = {
          id: messages.length + 2,
          text: data.response,
          sender: "ai",
          timestamp: new Date(),
          reactions: [],
        };

        setMessages((prev) => [...prev, aiMessage]);
        setConversationHistory((prev) => [...prev, { role: "assistant", content: data.response }]);
      } else {
        // Demo mode - simple response
        setTimeout(() => {
          const aiMessage: Message = {
            id: messages.length + 2,
            text: "I remember that... we used to talk about everything.",
            sender: "ai",
            timestamp: new Date(),
            reactions: [],
          };
          setMessages((prev) => [...prev, aiMessage]);
        }, 1500);
      }
    } catch (error) {
      console.error('Error getting AI response:', error);
      toast({
        title: "Response failed",
        description: "Could not generate a response",
        variant: "destructive",
      });
      
      // Fallback response
      const fallbackMessage: Message = {
        id: messages.length + 2,
        text: "I'm having trouble connecting... but I'm here.",
        sender: "ai",
        timestamp: new Date(),
        reactions: [],
      };
      setMessages((prev) => [...prev, fallbackMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="min-h-screen chat-gradient-bg flex flex-col relative">
      {/* Theme Toggle - Fixed position */}
      <div className="fixed top-6 right-6 z-50">
        <ThemeToggle />
      </div>

      {/* Header */}
      <ChatHeader
        name={aiPersona}
        status={isTyping ? "typing..." : "online"}
        onBack={() => navigate("/memory" + (sessionId ? `?sessionId=${sessionId}` : ""))}
      />

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.map((message, index) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <ChatBubble
              text={message.text}
              sender={message.sender}
              timestamp={message.timestamp}
              reactions={message.reactions}
              replyTo={message.replyTo}
              onReact={(emoji) => {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === message.id
                      ? { ...m, reactions: [...m.reactions, emoji] }
                      : m
                  )
                );
              }}
              onReply={() => setReplyTo({ id: message.id, text: message.text, sender: message.sender })}
            />
          </motion.div>
        ))}

        {isTyping && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <ChatInput 
        onSend={handleSendMessage} 
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
      />

      {/* End Chat Button */}
      <div className="p-4 text-center">
        <Button
          variant="ghost"
          onClick={() => navigate("/memory" + (sessionId ? `?sessionId=${sessionId}` : ""))}
          className="text-muted-foreground hover:text-foreground"
        >
          End Conversation
        </Button>
      </div>
    </div>
  );
};

export default Chat;
