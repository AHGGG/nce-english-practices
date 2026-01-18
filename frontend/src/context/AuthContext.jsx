/**
 * Authentication Context - Provides user authentication state
 */
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getCurrentUser, logout as apiLogout, login as apiLogin } from '../api/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Check authentication on mount
    useEffect(() => {
        async function checkAuth() {
            try {
                const userData = await getCurrentUser();
                setUser(userData);
            } catch (err) {
                console.error('Auth check failed:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }
        checkAuth();
    }, []);

    // Listen for session expiration events from axios client
    useEffect(() => {
        const handleSessionExpired = () => {
            console.warn('Session expired, logging out...');
            setUser(null);
            setError('Your session has expired. Please log in again.');
        };

        window.addEventListener('auth:session-expired', handleSessionExpired);
        return () => {
            window.removeEventListener('auth:session-expired', handleSessionExpired);
        };
    }, []);

    const login = useCallback(async (email, password) => {
        setError(null);
        try {
            await apiLogin(email, password);
            const userData = await getCurrentUser();
            setUser(userData);
            return userData;
        } catch (err) {
            setError(err.message);
            throw err;
        }
    }, []);

    const logout = useCallback(async () => {
        try {
            await apiLogout();
        } finally {
            setUser(null);
        }
    }, []);

    const value = {
        user,
        loading,
        error,
        isAuthenticated: !!user,
        login,
        logout,
        setUser,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
}
