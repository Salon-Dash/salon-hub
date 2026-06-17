// API Configuration
// In development, Vite proxy routes /api to http://localhost:8080
// In production on Vercel, ALWAYS use the serverless function proxy at /api
// The proxy handles HTTPS to HTTP conversion to avoid mixed content errors
// NOTE: In production, we MUST use /api (relative URL) to go through Vercel proxy
// Do NOT set VITE_API_BASE_URL in Vercel - it will cause mixed content errors

// FORCE /api in production - ignore any environment variables
// This ensures we always use the Vercel proxy (HTTPS) instead of direct HTTP calls
export const API_BASE_URL = import.meta.env.PROD ? '/api' : (import.meta.env.VITE_API_BASE_URL || '/api');
// WebSocket Configuration
// SockJS requires HTTP/HTTPS URLs (not ws:// or wss://) - it handles WebSocket upgrade internally
// In development: Use empty string (relative path) so Vite proxy handles it
// In production: Use HTTPS to avoid mixed content blocking (Vercel uses HTTPS)
// SSL is configured on GCP server, listening on port 8443
export const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL || '';

// Get current business ID from localStorage (set after login/registration)
// Note: In business-specific routes, use useBusinessId() hook instead
export const getCurrentBusinessId = (): number => {
  // First, try to get from currentBusinessId
  const businessId = localStorage.getItem('currentBusinessId');
  if (businessId) {
    const parsedId = parseInt(businessId, 10);
    if (!isNaN(parsedId) && parsedId > 0) {
      return parsedId;
    }
  }
  
  // Try to get from currentBusiness object
  const businessStr = localStorage.getItem('currentBusiness');
  if (businessStr) {
    try {
      const business = JSON.parse(businessStr);
      if (business && business.id) {
        const parsedId = parseInt(business.id.toString(), 10);
        if (!isNaN(parsedId) && parsedId > 0) {
          localStorage.setItem('currentBusinessId', parsedId.toString());
          return parsedId;
        }
      }
    } catch (e) {
      console.error('Error parsing currentBusiness from localStorage:', e);
    }
  }
  
  // Return a safe default that will cause an error on the backend
  // This is better than silently using business ID 1
  return 0; // Return 0 instead of 1, which should cause a validation error on backend
};

// Default business ID (fallback for development - use getCurrentBusinessId() instead)
export const DEFAULT_BUSINESS_ID = 1;

import { getAccessToken, isTokenValid, clearAuthData } from '@/utils/authUtils';

// Helper function to clear auth data and redirect to login
const clearAuthAndRedirect = () => {
  clearAuthData();
  window.location.href = '/login';
};

// API Client
class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    requireAuth: boolean = true
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const accessToken = getAccessToken();
    
    // Validate token if auth is required
    if (requireAuth && accessToken && !isTokenValid(accessToken)) {
      console.warn('Invalid or expired token, redirecting to login');
      clearAuthAndRedirect();
      throw new Error('Token invalid or expired');
    }
    
    // If auth is required but no token, redirect to login
    if (requireAuth && !accessToken) {
      console.warn('No access token found, redirecting to login');
      clearAuthAndRedirect();
      throw new Error('No authentication token');
    }

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // Add Authorization header if auth is required and token exists
    if (requireAuth && accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const config: RequestInit = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(url, config);
      
      // Handle 401 Unauthorized - token invalid or expired
      if (response.status === 401) {
        console.warn('Unauthorized access, clearing auth and redirecting to login');
        clearAuthAndRedirect();
        throw new Error('Unauthorized - Please login again');
      }
      
      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = { error: response.statusText, message: response.statusText };
        }
        const error = new Error(errorData.message || errorData.error || `HTTP error! status: ${response.status}`);
        (error as any).response = { data: errorData, status: response.status };
        throw error;
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return {} as T;
      }

      return await response.json();
    } catch (error: any) {
      console.error('API request failed:', error);
      
      // Handle connection timeout and network errors
      if (error?.message?.includes('ERR_CONNECTION_TIMED_OUT') || 
          error?.message?.includes('timeout') ||
          error?.message?.includes('Failed to fetch')) {
        const errorMessage = error?.message?.includes('ERR_CONNECTION_TIMED_OUT') 
          ? 'Connection timed out. The API server may be unreachable. Please verify the API URL and ensure the server is running and accessible.'
          : 'Network error: Unable to connect to the API server. Please check your connection and verify the API is accessible.';
        throw new Error(errorMessage);
      }
      
      throw error;
    }
  }

  async get<T>(endpoint: string, requireAuth: boolean = true): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' }, requireAuth);
  }

  async post<T>(endpoint: string, data?: any, requireAuth: boolean = true): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    }, requireAuth);
  }

  async put<T>(endpoint: string, data?: any, requireAuth: boolean = true): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, requireAuth);
  }

  async delete<T>(endpoint: string, requireAuth: boolean = true): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' }, requireAuth);
  }
}

export const apiClient = new ApiClient(API_BASE_URL);



// Force rebuild 1767801300