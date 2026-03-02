/**
 * Unified API Client for Web and Desktop
 * 
 * - Web: Uses cookie-based authentication (same-origin)
 * - Desktop: Uses token-based authentication (direct API calls)
 * 
 * This eliminates the need for API proxying in the desktop app.
 */

const API_BASE = process.env.NEXT_PUBLIC_APP_URL || 'https://www.jobelix.fr';

interface Session {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  user: {
    id: string;
    email?: string;
  };
}

/**
 * Unified API client for web (cookies) and desktop (tokens)
 */
export class ApiClient {
  private isElectron: boolean;
  
  constructor() {
    // Detect if running in Electron
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;
  }
  
  /**
   * Get current session (desktop only)
   */
  private async getSession(): Promise<Session | null> {
    if (!this.isElectron) return null;
    
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const session = await (window as any).electronAPI.getSession();
      return session;
    } catch (error) {
      console.error('[ApiClient] Failed to get session:', error);
      return null;
    }
  }
  
  /**
   * Make authenticated API request
   */
  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    // Merge existing headers
    if (options.headers) {
      const existingHeaders = new Headers(options.headers);
      existingHeaders.forEach((value, key) => {
        headers[key] = value;
      });
    }
    
    // Desktop: Add token authentication
    if (this.isElectron) {
      const session = await this.getSession();
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
        headers['X-Client-Type'] = 'desktop';
        headers['X-Client-Version'] = await this.getAppVersion();
      }
    }
    
    // Desktop makes direct API calls, web uses same-origin
    const url = this.isElectron 
      ? `${API_BASE}${endpoint}`  // Direct call to production API
      : endpoint;                 // Same-origin (uses cookies)
    
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: this.isElectron ? 'omit' : 'include', // No cookies in desktop
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || `API error: ${response.status}`);
    }
    
    return response.json();
  }
  
  /**
   * GET request
   */
  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }
  
  /**
   * POST request
   */
  async post<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }
  
  /**
   * PUT request
   */
  async put<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }
  
  /**
   * DELETE request
   */
  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
  
  /**
   * PATCH request
   */
  async patch<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }
  
  /**
   * Get app version (desktop only)
   */
  private async getAppVersion(): Promise<string> {
    if (!this.isElectron) return 'web';
    
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return await (window as any).electronAPI.getAppVersion();
    } catch {
      return 'unknown';
    }
  }
  
  /**
   * Check if running in Electron
   */
  isDesktop(): boolean {
    return this.isElectron;
  }
}

/**
 * Singleton instance
 */
export const apiClient = new ApiClient();
