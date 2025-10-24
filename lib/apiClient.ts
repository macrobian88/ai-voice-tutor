/**
 * API Client with built-in error handling, retry logic, and loading states
 */

export class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}

interface RequestOptions extends RequestInit {
  token?: string;
  retry?: boolean;
  retryAttempts?: number;
  retryDelay?: number;
}

interface APIResponse<T = any> {
  data?: T;
  error?: string;
  statusCode: number;
}

export class APIClient {
  private static baseURL =
    typeof window !== 'undefined'
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  private static async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const {
      token,
      retry = true,
      retryAttempts = 3,
      retryDelay = 1000,
      ...fetchOptions
    } = options;

    const headers = new Headers(fetchOptions.headers);

    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    if (
      fetchOptions.body &&
      !(fetchOptions.body instanceof FormData) &&
      !headers.has('Content-Type')
    ) {
      headers.set('Content-Type', 'application/json');
    }

    const url = `${this.baseURL}${endpoint}`;

    let lastError: Error | null = null;
    let attempt = 0;

    while (attempt < (retry ? retryAttempts : 1)) {
      try {
        const response = await fetch(url, {
          ...fetchOptions,
          headers,
        });

        // Parse response
        let data: any;
        const contentType = response.headers.get('content-type');

        if (contentType?.includes('application/json')) {
          data = await response.json();
        } else {
          data = await response.text();
        }

        // Handle error responses
        if (!response.ok) {
          throw new APIError(
            data.error || data.message || 'Request failed',
            response.status,
            data.code,
            data.details
          );
        }

        return data as T;
      } catch (error) {
        lastError = error as Error;

        // Don't retry on client errors (4xx)
        if (error instanceof APIError && error.statusCode < 500) {
          throw error;
        }

        // Don't retry if this was the last attempt
        if (attempt >= retryAttempts - 1) {
          break;
        }

        // Wait before retrying
        await new Promise((resolve) =>
          setTimeout(resolve, retryDelay * (attempt + 1))
        );

        attempt++;
      }
    }

    // All retries failed
    throw lastError || new Error('Request failed');
  }

  // Authentication
  static async login(email: string, password: string) {
    return this.request<{ token: string; user: any }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  static async register(email: string, password: string, name: string) {
    return this.request<{ token: string; user: any }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
  }

  // Chapters
  static async getChapters(token: string) {
    return this.request<{ chapters: any[] }>('/api/chapters', {
      token,
    });
  }

  static async getChapter(chapterId: string, token: string) {
    return this.request<{ chapter: any }>(`/api/chapters/${chapterId}`, {
      token,
    });
  }

  // Chat
  static async sendChatMessage(
    formData: FormData,
    token: string,
    onProgress?: (progress: number) => void
  ) {
    // For chat, we want to handle upload progress
    return new Promise<any>((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      if (onProgress) {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const percentComplete = (e.loaded / e.total) * 100;
            onProgress(percentComplete);
          }
        });
      }

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            resolve(data);
          } catch (error) {
            reject(new Error('Invalid JSON response'));
          }
        } else {
          try {
            const error = JSON.parse(xhr.responseText);
            reject(
              new APIError(
                error.error || 'Request failed',
                xhr.status,
                error.code
              )
            );
          } catch {
            reject(new APIError('Request failed', xhr.status));
          }
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Network error'));
      });

      xhr.open('POST', `${this.baseURL}/api/chat`);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.send(formData);
    });
  }

  // Sessions
  static async createSession(token: string, chapterId: string) {
    return this.request<{ sessionId: string }>('/api/sessions', {
      method: 'POST',
      token,
      body: JSON.stringify({ chapterId }),
    });
  }

  static async getSession(sessionId: string, token: string) {
    return this.request<{ session: any }>(`/api/sessions/${sessionId}`, {
      token,
    });
  }

  static async endSession(
    sessionId: string,
    token: string,
    completionReason: string
  ) {
    return this.request(`/api/sessions/${sessionId}`, {
      method: 'PUT',
      token,
      body: JSON.stringify({ completionReason }),
    });
  }

  // Progress
  static async getUserProgress(token: string) {
    return this.request<{ progress: any[] }>('/api/progress', {
      token,
    });
  }

  static async getChapterProgress(chapterId: string, token: string) {
    return this.request<{ progress: any }>(
      `/api/progress/chapter/${chapterId}`,
      {
        token,
      }
    );
  }
}

// Utility function for handling API errors in components
export function handleAPIError(error: unknown): string {
  if (error instanceof APIError) {
    // Map specific error codes to user-friendly messages
    switch (error.code) {
      case 'INVALID_CREDENTIALS':
        return 'Invalid email or password';
      case 'USER_EXISTS':
        return 'An account with this email already exists';
      case 'UNAUTHORIZED':
        return 'Please log in to continue';
      case 'CHAPTER_NOT_FOUND':
        return 'Chapter not found. Please try another one.';
      case 'SESSION_NOT_FOUND':
        return 'Session not found';
      case 'RATE_LIMIT_EXCEEDED':
        return 'Too many requests. Please try again later.';
      case 'QUOTA_EXCEEDED':
        return 'You have reached your monthly quota. Please upgrade your plan.';
      default:
        return error.message;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred';
}

// Hook for using API with loading states
export function useAPI() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = async <T,>(
    apiCall: () => Promise<T>
  ): Promise<T | null> => {
    setLoading(true);
    setError(null);

    try {
      const result = await apiCall();
      return result;
    } catch (err) {
      const errorMessage = handleAPIError(err);
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { loading, error, execute };
}

// React hook import
import { useState } from 'react';
