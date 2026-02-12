/**
 * Login Page - Modern glassmorphism design
 */
import { useState, useEffect, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Mail, Lock } from "lucide-react";
import { Input, Button } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import { checkRegistrationStatus } from "../../api/auth";

interface AuthContextValue {
  login: (email: string, password: string) => Promise<void>;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth() as AuthContextValue;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [registrationAllowed, setRegistrationAllowed] = useState(true);

  useEffect(() => {
    checkRegistrationStatus().then((status) => {
      setRegistrationAllowed(status.registration_allowed);
    });
  }, []);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(email, password);
      navigate("/nav");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || "Login failed");
      } else {
        setError("Login failed");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0f0d] p-4 relative overflow-hidden font-sans">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-accent-primary/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-accent-secondary/10 rounded-full blur-[100px] animate-pulse delay-1000" />
        <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-[0.03]" />
      </div>

      {/* Login Card */}
      <div className="relative w-full max-w-md z-10">
        <div className="backdrop-blur-2xl bg-[#0a0f0d]/60 border border-white/10 rounded-3xl shadow-2xl shadow-black/50 p-8 md:p-10 relative overflow-hidden group">
          {/* Subtle gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />

          <div className="relative z-10">
            {/* Header */}
            <div className="text-center mb-10">
              <div className="inline-flex p-3 rounded-2xl bg-accent-primary/10 border border-accent-primary/20 mb-6 shadow-[0_0_20px_rgba(var(--color-accent-primary-rgb),0.1)]">
                <span className="text-2xl font-bold text-accent-primary tracking-tighter">
                  NCE
                </span>
              </div>
              <h1 className="text-3xl font-serif font-bold text-white mb-3 tracking-tight">
                Welcome Back
              </h1>
              <p className="text-white/40 text-sm font-light">
                Sign in to continue your linguistic journey.
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-mono uppercase tracking-wide flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                {error}
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-5">
                <div>
                  <label
                    htmlFor="email"
                    className="block text-[10px] font-bold font-mono text-white/40 uppercase mb-2 ml-1 tracking-widest"
                  >
                    Email Address
                  </label>
                  <Input
                    id="email"
                    type="email"
                    icon={Mail}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="your@email.com"
                    className="bg-white/5 border-white/10 focus:border-accent-primary/50 text-white placeholder:text-white/20 h-12 rounded-xl transition-all hover:bg-white/10"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label
                      htmlFor="password"
                      className="block text-[10px] font-bold font-mono text-white/40 uppercase ml-1 tracking-widest"
                    >
                      Password
                    </label>
                    <button
                      type="button"
                      className="text-[10px] text-accent-primary/80 hover:text-accent-primary transition-colors font-mono uppercase tracking-wider"
                    >
                      Forgot?
                    </button>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    icon={Lock}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="bg-white/5 border-white/10 focus:border-accent-primary/50 text-white placeholder:text-white/20 h-12 rounded-xl transition-all hover:bg-white/10"
                  />
                </div>
              </div>

              <Button
                type="submit"
                isLoading={loading}
                fullWidth
                size="lg"
                className="h-12 bg-accent-primary text-[#0a0f0d] font-bold text-sm uppercase tracking-widest hover:bg-white hover:scale-[1.02] active:scale-[0.98] transition-all rounded-xl shadow-[0_0_20px_rgba(var(--color-accent-primary-rgb),0.2)] hover:shadow-[0_0_30px_rgba(var(--color-accent-primary-rgb),0.4)]"
              >
                Sign In
              </Button>
            </form>

            {/* Register Link - Only show if registration is allowed */}
            {registrationAllowed && (
              <>
                <div className="flex items-center my-8">
                  <div className="flex-1 border-t border-white/5" />
                  <span className="px-4 text-white/20 text-[10px] uppercase tracking-widest font-mono">
                    or
                  </span>
                  <div className="flex-1 border-t border-white/5" />
                </div>

                <p className="text-center text-white/40 text-sm font-light">
                  Don&apos;t have an account?{" "}
                  <Link
                    to="/register"
                    className="text-accent-primary hover:text-white transition-colors font-medium hover:underline decoration-accent-primary/50 underline-offset-4"
                  >
                    Create one now
                  </Link>
                </p>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 space-y-2">
          <p className="text-white/20 text-[10px] font-mono tracking-[0.2em] uppercase">
            NCE English Practice Platform
          </p>
          <p className="text-white/10 text-[10px] font-mono">
            v2.0.0 • SYSTEM_READY
          </p>
        </div>
      </div>
    </div>
  );
}
