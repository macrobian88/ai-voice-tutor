import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { UserProgress, COLLECTIONS } from '@/backend/src/models/database';
import { withAuth, corsHeaders, AuthenticatedNextRequest } from '@/lib/middleware';
import { ObjectId } from 'mongodb';

export const GET = withAuth(async (req: AuthenticatedNextRequest) => {
  try {
    const userId = new ObjectId(req.user!.userId);
    const { searchParams } = new URL(req.url);
    const subject = searchParams.get('subject');
    const grade = searchParams.get('grade');

    const db = await getDatabase();
    const progressCollection = db.collection<UserProgress>(COLLECTIONS.USER_PROGRESS);

    const filter: any = { userId };
    if (subject) filter.subject = subject;
    if (grade) filter.grade = grade;

    const progress = await progressCollection.find(filter).toArray();

    return NextResponse.json(
      { progress },
      { headers: corsHeaders() }
    );
  } catch (error) {
    console.error('Progress fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch progress' },
      { status: 500, headers: corsHeaders() }
    );
  }
});

export const POST = withAuth(async (req: AuthenticatedNextRequest) => {
  try {
    const userId = new ObjectId(req.user!.userId);
    const { subject, grade, chapterId } = await req.json();

    if (!subject || !grade || !chapterId) {
      return NextResponse.json(
        { error: 'Subject, grade, and chapterId are required' },
        { status: 400, headers: corsHeaders() }
      );
    }

    const db = await getDatabase();
    const progressCollection = db.collection<UserProgress>(COLLECTIONS.USER_PROGRESS);
    const usersCollection = db.collection(COLLECTIONS.USERS);

    // Check if progress exists
    let progress = await progressCollection.findOne({ userId, subject, grade });

    const now = new Date();

    if (!progress) {
      // Create new progress
      const newProgress: UserProgress = {
        userId,
        subject,
        grade,
        chapters: [
          {
            chapterId,
            status: 'in_progress',
            startedAt: now,
            sessionsCount: 0,
            totalMinutesSpent: 0,
            performance: {
              questionsAsked: 0,
              offTopicAttempts: 0,
              practiceProblemsCompleted: 0,
              masteryScore: 0,
            },
            lastAccessedAt: now,
          },
        ],
        overallProgress: {
          completedChapters: 0,
          totalChapters: 1,
          percentComplete: 0,
        },
        createdAt: now,
        updatedAt: now,
      };

      await progressCollection.insertOne(newProgress);
      progress = newProgress;
    } else {
      // Update existing progress
      const chapterIndex = progress.chapters.findIndex(c => c.chapterId === chapterId);
      
      if (chapterIndex === -1) {
        // Add new chapter
        progress.chapters.push({
          chapterId,
          status: 'in_progress',
          startedAt: now,
          sessionsCount: 0,
          totalMinutesSpent: 0,
          performance: {
            questionsAsked: 0,
            offTopicAttempts: 0,
            practiceProblemsCompleted: 0,
            masteryScore: 0,
          },
          lastAccessedAt: now,
        });
      } else {
        // Update existing chapter
        progress.chapters[chapterIndex].lastAccessedAt = now;
        if (progress.chapters[chapterIndex].status === 'not_started') {
          progress.chapters[chapterIndex].status = 'in_progress';
          progress.chapters[chapterIndex].startedAt = now;
        }
      }

      await progressCollection.updateOne(
        { _id: progress._id },
        { 
          $set: { 
            chapters: progress.chapters, 
            updatedAt: now,
          } 
        }
      );
    }

    // Update user's current learning path
    await usersCollection.updateOne(
      { _id: userId },
      {
        $set: {
          currentLearningPath: {
            subject,
            grade,
            currentChapterId: chapterId,
          },
          updatedAt: now,
        },
      }
    );

    return NextResponse.json(
      { progress },
      { headers: corsHeaders() }
    );
  } catch (error) {
    console.error('Progress update error:', error);
    return NextResponse.json(
      { error: 'Failed to update progress' },
      { status: 500, headers: corsHeaders() }
    );
  }
});

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders() });
}
