import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { SubscriptionStatus, getSubscriptionStatus } from '../services/SubscriptionManager';
import { useAuth } from '../hooks/useAuth';

interface SubscriptionContextType {
    status: SubscriptionStatus | null;
    loading: boolean;
    refreshSubscription: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType>({
    status: null,
    loading: true,
    refreshSubscription: async () => { },
});

export const useSubscription = () => useContext(SubscriptionContext);

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const [status, setStatus] = useState<SubscriptionStatus | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchStatus = async () => {
        if (!user) {
            setStatus(null);
            setLoading(false);
            return;
        }

        try {
            const currentStatus = await getSubscriptionStatus(user.id);
            setStatus(currentStatus);
        } catch (error) {
            console.error('Error fetching subscription status:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStatus();
    }, [user]);

    // Refresh status when app comes to foreground
    useEffect(() => {
        const handleAppStateChange = (nextAppState: AppStateStatus) => {
            if (nextAppState === 'active') {
                fetchStatus();
            }
        };

        const subscription = AppState.addEventListener('change', handleAppStateChange);

        return () => {
            subscription.remove();
        };
    }, [user]);

    const refreshSubscription = async () => {
        setLoading(true);
        await fetchStatus();
    };

    return (
        <SubscriptionContext.Provider value={{ status, loading, refreshSubscription }}>
            {children}
        </SubscriptionContext.Provider>
    );
};
