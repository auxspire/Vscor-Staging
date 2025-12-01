// src/AuthShell.tsx
// Supabase-backed auth shell that wraps <App />.
// Handles email/password login and session persistence.

import React, { useEffect, useState, FormEvent } from "react";
import App from "./App";
import { supabase } from "./lib/supabaseClient";

type AppUser = {
  id: string;
  email: string | null;
  fullName?: string | null;
};

const AuthShell: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);

  // Bootstrap session on mount + subscribe to auth changes
  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.error("[AuthShell] getSession error", error);
        }
        if (!isMounted) return;

        const session = data?.session;
        if (session?.user) {
          const u = session.user;
          setCurrentUser({
            id: u.id,
            email: u.email ?? null,
            fullName:
              (u.user_metadata && (u.user_metadata.full_name as string)) ||
              undefined,
          });
        } else {
          setCurrentUser(null);
        }
      } catch (e) {
        console.error("[AuthShell] init error", e);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;

      if (session?.user) {
        const u = session.user;
        setCurrentUser({
          id: u.id,
          email: u.email ?? null,
          fullName:
            (u.user_metadata && (u.user_metadata.full_name as string)) ||
            undefined,
        });
      } else {
        setCurrentUser(null);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleLoginSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setAuthError("Please enter email and password.");
      return;
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      if (error) {
        console.error("[AuthShell] signIn error", error);
        setAuthError(error.message || "Unable to sign in.");
        return;
      }

      const session = data?.session;
      if (session?.user) {
        const u = session.user;
        setCurrentUser({
          id: u.id,
          email: u.email ?? null,
          fullName:
            (u.user_metadata && (u.user_metadata.full_name as string)) ||
            undefined,
        });
      }
    } catch (e: any) {
      console.error("[AuthShell] signIn exception", e);
      setAuthError(e?.message || "Unexpected error during sign in.");
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error("[AuthShell] signOut error", e);
    } finally {
      setCurrentUser(null);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-xs text-slate-400">Loading VScor…</div>
      </div>
    );
  }

  // Not logged in → show email/password form
  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
        <div className="w-full max-w-sm bg-slate-900 rounded-3xl shadow-xl border border-slate-800 p-6 space-y-5">
          <div className="space-y-1.5">
            <p className="text-[11px] uppercase tracking-[0.16em] text-purple-400/80 font-semibold">
              VScor · Access
            </p>
            <h1 className="text-xl font-semibold text-slate-50">
              Sign in to continue
            </h1>
            <p className="text-[11px] text-slate-400">
              Use your VScor account (Supabase auth). For now, create users
              directly in Supabase Auth.
            </p>
          </div>

          {authError && (
            <div className="text-[11px] text-red-300 bg-red-950/60 border border-red-900 rounded-lg px-3 py-2">
              {authError}
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-3">
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-300">
                Email
              </label>
              <input
                className="w-full rounded-2xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-purple-500"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                type="email"
                name="email"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-300">
                Password
              </label>
              <input
                className="w-full rounded-2xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-purple-500"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                type="password"
                name="password"
              />
            </div>

            <button
              type="submit"
              className="w-full mt-2 inline-flex items-center justify-center rounded-2xl bg-purple-600 text-white text-xs font-medium py-2.5 hover:bg-purple-700 transition-colors"
            >
              Sign in
            </button>
          </form>

          <div className="pt-2 border-t border-slate-800">
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Accounts are managed via Supabase Auth. Later we can add
              invite links, Google login, and tournament-scoped roles here.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Logged in → render main app with user + logout handler
  return (
    <div className="relative">
      <div className="absolute top-3 right-3 z-20">
        <button
          onClick={handleLogout}
          className="px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-700 text-[11px] text-slate-100 hover:bg-slate-800 active:bg-slate-950 transition"
        >
          Logout
          {currentUser.email ? ` (${currentUser.email})` : ""}
        </button>
      </div>
      <App currentUser={currentUser} onLogout={handleLogout} />
    </div>
  );
};

export default AuthShell;
