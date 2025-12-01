import React, { useEffect, useState, FormEvent } from "react";
import App from "./App";
import { supabase } from "./lib/supabaseClient";
import { Mail, Lock, Loader2 } from "lucide-react";
import vscorLogo from "./assets/vscor-logo.png";

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
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-purple-50">
        <div className="relative mb-6">
          <img 
            src={vscorLogo} 
            alt="VScor" 
            className="w-28 h-28 object-contain drop-shadow-xl"
          />
        </div>
        <div className="flex items-center gap-3 text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin text-purple-600" />
          <span className="text-base font-medium">Loading...</span>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-50 via-white to-purple-50">
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-16">
          <div className="mb-10">
            <img 
              src={vscorLogo} 
              alt="VScor - Football Management App" 
              className="w-36 h-36 object-contain drop-shadow-xl"
            />
          </div>

          <div className="w-full max-w-sm">
            <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 p-8">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Welcome Back</h2>
                <p className="text-base text-slate-500">Sign in to continue</p>
              </div>

              {authError && (
                <div className="flex items-center gap-3 text-sm text-red-700 bg-red-50 border border-red-100 rounded-2xl px-4 py-4 mb-6">
                  <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              <form onSubmit={handleLoginSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 block">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      className="w-full rounded-2xl bg-slate-50 border border-slate-200 pl-12 pr-4 py-4 text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent focus:bg-white transition-all text-base"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      autoComplete="email"
                      type="email"
                      name="email"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 block">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      className="w-full rounded-2xl bg-slate-50 border border-slate-200 pl-12 pr-4 py-4 text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent focus:bg-white transition-all text-base"
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
                  className="w-full flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-purple-600 to-purple-700 text-white font-semibold py-4 hover:from-purple-700 hover:to-purple-800 active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-purple-500/30 text-base mt-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Signing in...</span>
                    </>
                  ) : (
                    "Sign In"
                  )}
                </button>
              </form>
            </div>

            <p className="text-center text-sm text-slate-400 mt-8 px-4 leading-relaxed">
              By signing in, you agree to our<br />
              <span className="text-purple-600 font-medium">Terms of Service</span> and <span className="text-purple-600 font-medium">Privacy Policy</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <App currentUser={currentUser} onLogout={handleLogout} />;
};

export default AuthShell;
