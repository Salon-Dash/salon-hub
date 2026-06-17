import { API_BASE_URL } from "@/config/api";
import { getErrorMessage, ErrorResponse } from "@/utils/errorHandler";

export interface RegisterRequest {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  businessName: string;
  category?: string;
  address?: string;
  buildingNumber?: string;
  apartmentNumber?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  businessHours?: string; // JSON string
  weeklySchedule?: string;
  workLocation?: string;
  teamSize?: string;
  profileLiveDate?: string;
  helpOptions?: string; // JSON array as string
  previousTools?: string; // JSON array as string
  hasUsedTools?: string;
  staffMembers?: string; // JSON array as string
  services?: string; // JSON array as string
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  user: {
    id: number;
    email: string;
    role: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
  };
  business?: {
    id: number;
    ownerId: number;
    name: string;
    category?: string;
    email?: string;
    phone?: string;
    address?: string;
    buildingNumber?: string;
    apartmentNumber?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
    status: string;
  };
}

// Use API_BASE_URL from config which handles both dev (proxy) and production (full URL)
// In development, Vite proxy routes /api to http://localhost:8080
// In production, this uses the full GCP API URL
const AUTH_API_BASE = API_BASE_URL;

class AuthService {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${AUTH_API_BASE}${endpoint}`;
    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      
      // Check if response is ok
      if (!response.ok) {
        // Try to parse error response from backend
        let errorData: ErrorResponse | any;
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
          try {
            errorData = await response.json();
          } catch (parseError) {
            // If JSON parsing fails, create a basic error object
            errorData = {
              status: response.status,
              error: response.statusText,
              message: `Request failed with status ${response.status}`,
            };
          }
        } else {
          // Non-JSON response
          const text = await response.text();
          errorData = {
            status: response.status,
            error: response.statusText,
            message: text || `Request failed with status ${response.status}`,
          };
        }

        // Extract user-friendly message from error response
        const errorMessage = getErrorMessage(errorData);
        const error = new Error(errorMessage);
        
        // Attach the full error response for debugging
        (error as any).response = errorData;
        (error as any).status = response.status;
        
        console.error('API Error Response:', errorData);
        throw error;
      }

      return await response.json();
    } catch (error: any) {
      // If it's already our formatted error, re-throw it
      if (error instanceof Error && error.message && !error.message.includes('Failed to fetch')) {
        console.error('Auth API request failed:', error.message, error);
        throw error;
      }
      
      // Handle network errors (Failed to fetch, CORS, connection refused, timeout, etc.)
      if (error?.message?.includes('Failed to fetch') || 
          error?.message?.includes('NetworkError') ||
          error?.message?.includes('ERR_CONNECTION_TIMED_OUT') ||
          error?.message?.includes('ERR_CONNECTION_REFUSED') ||
          error?.message?.includes('timeout') ||
          error?.name === 'TypeError') {
        console.error('Network error:', error);
        
        // Provide specific error messages based on error type
        let errorMessage = 'Unable to connect to the server. ';
        if (error?.message?.includes('ERR_CONNECTION_TIMED_OUT') || error?.message?.includes('timeout')) {
          errorMessage += 'Connection timed out. Please check if the API server is running and accessible.';
        } else if (error?.message?.includes('ERR_CONNECTION_REFUSED')) {
          errorMessage += 'Connection refused. The server may be down or not accepting connections.';
        } else {
          errorMessage += 'Please check your connection and try again.';
        }
        
        throw new Error(errorMessage);
      }
      
      // Handle other unexpected errors
      console.error('Auth API request failed:', error);
      const errorMessage = error?.message || 'An unexpected error occurred. Please try again.';
      throw new Error(errorMessage);
    }
  }

  async registerBusiness(data: RegisterRequest): Promise<AuthResponse> {
    // Registration doesn't require auth token - uses own request method
    return this.request<AuthResponse>('/auth/register/business', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async login(data: LoginRequest): Promise<AuthResponse> {
    // Manager login should go to auth-service route first.
    try {
      return await this.request<AuthResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: data.email,
          password: data.password,
        }),
      });
    } catch (primaryError: any) {
      // Keep backward compatibility with older/public auth contract.
      const fallbackStatus = primaryError?.status;
      const shouldTryPublicFallback =
        !fallbackStatus ||
        [400, 404, 500, 502, 503, 504].includes(fallbackStatus);
      if (!shouldTryPublicFallback) {
        throw primaryError;
      }
      return this.request<AuthResponse>('/public/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          emailOrPhone: data.email,
          password: data.password,
        }),
      });
    }
  }

  async logout(): Promise<void> {
    const refreshToken = localStorage.getItem('refreshToken');
    try {
      if (refreshToken) {
        await this.request<void>('/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refreshToken }),
        });
      }
    } catch {
      // Silently ignore — clear local state regardless
    }
  }

  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify(refreshToken),
    });
  }

  async validateToken(token: string): Promise<{ valid: boolean; message: string; user?: any }> {
    try {
      const response = await fetch(`${AUTH_API_BASE}/auth/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        return { valid: false, message: 'Token validation failed' };
      }

      const data = await response.json();
      return {
        valid: data.valid || false,
        message: data.message || 'Token validation failed',
        user: data.user,
      };
    } catch (error: any) {
      console.error('Token validation error:', error);
      return { valid: false, message: error?.message || 'Token validation failed' };
    }
  }
}

export const authService = new AuthService();

