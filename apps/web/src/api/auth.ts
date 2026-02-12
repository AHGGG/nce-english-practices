import {
  authService,
  authFetch as sharedAuthFetch,
  apiGet as sharedApiGet,
  apiPost as sharedApiPost,
  apiPut as sharedApiPut,
  apiDelete as sharedApiDelete,
  apiPatch as sharedApiPatch,
  ApiError,
} from "@nce/api";

export const checkRegistrationStatus =
  authService.checkRegistrationStatus.bind(authService);
export const getAccessToken = authService.getAccessToken.bind(authService);
export const setAccessToken = authService.setAccessToken.bind(authService);
export const clearTokens = authService.clearTokens.bind(authService);
export const isTokenExpired = authService.isTokenExpired.bind(authService);
export const register = authService.register.bind(authService);
export const login = authService.login.bind(authService);
export const refreshAccessToken =
  authService.refreshAccessToken.bind(authService);
export const logout = authService.logout.bind(authService);
export const getCurrentUser = authService.getCurrentUser.bind(authService);
export const changePassword = authService.changePassword.bind(authService);

// Low-level fetch (for streaming, special cases)
export const authFetch = sharedAuthFetch;

// Convenience methods (recommended for most use cases)
export const apiGet = sharedApiGet;
export const apiPost = sharedApiPost;
export const apiPut = sharedApiPut;
export const apiDelete = sharedApiDelete;
export const apiPatch = sharedApiPatch;

// Error class
export { ApiError };
