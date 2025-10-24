import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { Chapter, COLLECTIONS } from '@/backend/src/models/database';
import { withAuth, corsHeaders } from '@/lib/middleware';

export const GET = withAuth(async (req) => {
  try {
    const { searchParams } = new URL(req.url);
    const subject = searchParams.get('subject');
    const grade = searchParams.get('grade');

    const db = await getDatabase();
    const chaptersCollection = db.collection<Chapter>(COLLECTIONS.CHAPTERS);

    const filter: any = {};
    if (subject) filter.subject = subject;
    if (grade) filter.grade = grade;

    const chapters = await chaptersCollection
      .find(filter)
      .sort({ order: 1 })
      .toArray();

    return NextResponse.json(
      { chapters },
      { headers: corsHeaders() }
    );
  } catch (error) {
    console.error('Chapters fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chapters' },
      { status: 500, headers: corsHeaders() }
    );
  }
});

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders() });
}
