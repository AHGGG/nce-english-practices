/**
 * Register Page - Modern glassmorphism design with validation
 */
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register, checkRegistrationStatus } from '../../api/auth';
import { useAuth } from '../../context/AuthContext';

export default function RegisterPage() {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        username: '',
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [passwordStrength, setPasswordStrength] = useState(0);
    const [registrationClosed, setRegistrationClosed] = useState(false);
    const [checkingStatus, setCheckingStatus] = useState(true);

    useEffect(() => {
        checkRegistrationStatus().then(status => {
            setRegistrationClosed(!status.registration_allowed);
            setCheckingStatus(false);
        });
    }, []);

    const checkPasswordStrength = (password) => {
        let strength = 0;
        if (password.length >= 8) strength++;
        if (password.length >= 12) strength++;
        if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
        if (/\d/.test(password)) strength++;
        if (/[^a-zA-Z0-9]/.test(password)) strength++;
        return Math.min(strength, 4);
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
        if (name === 'password') {
            setPasswordStrength(checkPasswordStrength(value));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Validation
        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (formData.password.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }

        if (!/[A-Za-z]/.test(formData.password) || !/\d/.test(formData.password)) {
            setError('Password must contain at least one letter and one number');
            return;
        }

        setLoading(true);

        try {
            await register(
                formData.email,
                formData.password,
                formData.username || null
            );
            // Auto login after registration
            await login(formData.email, formData.password);
            navigate('/nav');
        } catch (err) {
            setError(err.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    const strengthColors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500', 'bg-accent-primary'];
    const strengthLabels = ['Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];

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
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-bg-base via-bg-surface to-bg-base p-4">
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-accent-secondary/10 rounded-full blur-3xl animate-pulse" />
                    <div className="absolute bottom-1/3 left-1/4 w-80 h-80 bg-accent-primary/10 rounded-full blur-3xl animate-pulse delay-1000" />
                </div>

                <div className="relative w-full max-w-md">
                    <div className="backdrop-blur-xl bg-bg-surface/80 border border-border-subtle rounded-2xl shadow-2xl p-8 text-center">
                        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-amber-500/20 flex items-center justify-center">
                            <svg className="w-8 h-8 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <h1 className="text-2xl font-bold text-text-primary mb-4">
                            Registration Closed
                        </h1>
                        <p className="text-text-muted mb-8">
                            Public registration is currently disabled. Please contact the administrator if you need an account.
                        </p>
                        <Link
                            to="/login"
                            className="inline-block py-3 px-6 bg-gradient-to-r from-accent-primary to-accent-secondary text-black font-semibold rounded-xl hover:opacity-90 transition-all"
                        >
                            Back to Login
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-bg-base via-bg-surface to-bg-base p-4">
            {/* Animated background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-accent-secondary/10 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-1/3 left-1/4 w-80 h-80 bg-accent-primary/10 rounded-full blur-3xl animate-pulse delay-1000" />
            </div>

            {/* Register Card */}
            <div className="relative w-full max-w-md">
                <div className="backdrop-blur-xl bg-bg-surface/80 border border-border-subtle rounded-2xl shadow-2xl p-8">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold text-text-primary mb-2">
                            Join <span className="text-accent-primary">NCE</span> English
                        </h1>
                        <p className="text-text-muted">Start your personalized learning journey today.</p>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Register Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-text-secondary mb-2">
                                Email *
                            </label>
                            <input
                                id="email"
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-3 bg-bg-base/50 border border-border-subtle rounded-xl text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary/50 focus:border-accent-primary transition-all"
                                placeholder="your@email.com"
                            />
                        </div>

                        <div>
                            <label htmlFor="username" className="block text-sm font-medium text-text-secondary mb-2">
                                Username (optional)
                            </label>
                            <input
                                id="username"
                                type="text"
                                name="username"
                                value={formData.username}
                                onChange={handleChange}
                                className="w-full px-4 py-3 bg-bg-base/50 border border-border-subtle rounded-xl text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary/50 focus:border-accent-primary transition-all"
                                placeholder="coollearner"
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-text-secondary mb-2">
                                Password *
                            </label>
                            <input
                                id="password"
                                type="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-3 bg-bg-base/50 border border-border-subtle rounded-xl text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary/50 focus:border-accent-primary transition-all"
                                placeholder="Min. 8 characters"
                            />
                            {/* Password strength indicator */}
                            {formData.password && (
                                <div className="mt-2">
                                    <div className="flex gap-1">
                                        {[0, 1, 2, 3].map((i) => (
                                            <div
                                                key={i}
                                                className={`h-1 flex-1 rounded-full transition-all ${i < passwordStrength ? strengthColors[passwordStrength] : 'bg-border-subtle'
                                                    }`}
                                            />
                                        ))}
                                    </div>
                                    <p className="text-xs text-text-muted mt-1">
                                        {strengthLabels[passwordStrength]}
                                    </p>
                                </div>
                            )}
                        </div>

                        <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-text-secondary mb-2">
                                Confirm Password *
                            </label>
                            <input
                                id="confirmPassword"
                                type="password"
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-3 bg-bg-base/50 border border-border-subtle rounded-xl text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary/50 focus:border-accent-primary transition-all"
                                placeholder="Confirm your password"
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
                                    Creating account...
                                </span>
                            ) : (
                                'Create Account'
                            )}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="flex items-center my-6">
                        <div className="flex-1 border-t border-border-subtle" />
                        <span className="px-4 text-text-muted text-sm">or</span>
                        <div className="flex-1 border-t border-border-subtle" />
                    </div>

                    {/* Login Link */}
                    <p className="text-center text-text-secondary">
                        Already have an account?{' '}
                        <Link to="/login" className="text-accent-primary hover:underline font-medium">
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
