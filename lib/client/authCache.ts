import { getElectronAPI } from './runtime';

export interface AuthCacheTokens {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  user_id: string;
}

interface SessionLike {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  user: { id: string };
}

export function isAuthCacheAvailable(): boolean {
  return Boolean(getElectronAPI());
}

export async function loadCachedAuthTokens(): Promise<AuthCacheTokens | null> {
  const electronAPI = getElectronAPI();
  if (!electronAPI?.loadAuthCache) {
    return null;
  }

  return electronAPI.loadAuthCache();
}

export async function saveSessionToAuthCache(session: SessionLike): Promise<boolean> {
  const electronAPI = getElectronAPI();
  if (!electronAPI?.saveAuthCache) {
    return false;
  }

  await electronAPI.saveAuthCache({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: session.expires_at,
    user_id: session.user.id,
  });

  return true;
}

export async function clearCachedAuthTokens(): Promise<boolean> {
  const electronAPI = getElectronAPI();
  if (!electronAPI?.clearAuthCache) {
    return false;
  }

  await electronAPI.clearAuthCache();
  return true;
}
