import React, { useEffect, useState, FormEvent } from "react";
import App from "./App";
import { supabase } from "./lib/supabaseClient";
import { CirclePlay, Mail, Lock, Loader2 } from "lucide-react";

type AppUser = {
  id: string;
  email: string | null;
  fullName?: string | null;
};

const AuthShell: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);

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

    setSubmitting(true);

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
    } finally {
      setSubmitting(false);
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

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900">
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-2xl shadow-purple-500/30 mb-4">
          <CirclePlay className="w-8 h-8 text-white" />
        </div>
        <div className="flex items-center gap-2 text-slate-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading VScor...</span>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900">
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-2xl shadow-purple-500/40 mb-8">
            <CirclePlay className="w-10 h-10 text-white" />
          </div>
          
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">VScor</h1>
            <p className="text-slate-400">Live sports scoring made simple</p>
          </div>

          <div className="w-full max-w-sm">
            <div className="bg-white rounded-3xl shadow-2xl p-6 space-y-5">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-slate-900">Welcome back</h2>
                <p className="text-sm text-slate-500 mt-1">Sign in to continue</p>
              </div>

              {authError && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  {authError}
                </div>
              )}

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      className="w-full rounded-xl bg-slate-50 border border-slate-200 pl-12 pr-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      autoComplete="email"
                      type="email"
                      name="email"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      className="w-full rounded-xl bg-slate-50 border border-slate-200 pl-12 pr-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      type="password"
                      name="password"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold py-3.5 hover:from-purple-700 hover:to-indigo-700 active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-purple-500/25"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign in"
                  )}
                </button>
              </form>
            </div>

            <p className="text-center text-xs text-slate-500 mt-6 px-4">
              By signing in, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <App currentUser={currentUser} onLogout={handleLogout} />;
};

export default AuthShell;
