import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, extractToken, JWTPayload } from './auth';

export interface AuthenticatedNextRequest extends NextRequest {
  user?: JWTPayload;
}

// Type for route context with params
type RouteContext<T = Record<string, string | string[]>> = {
  params: T;
};

export function withAuth<T = Record<string, string | string[]>>(
  handler: (req: AuthenticatedNextRequest, context?: RouteContext<T>) => Promise<NextResponse>
) {
  return async (req: NextRequest, context?: RouteContext<T>): Promise<NextResponse> => {
    try {
      const authHeader = req.headers.get('authorization');
      const token = extractToken(authHeader);

      if (!token) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }

      const payload = verifyToken(token);
      
      // Attach user to request
      const authenticatedReq = req as AuthenticatedNextRequest;
      authenticatedReq.user = payload;

      return handler(authenticatedReq, context);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }
  };
}

export function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}
