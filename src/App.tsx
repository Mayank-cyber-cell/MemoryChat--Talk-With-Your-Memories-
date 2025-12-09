import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { ThemeProvider } from "@/components/ThemeProvider";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Upload from "./pages/Upload";
import Loading from "./pages/Loading";
import Chat from "./pages/Chat";
import Memory from "./pages/Memory";
import History from "./pages/History";
import Stats from "./pages/Stats";
import Settings from "./pages/Settings";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children, session }: { children: React.ReactNode; session: Session | null }) => {
  if (!session) {
    return <Navigate to="/auth" replace />;
  }
  return <>{children}</>;
};

const App = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/auth" element={session ? <Navigate to="/" replace /> : <Auth />} />
              <Route path="/" element={<ProtectedRoute session={session}><Landing /></ProtectedRoute>} />
              <Route path="/upload" element={<ProtectedRoute session={session}><Upload /></ProtectedRoute>} />
              <Route path="/loading" element={<ProtectedRoute session={session}><Loading /></ProtectedRoute>} />
              <Route path="/chat" element={<ProtectedRoute session={session}><Chat /></ProtectedRoute>} />
              <Route path="/memory" element={<ProtectedRoute session={session}><Memory /></ProtectedRoute>} />
              <Route path="/history" element={<ProtectedRoute session={session}><History /></ProtectedRoute>} />
              <Route path="/stats" element={<ProtectedRoute session={session}><Stats /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute session={session}><Settings /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute session={session}><Profile /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
};

export default App;
