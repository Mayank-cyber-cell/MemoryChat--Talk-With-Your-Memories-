const API_BASE = 'http://localhost:5000/api';

interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

function getAuthToken(): string | null {
  return localStorage.getItem('auth_token');
}

function setAuthToken(token: string): void {
  localStorage.setItem('auth_token', token);
}

function clearAuthToken(): void {
  localStorage.removeItem('auth_token');
}

async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      return { error: data.error || 'Request failed' };
    }

    return { data };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Network error' };
  }
}

export const apiClient = {
  // Auth
  async signup(email: string, password: string) {
    const result = await apiCall<{ token: string; userId: string }>(
      '/auth/signup',
      {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }
    );

    if (result.data?.token) {
      setAuthToken(result.data.token);
    }

    return result;
  },

  async login(email: string, password: string) {
    const result = await apiCall<{ token: string; userId: string }>(
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }
    );

    if (result.data?.token) {
      setAuthToken(result.data.token);
    }

    return result;
  },

  logout() {
    clearAuthToken();
  },

  // Chat
  async uploadChat(
    chatText: string,
    platform: 'whatsapp' | 'telegram' | 'manual',
    filename?: string
  ) {
    return apiCall<{ sessionId: string; messageCount: number }>(
      '/chat/upload',
      {
        method: 'POST',
        body: JSON.stringify({ chatText, platform, filename }),
      }
    );
  },

  async getSessions() {
    return apiCall<Array<{
      id: string;
      session_name: string;
      chat_platform: string;
      total_messages: number;
      created_at: string;
    }>>('/chat/sessions');
  },

  async getMessages(sessionId: string) {
    return apiCall<Array<{
      id: string;
      sender_name: string;
      message_text: string;
      timestamp: string | null;
      message_order: number;
    }>>(`/chat/sessions/${sessionId}/messages`);
  },

  getAuthToken,
  setAuthToken,
  clearAuthToken,
};
