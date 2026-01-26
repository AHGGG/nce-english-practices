import { authService, authFetch as sharedAuthFetch } from '@nce/api';

export const checkRegistrationStatus = () => authService.checkRegistrationStatus();
export const getAccessToken = () => authService.getAccessToken();
export const setAccessToken = (token, expiresIn) => authService.setAccessToken(token, expiresIn);
export const clearTokens = () => authService.clearTokens();
export const isTokenExpired = () => authService.isTokenExpired();
export const register = (email, password, username) => authService.register(email, password, username);
export const login = (email, password) => authService.login(email, password);
export const refreshAccessToken = () => authService.refreshAccessToken();
export const logout = () => authService.logout();
export const getCurrentUser = () => authService.getCurrentUser();
export const changePassword = (current, newPass) => authService.changePassword(current, newPass);

export const authFetch = sharedAuthFetch;
