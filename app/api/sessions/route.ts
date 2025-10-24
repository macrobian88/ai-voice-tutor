import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { withAuth, corsHeaders, AuthenticatedNextRequest } from '@/lib/middleware';
import { Session, COLLECTIONS } from '@/backend/src/models/database';
import { ObjectId } from 'mongodb';

/**
 * Get user's sessions
 */
export const GET = withAuth(async (req: AuthenticatedNextRequest) => {
  try {
    const userId = new ObjectId(req.user!.userId);
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const chapterId = searchParams.get('chapterId');

    const db = await getDatabase();
    const sessionsCollection = db.collection<Session>(COLLECTIONS.SESSIONS);

    const filter: any = { userId };
    if (chapterId) filter.chapterId = chapterId;

    const sessions = await sessionsCollection
      .find(filter)
      .sort({ startTime: -1 })
      .limit(limit)
      .toArray();

    return NextResponse.json(
      { sessions },
      { headers: corsHeaders() }
    );
  } catch (error) {
    console.error('Sessions fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sessions' },
      { status: 500, headers: corsHeaders() }
    );
  }
});

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders() });
}
