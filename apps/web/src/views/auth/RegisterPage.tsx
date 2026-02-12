/**
 * Register Page - Modern glassmorphism design with validation
 */
import { useState, useEffect, type ChangeEvent, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { register, checkRegistrationStatus } from "../../api/auth";
import { useAuth } from "../../context/AuthContext";

interface AuthContextValue {
  login: (email: string, password: string) => Promise<void>;
}

interface RegisterFormData {
  email: string;
  password: string;
  confirmPassword: string;
  username: string;
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const { login } = useAuth() as AuthContextValue;
  const [formData, setFormData] = useState<RegisterFormData>({
    email: "",
    password: "",
    confirmPassword: "",
    username: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [registrationClosed, setRegistrationClosed] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);

  useEffect(() => {
    checkRegistrationStatus().then((status) => {
      setRegistrationClosed(!status.registration_allowed);
      setCheckingStatus(false);
    });
  }, []);

  const checkPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;
    return Math.min(strength, 4);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    if (name === "password") {
      setPasswordStrength(checkPasswordStrength(value));
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (!/[A-Za-z]/.test(formData.password) || !/\d/.test(formData.password)) {
      setError("Password must contain at least one letter and one number");
      return;
    }

    setLoading(true);

    try {
      await register(
        formData.email,
        formData.password,
        formData.username || null,
      );
      // Auto login after registration
      await login(formData.email, formData.password);
      navigate("/nav");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || "Registration failed");
      } else {
        setError("Registration failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const strengthColors = [
    "bg-red-500",
    "bg-orange-500",
    "bg-yellow-500",
    "bg-green-500",
    "bg-accent-primary",
  ];
  const strengthLabels = ["Very Weak", "Weak", "Fair", "Strong", "Very Strong"];

  // Show loading while checking registration status
  if (checkingStatus) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-base">
        <div className="w-12 h-12 border-4 border-accent-primary/30 border-t-accent-primary rounded-full animate-spin" />
      </div>
    );
  }

  // Show closed message if registration is disabled
  if (registrationClosed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0f0d] p-4 font-sans relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] bg-accent-secondary/10 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-1/3 left-1/4 w-[400px] h-[400px] bg-accent-primary/10 rounded-full blur-[100px] animate-pulse delay-1000" />
          <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-[0.03]" />
        </div>

        <div className="relative w-full max-w-md z-10">
          <div className="backdrop-blur-2xl bg-[#0a0f0d]/60 border border-white/10 rounded-3xl shadow-2xl p-8 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />

            <div className="relative z-10">
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.1)]">
                <svg
                  className="w-8 h-8 text-amber-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h1 className="text-2xl font-serif font-bold text-white mb-4 tracking-tight">
                Registration Closed
              </h1>
              <p className="text-white/60 mb-8 text-sm leading-relaxed font-light">
                Public registration is currently disabled. Please contact the
                administrator if you need an account.
              </p>
              <Link
                to="/login"
                className="inline-flex items-center justify-center py-3 px-8 bg-accent-primary text-[#0a0f0d] font-bold uppercase text-xs tracking-widest rounded-xl hover:bg-white transition-all shadow-[0_0_20px_rgba(var(--color-accent-primary-rgb),0.2)] hover:scale-105"
              >
                Back to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0f0d] p-4 font-sans relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] bg-accent-secondary/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/3 left-1/4 w-[400px] h-[400px] bg-accent-primary/10 rounded-full blur-[100px] animate-pulse delay-1000" />
        <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-[0.03]" />
      </div>

      {/* Register Card */}
      <div className="relative w-full max-w-md z-10">
        <div className="backdrop-blur-2xl bg-[#0a0f0d]/60 border border-white/10 rounded-3xl shadow-2xl p-8 md:p-10 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />

          <div className="relative z-10">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-serif font-bold text-white mb-2 tracking-tight">
                Join <span className="text-accent-primary">NCE</span> English
              </h1>
              <p className="text-white/40 text-sm font-light">
                Start your personalized learning journey today.
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-mono uppercase tracking-wide flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                {error}
              </div>
            )}

            {/* Register Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="email"
                  className="block text-[10px] font-bold font-mono text-white/40 uppercase mb-2 ml-1 tracking-widest"
                >
                  Email *
                </label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:border-accent-primary/50 transition-all hover:bg-white/10"
                  placeholder="your@email.com"
                />
              </div>

              <div>
                <label
                  htmlFor="username"
                  className="block text-[10px] font-bold font-mono text-white/40 uppercase mb-2 ml-1 tracking-widest"
                >
                  Username (optional)
                </label>
                <input
                  id="username"
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:border-accent-primary/50 transition-all hover:bg-white/10"
                  placeholder="coollearner"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-[10px] font-bold font-mono text-white/40 uppercase mb-2 ml-1 tracking-widest"
                >
                  Password *
                </label>
                <input
                  id="password"
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:border-accent-primary/50 transition-all hover:bg-white/10"
                  placeholder="Min. 8 characters"
                />
                {/* Password strength indicator */}
                {formData.password && (
                  <div className="mt-3">
                    <div className="flex gap-1 h-1">
                      {[0, 1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className={`flex-1 rounded-full transition-all duration-300 ${
                            i < passwordStrength
                              ? strengthColors[passwordStrength]
                              : "bg-white/5"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-[10px] text-white/40 font-mono mt-2 text-right uppercase tracking-widest">
                      {strengthLabels[passwordStrength]}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-[10px] font-bold font-mono text-white/40 uppercase mb-2 ml-1 tracking-widest"
                >
                  Confirm Password *
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:border-accent-primary/50 transition-all hover:bg-white/10"
                  placeholder="Confirm your password"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 bg-accent-primary text-[#0a0f0d] font-bold uppercase text-sm tracking-widest rounded-xl hover:bg-white focus:outline-none focus:ring-2 focus:ring-accent-primary/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(var(--color-accent-primary-rgb),0.2)] hover:shadow-[0_0_30px_rgba(var(--color-accent-primary-rgb),0.4)] hover:scale-[1.02] active:scale-[0.98]"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="animate-spin h-4 w-4 text-black"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Creating Account...
                  </span>
                ) : (
                  "Create Account"
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center my-8">
              <div className="flex-1 border-t border-white/5" />
              <span className="px-4 text-white/20 text-[10px] uppercase tracking-widest font-mono">
                or
              </span>
              <div className="flex-1 border-t border-white/5" />
            </div>

            {/* Login Link */}
            <p className="text-center text-white/40 text-sm font-light">
              Already have an account?{" "}
              <Link
                to="/login"
                className="text-accent-primary hover:text-white transition-colors font-medium hover:underline decoration-accent-primary/50 underline-offset-4"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
