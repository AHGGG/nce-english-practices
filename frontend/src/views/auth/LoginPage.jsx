/**
 * Login Page - Modern glassmorphism design
 */
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { checkRegistrationStatus } from '../../api/auth';

export default function LoginPage() {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [registrationAllowed, setRegistrationAllowed] = useState(true);

    useEffect(() => {
        checkRegistrationStatus().then(status => {
            setRegistrationAllowed(status.registration_allowed);
        });
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await login(email, password);
            navigate('/nav');
        } catch (err) {
            setError(err.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-bg-base via-bg-surface to-bg-base p-4">
            {/* Animated background elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent-primary/10 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent-secondary/10 rounded-full blur-3xl animate-pulse delay-1000" />
            </div>

            {/* Login Card */}
            <div className="relative w-full max-w-md">
                <div className="backdrop-blur-xl bg-bg-surface/80 border border-border-subtle rounded-2xl shadow-2xl p-8">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold text-text-primary mb-2">
                            <span className="text-accent-primary">NCE</span> English
                        </h1>
                        <p className="text-text-muted">Welcome back! Sign in to continue your learning journey.</p>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Login Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-text-secondary mb-2">
                                Email
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="w-full px-4 py-3 bg-bg-base/50 border border-border-subtle rounded-xl text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary/50 focus:border-accent-primary transition-all"
                                placeholder="your@email.com"
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-text-secondary mb-2">
                                Password
                            </label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="w-full px-4 py-3 bg-bg-base/50 border border-border-subtle rounded-xl text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary/50 focus:border-accent-primary transition-all"
                                placeholder="••••••••"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 px-4 bg-gradient-to-r from-accent-primary to-accent-secondary text-black font-semibold rounded-xl hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-accent-primary/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Signing in...
                                </span>
                            ) : (
                                'Sign In'
                            )}
                        </button>
                    </form>

                    {/* Register Link - Only show if registration is allowed */}
                    {registrationAllowed && (
                        <>
                            <div className="flex items-center my-6">
                                <div className="flex-1 border-t border-border-subtle" />
                                <span className="px-4 text-text-muted text-sm">or</span>
                                <div className="flex-1 border-t border-border-subtle" />
                            </div>

                            <p className="text-center text-text-secondary">
                                Don&apos;t have an account?{' '}
                                <Link to="/register" className="text-accent-primary hover:underline font-medium">
                                    Create one
                                </Link>
                            </p>
                        </>
                    )}
                </div>

                {/* Footer */}
                <p className="text-center text-text-muted text-sm mt-6">
                    Your learning progress is waiting for you
                </p>
            </div>
        </div>
    );
}
