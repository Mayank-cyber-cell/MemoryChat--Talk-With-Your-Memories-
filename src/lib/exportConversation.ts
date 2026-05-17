import { apiClient } from "@/lib/api-client";

interface ChatSession {
  id: string;
  session_name: string;
  chat_platform?: string;
  total_messages?: number;
  created_at: string;
  updated_at?: string;
  personality_traits?: Record<string, unknown>;
  conversation_insights?: Record<string, unknown>;
  tags?: string[];
}

export const exportAsJSON = async (session: ChatSession) => {
  const messagesResult = await apiClient.getMessages(session.id);
  const messages = messagesResult.data || [];

  const exportData = {
    session: {
      id: session.id,
      name: session.session_name,
      platform: session.chat_platform,
      totalMessages: session.total_messages,
      createdAt: session.created_at,
      updatedAt: session.updated_at,
      personalityTraits: session.personality_traits,
      conversationInsights: session.conversation_insights,
      tags: session.tags,
    },
    messages: messages.map(m => ({
      sender: m.sender_name,
      text: m.message_text,
      timestamp: m.timestamp,
    })),
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  downloadBlob(blob, `${sanitizeFilename(session.session_name)}.json`);
};

export const exportAsText = async (session: ChatSession) => {
  const messagesResult = await apiClient.getMessages(session.id);
  const messages = messagesResult.data || [];

  let textContent = `Conversation: ${session.session_name}\n`;
  textContent += `Platform: ${session.chat_platform || 'Unknown'}\n`;
  textContent += `Total Messages: ${session.total_messages || 0}\n`;
  textContent += `Exported: ${new Date().toLocaleString()}\n`;
  textContent += `${'='.repeat(50)}\n\n`;

  messages.forEach(m => {
    const timestamp = m.timestamp ? new Date(m.timestamp).toLocaleString() : '';
    textContent += `[${timestamp}] ${m.sender_name}:\n${m.message_text}\n\n`;
  });

  const blob = new Blob([textContent], { type: 'text/plain' });
  downloadBlob(blob, `${sanitizeFilename(session.session_name)}.txt`);
};

const sanitizeFilename = (name: string): string => {
  return name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
};

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
