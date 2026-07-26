import { create } from 'zustand';
import apiClient from '../services/api';
import { saveTokens, clearTokens, getAccessToken, decodeToken, isTokenExpired } from '../services/storage';
export const useAuthStore = create((set, get) => {
    // Initialize auth state from storage
    const accessToken = getAccessToken();
    const user = accessToken && !isTokenExpired(accessToken)
        ? decodeToken(accessToken)
        : null;
    return {
        // Initial state
        user,
        accessToken,
        refreshToken: null,
        isAuthenticated: !!user,
        isLoading: false,
        // Actions
        login: async (email, password) => {
            set({ isLoading: true });
            try {
                const tokens = await apiClient.login(email, password);
                saveTokens(tokens.access_token, tokens.refresh_token);
                const decoded = decodeToken(tokens.access_token);
                set({
                    user: decoded,
                    accessToken: tokens.access_token,
                    refreshToken: tokens.refresh_token,
                    isAuthenticated: true,
                    isLoading: false,
                });
            }
            catch (error) {
                set({ isLoading: false });
                throw error;
            }
        },
        loginWithGoogle: async (idToken) => {
            set({ isLoading: true });
            try {
                const tokens = await apiClient.loginWithGoogle(idToken);
                saveTokens(tokens.access_token, tokens.refresh_token);
                const decoded = decodeToken(tokens.access_token);
                set({
                    user: decoded,
                    accessToken: tokens.access_token,
                    refreshToken: tokens.refresh_token,
                    isAuthenticated: true,
                    isLoading: false,
                });
            }
            catch (error) {
                set({ isLoading: false });
                throw error;
            }
        },
        logout: async () => {
            set({ isLoading: true });
            try {
                await apiClient.logout();
            }
            finally {
                clearTokens();
                set({
                    user: null,
                    accessToken: null,
                    refreshToken: null,
                    isAuthenticated: false,
                    isLoading: false,
                });
            }
        },
        checkAuth: () => {
            const token = getAccessToken();
            if (!token || isTokenExpired(token)) {
                clearTokens();
                set({
                    user: null,
                    accessToken: null,
                    refreshToken: null,
                    isAuthenticated: false,
                });
                return;
            }
            const decoded = decodeToken(token);
            set({
                user: decoded,
                accessToken: token,
                isAuthenticated: true,
            });
        },
        hasRole: (roles) => {
            const { user } = get();
            if (!user)
                return false;
            const roleArray = Array.isArray(roles) ? roles : [roles];
            return roleArray.includes(user.role);
        },
    };
});
