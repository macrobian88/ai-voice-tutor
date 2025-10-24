import { MongoClient, Db, ObjectId } from 'mongodb';
import { Chapter, UserProgress, ChapterProgress, COLLECTIONS } from '../models/database';

/**
 * Chapter Service
 * Manages curriculum content with chapter-scoped context
 * Implements aggressive caching for cost optimization
 */
export class ChapterService {
  private db: Db;
  private chapterCache: Map<string, { chapter: Chapter; cachedAt: number }> = new Map();
  private readonly CACHE_TTL = 60 * 60 * 1000; // 1 hour in milliseconds

  constructor(client: MongoClient) {
    this.db = client.db();
  }

  /**
   * Get chapter by ID with caching
   * Saves multiple DB reads per session
   */
  async getChapter(chapterId: string): Promise<Chapter | null> {
    // Check in-memory cache first
    const cached = this.chapterCache.get(chapterId);
    if (cached && Date.now() - cached.cachedAt < this.CACHE_TTL) {
      return cached.chapter;
    }

    // Fetch from database
    const chapter = await this.db
      .collection<Chapter>(COLLECTIONS.CHAPTERS)
      .findOne({ chapterId });

    if (chapter) {
      // Cache for future use
      this.chapterCache.set(chapterId, {
        chapter,
        cachedAt: Date.now(),
      });
    }

    return chapter;
  }

  /**
   * Get all chapters for a subject/grade
   * Used for navigation and prerequisite checking
   */
  async getChaptersBySubjectGrade(
    subject: string,
    grade: string
  ): Promise<Chapter[]> {
    return await this.db
      .collection<Chapter>(COLLECTIONS.CHAPTERS)
      .find({ subject, grade })
      .sort({ order: 1 })
      .toArray();
  }

  /**
   * Get user's current chapter
   */
  async getCurrentChapter(userId: ObjectId): Promise<Chapter | null> {
    const progress = await this.db
      .collection<UserProgress>(COLLECTIONS.USER_PROGRESS)
      .findOne({ userId });

    if (!progress) return null;

    // Find current chapter (first in-progress or first not-started)
    const currentChapterProgress = progress.chapters.find(
      (cp) => cp.status === 'in_progress'
    ) || progress.chapters.find((cp) => cp.status === 'not_started');

    if (!currentChapterProgress) return null;

    return await this.getChapter(currentChapterProgress.chapterId);
  }

  /**
   * Format chapter content for Claude prompt
   * This creates the cacheable system prompt section
   */
  formatChapterForPrompt(chapter: Chapter): string {
    const concepts = chapter.content.concepts
      .map((c) => `### ${c.title}\n${c.explanation}\n\nKey Points:\n${c.keyPoints.map((p) => `- ${p}`).join('\n')}`)
      .join('\n\n');

    const examples = chapter.content.examples
      .map((ex, idx) => `**Example ${idx + 1}:**\n${ex.problem}\n\nSolution:\n${ex.steps.join('\n')}`)
      .join('\n\n');

    return `# CHAPTER: ${chapter.title}

## Learning Objectives:
${chapter.metadata.learningObjectives.map((obj) => `- ${obj}`).join('\n')}

## Content:

${concepts}

## Examples:

${examples}

## Keywords (for scope detection):
${chapter.content.keywords.join(', ')}`;
  }

  /**
   * Check if a question is within chapter scope
   * This is the pre-call filter that saves API costs
   */
  async isQuestionInScope(
    questionText: string,
    chapterId: string
  ): Promise<{ inScope: boolean; confidence: number; reason?: string }> {
    const chapter = await this.getChapter(chapterId);
    if (!chapter) {
      return { inScope: false, confidence: 0, reason: 'Chapter not found' };
    }

    const questionLower = questionText.toLowerCase();
    const keywords = chapter.content.keywords.map((k) => k.toLowerCase());

    // Simple keyword matching (can be enhanced with embeddings later)
    let matchCount = 0;
    const matchedKeywords: string[] = [];

    for (const keyword of keywords) {
      if (questionLower.includes(keyword)) {
        matchCount++;
        matchedKeywords.push(keyword);
      }
    }

    // Calculate confidence score
    const confidence = Math.min(matchCount / Math.max(keywords.length * 0.1, 1), 1);

    // If no keywords match, likely off-topic
    if (matchCount === 0) {
      return {
        inScope: false,
        confidence: 0,
        reason: 'No chapter keywords found in question',
      };
    }

    // If confidence is low, probably off-topic
    if (confidence < 0.3) {
      return {
        inScope: false,
        confidence,
        reason: `Low keyword match (${matchedKeywords.join(', ')})`,
      };
    }

    return {
      inScope: true,
      confidence,
      reason: `Matched keywords: ${matchedKeywords.join(', ')}`,
    };
  }

  /**
   * Update user progress for a chapter
   */
  async updateProgress(
    userId: ObjectId,
    chapterId: string,
    updates: Partial<ChapterProgress>
  ): Promise<void> {
    await this.db.collection<UserProgress>(COLLECTIONS.USER_PROGRESS).updateOne(
      { userId, 'chapters.chapterId': chapterId },
      {
        $set: {
          'chapters.$.lastAccessedAt': new Date(),
          ...Object.fromEntries(
            Object.entries(updates).map(([key, value]) => [`chapters.$.${key}`, value])
          ),
          updatedAt: new Date(),
        },
      }
    );
  }

  /**
   * Initialize user progress for a subject/grade
   */
  async initializeProgress(
    userId: ObjectId,
    subject: string,
    grade: string
  ): Promise<void> {
    const chapters = await this.getChaptersBySubjectGrade(subject, grade);

    const chapterProgress: ChapterProgress[] = chapters.map((ch) => ({
      chapterId: ch.chapterId,
      status: 'not_started',
      sessionsCount: 0,
      totalMinutesSpent: 0,
      performance: {
        questionsAsked: 0,
        offTopicAttempts: 0,
        practiceProblemsCompleted: 0,
        masteryScore: 0,
      },
      lastAccessedAt: new Date(),
    }));

    await this.db.collection<UserProgress>(COLLECTIONS.USER_PROGRESS).insertOne({
      userId,
      subject,
      grade,
      chapters: chapterProgress,
      overallProgress: {
        completedChapters: 0,
        totalChapters: chapters.length,
        percentComplete: 0,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  /**
   * Get user's overall progress summary
   */
  async getProgressSummary(userId: ObjectId): Promise<UserProgress | null> {
    return await this.db
      .collection<UserProgress>(COLLECTIONS.USER_PROGRESS)
      .findOne({ userId });
  }

  /**
   * Clear cache (for testing or manual refresh)
   */
  clearCache(): void {
    this.chapterCache.clear();
  }
}
