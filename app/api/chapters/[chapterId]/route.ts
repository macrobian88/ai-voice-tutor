import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { Chapter, COLLECTIONS } from '@/backend/src/models/database';
import { withAuth, corsHeaders } from '@/lib/middleware';

export const GET = withAuth(async (req, { params }: { params: { chapterId: string } }) => {
  try {
    const { chapterId } = params;

    const db = await getDatabase();
    const chaptersCollection = db.collection<Chapter>(COLLECTIONS.CHAPTERS);

    const chapter = await chaptersCollection.findOne({ chapterId });

    if (!chapter) {
      return NextResponse.json(
        { error: 'Chapter not found' },
        { status: 404, headers: corsHeaders() }
      );
    }

    return NextResponse.json(
      { chapter },
      { headers: corsHeaders() }
    );
  } catch (error) {
    console.error('Chapter fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chapter' },
      { status: 500, headers: corsHeaders() }
    );
  }
});

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders() });
}
