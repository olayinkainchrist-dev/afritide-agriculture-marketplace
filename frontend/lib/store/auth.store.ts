import { create } from "zustand";
import { persist } from "zustand/middleware";
import { User } from "@/types";

interface AuthState {
  user:            User | null;
  access_token:    string | null;
  refresh_token:   string | null;
  isAuthenticated: boolean;
  hasHydrated:     boolean;
  setAuth:         (user: User, access_token: string, refresh_token: string) => void;
  updateUser:      (user: User) => void;
  refreshUser:     () => Promise<void>;
  logout:          () => void;
  setHasHydrated:  (state: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user:            null,
      access_token:    null,
      refresh_token:   null,
      isAuthenticated: false,
      hasHydrated:     false,

      setAuth: (user, access_token, refresh_token) => {
        localStorage.setItem("access_token", access_token);
        localStorage.setItem("refresh_token", refresh_token);
        set({ user, access_token, refresh_token, isAuthenticated: true });
      },

      updateUser: (user) => set({ user }),

      refreshUser: async () => {
        const token = get().access_token;
        if (!token) return;
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            if (data.data) set({ user: data.data });
          }
        } catch {
          // silent fail — stale data is acceptable
        }
      },

      logout: () => {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        set({ user: null, access_token: null, refresh_token: null, isAuthenticated: false });
        window.location.href = "/login";
      },

      setHasHydrated: (state) => set({ hasHydrated: state }),
    }),
    {
      name: "afritide-auth",
      partialize: (state) => ({
        user:            state.user,
        access_token:    state.access_token,
        refresh_token:   state.refresh_token,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
        // Refresh user data on every app load
        state?.refreshUser();
      },
    }
  )
);