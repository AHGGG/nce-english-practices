/**
 * Login Page - Modern glassmorphism design
 */
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Mail, Lock } from "lucide-react";
import { Input, Button } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import { checkRegistrationStatus } from "../../api/auth";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(email, password);
      navigate("/nav");
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-base p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-accent-primary/5 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-accent-secondary/5 rounded-full blur-[100px] animate-pulse delay-1000" />
        <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-[0.03]" />
      </div>

      {/* Login Card */}
      <div className="relative w-full max-w-md z-10">
        <div className="backdrop-blur-xl bg-white/[0.02] border border-white/10 rounded-3xl shadow-2xl p-8 md:p-10">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex p-3 rounded-2xl bg-gradient-to-br from-accent-primary/20 to-accent-secondary/20 mb-6 border border-white/10 shadow-lg shadow-accent-primary/10">
              <span className="text-2xl font-bold text-accent-primary">
                NCE
              </span>
            </div>
            <h1 className="text-3xl font-serif font-bold text-white mb-3 tracking-tight">
              Welcome Back
            </h1>
            <p className="text-white/50 text-sm">
              Sign in to continue your linguistic journey.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
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
                  className="bg-white/5 border-white/10 focus:border-accent-primary/50 text-white placeholder:text-white/20"
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
                    className="text-[10px] text-accent-primary hover:text-white transition-colors"
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
                  className="bg-white/5 border-white/10 focus:border-accent-primary/50 text-white placeholder:text-white/20"
                />
              </div>
            </div>

            <Button
              type="submit"
              isLoading={loading}
              fullWidth
              size="lg"
              className="h-12 bg-accent-primary text-black font-bold text-sm uppercase tracking-widest hover:bg-accent-primary/90 hover:scale-[1.02] active:scale-[0.98] transition-all rounded-xl shadow-[0_0_20px_rgba(var(--color-accent-primary-rgb),0.3)] hover:shadow-[0_0_30px_rgba(var(--color-accent-primary-rgb),0.5)]"
            >
              Sign In
            </Button>
          </form>

          {/* Register Link - Only show if registration is allowed */}
          {registrationAllowed && (
            <>
              <div className="flex items-center my-8">
                <div className="flex-1 border-t border-white/5" />
                <span className="px-4 text-white/20 text-xs uppercase tracking-widest">
                  or
                </span>
                <div className="flex-1 border-t border-white/5" />
              </div>

              <p className="text-center text-white/40 text-sm">
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

        {/* Footer */}
        <p className="text-center text-white/20 text-xs mt-8 font-mono tracking-widest">
          NCE ENGLISH PRACTICE PLATFORM
        </p>
      </div>
    </div>
  );
}
