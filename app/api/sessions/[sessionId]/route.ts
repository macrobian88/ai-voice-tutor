import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { withAuth, corsHeaders, AuthenticatedNextRequest } from '@/lib/middleware';
import { Session, COLLECTIONS } from '@/backend/src/models/database';
import { ObjectId } from 'mongodb';

/**
 * Get specific session
 */
export const GET = withAuth(
  async (req: AuthenticatedNextRequest, context) => {
    try {
      const userId = new ObjectId(req.user!.userId);
      const { sessionId } = context?.params as { sessionId: string };

      const db = await getDatabase();
      const sessionsCollection = db.collection<Session>(COLLECTIONS.SESSIONS);

      const session = await sessionsCollection.findOne({
        _id: new ObjectId(sessionId),
        userId,
      });

      if (!session) {
        return NextResponse.json(
          { error: 'Session not found' },
          { status: 404, headers: corsHeaders() }
        );
      }

      return NextResponse.json({ session }, { headers: corsHeaders() });
    } catch (error) {
      console.error('Session fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch session' },
        { status: 500, headers: corsHeaders() }
      );
    }
  }
);

/**
 * End session
 */
export const PUT = withAuth(
  async (req: AuthenticatedNextRequest, context) => {
    try {
      const userId = new ObjectId(req.user!.userId);
      const { sessionId } = context?.params as { sessionId: string };
      const { completionReason } = await req.json();

      const db = await getDatabase();
      const sessionsCollection = db.collection<Session>(COLLECTIONS.SESSIONS);

      const session = await sessionsCollection.findOne({
        _id: new ObjectId(sessionId),
        userId,
      });

      if (!session) {
        return NextResponse.json(
          { error: 'Session not found' },
          { status: 404, headers: corsHeaders() }
        );
      }

      const now = new Date();
      const duration = (now.getTime() - session.startTime.getTime()) / 1000 / 60; // minutes

      await sessionsCollection.updateOne(
        { _id: session._id },
        {
          $set: {
            endTime: now,
            durationMinutes: duration,
            'metrics.completionReason': completionReason || 'user_ended',
            updatedAt: now,
          },
        }
      );

      return NextResponse.json(
        { success: true, duration },
        { headers: corsHeaders() }
      );
    } catch (error) {
      console.error('Session end error:', error);
      return NextResponse.json(
        { error: 'Failed to end session' },
        { status: 500, headers: corsHeaders() }
      );
    }
  }
);

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders() });
}
