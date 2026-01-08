import React, { createContext, useContext, useState, useMemo } from 'react';
import { ToastProvider } from '../components/ui/Toast';

const GlobalContext = createContext(null);

export const GlobalProvider = ({ children }) => {
    // Minimal state - kept for future extensibility
    const [state, setState] = useState({});

    const actions = useMemo(() => ({}), []);

    const contextValue = React.useMemo(() => ({ state, actions }), [state, actions]);

    return (
        <GlobalContext.Provider value={contextValue}>
            <ToastProvider>
                {children}
            </ToastProvider>
        </GlobalContext.Provider>
    );
};

export const useGlobalState = () => {
    const context = useContext(GlobalContext);
    if (!context) {
        throw new Error('useGlobalState must be used within a GlobalProvider');
    }
    return context;
};

