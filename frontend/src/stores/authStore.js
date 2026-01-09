import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../services/supabase';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      session: null,
      isAuthenticated: false,
      isLoading: true,
      error: null,
      
      // Initialize auth state listener
      initialize: async () => {
        set({ isLoading: true });
        
        // Get current session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          set({
            user: {
              id: session.user.id,
              email: session.user.email,
              full_name: session.user.user_metadata?.full_name || session.user.user_metadata?.name,
              avatar_url: session.user.user_metadata?.avatar_url,
              role: session.user.user_metadata?.role || null, // null means new user needs role selection
            },
            session,
            isAuthenticated: true,
            isLoading: false,
          });
        } else {
          set({ isLoading: false });
        }
        
        // Listen for auth changes
        supabase.auth.onAuthStateChange((event, session) => {
          if (event === 'SIGNED_IN' && session) {
            set({
              user: {
                id: session.user.id,
                email: session.user.email,
                full_name: session.user.user_metadata?.full_name || session.user.user_metadata?.name,
                avatar_url: session.user.user_metadata?.avatar_url,
                role: session.user.user_metadata?.role || null, // null means new user needs role selection
              },
              session,
              isAuthenticated: true,
              isLoading: false,
            });
          } else if (event === 'SIGNED_OUT') {
            set({
              user: null,
              session: null,
              isAuthenticated: false,
              isLoading: false,
            });
          }
        });
      },
      
      // Google OAuth login
      loginWithGoogle: async () => {
        set({ isLoading: true, error: null });
        
        try {
          const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
              redirectTo: `${window.location.origin}/auth/callback`,
            },
          });
          
          if (error) throw error;
        } catch (error) {
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },
      
      logout: async () => {
        try {
          await supabase.auth.signOut();
          set({ user: null, session: null, isAuthenticated: false });
        } catch (error) {
          console.error('Logout error:', error);
        }
      },
      
      // Update user role
      updateUserRole: async (role) => {
        const { data, error } = await supabase.auth.updateUser({
          data: { role }
        });
        
        if (error) throw error;
        
        set((state) => ({
          user: { ...state.user, role }
        }));
      },
      
      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        // Persist session for token access
        session: state.session,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Initialize auth on app load
if (typeof window !== 'undefined') {
  // Check for existing session on load
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session) {
      useAuthStore.setState({
        user: {
          id: session.user.id,
          email: session.user.email,
          full_name: session.user.user_metadata?.full_name || session.user.user_metadata?.name,
          avatar_url: session.user.user_metadata?.avatar_url,
          role: session.user.user_metadata?.role || null,
        },
        session,
        isAuthenticated: true,
        isLoading: false,
      });
    } else {
      useAuthStore.setState({ isLoading: false });
    }
  });

  // Listen for auth state changes from Supabase
  supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session) {
      useAuthStore.setState({
        user: {
          id: session.user.id,
          email: session.user.email,
          full_name: session.user.user_metadata?.full_name || session.user.user_metadata?.name,
          avatar_url: session.user.user_metadata?.avatar_url,
          role: session.user.user_metadata?.role || null,
        },
        session,
        isAuthenticated: true,
        isLoading: false,
      });
    } else if (event === 'SIGNED_OUT') {
      useAuthStore.setState({ 
        user: null, 
        session: null, 
        isAuthenticated: false,
        isLoading: false,
      });
    } else if (event === 'TOKEN_REFRESHED' && session) {
      // Update the session when token is refreshed
      useAuthStore.setState({ session });
    }
  });
}
