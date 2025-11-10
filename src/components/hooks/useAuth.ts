import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/db/supabase.browser.client";
import type { User } from "@supabase/supabase-js";

interface UseAuthReturn {
  user: User | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let supabase: ReturnType<typeof getSupabaseBrowserClient> | null = null;
    try {
      supabase = getSupabaseBrowserClient();
    } catch (err) {
      // If the client cannot be initialized (e.g., missing PUBLIC env vars),
      // gracefully degrade to unauthenticated state so the app can still hydrate.
      console.error("Supabase client initialization failed:", err);
      setCurrentUser(null);
      setIsLoading(false);
      return;
    }

    // Get initial session
    const getInitialSession = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        setCurrentUser(user);
      } catch (error) {
        console.error("Error getting user session:", error);
        setCurrentUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      // Call server endpoint to properly clear session cookies
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to logout");
      }

      // Clear local state
      setCurrentUser(null);

      // Redirect to home page after successful logout
      window.location.href = "/";
    } catch (error) {
      console.error("Error signing out:", error);
      // Still try to redirect even if there's an error
      setCurrentUser(null);
      window.location.href = "/";
      throw error;
    }
  };

  return {
    user: currentUser,
    isLoading,
    signOut,
  };
}
