'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { CheckCircle, Circle, Lock } from 'lucide-react';

interface Chapter {
  _id: string;
  chapterId: string;
  title: string;
  order: number;
  metadata: {
    difficulty: string;
    estimatedMinutes: number;
    prerequisites: string[];
  };
}

interface ChapterProgress {
  chapterId: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'mastered';
  performance?: {
    masteryScore: number;
  };
}

interface ChapterNavigationProps {
  subject?: string;
  grade?: string;
  onChapterSelect: (chapter: Chapter) => void;
}

export default function ChapterNavigation({
  subject = 'English',
  grade = '8',
  onChapterSelect,
}: ChapterNavigationProps) {
  const { token } = useAuth();
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [progress, setProgress] = useState<ChapterProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChapters();
    fetchProgress();
  }, [subject, grade]);

  const fetchChapters = async () => {
    try {
      const res = await fetch(`/api/chapters?subject=${subject}&grade=${grade}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      setChapters(data.chapters || []);
    } catch (error) {
      console.error('Error fetching chapters:', error);
    }
  };

  const fetchProgress = async () => {
    try {
      const res = await fetch(`/api/progress?subject=${subject}&grade=${grade}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.progress && data.progress.length > 0) {
        setProgress(data.progress[0].chapters || []);
      }
    } catch (error) {
      console.error('Error fetching progress:', error);
    } finally {
      setLoading(false);
    }
  };

  const getChapterStatus = (chapterId: string) => {
    const chapterProgress = progress.find((p) => p.chapterId === chapterId);
    return chapterProgress?.status || 'not_started';
  };

  const getMasteryScore = (chapterId: string) => {
    const chapterProgress = progress.find((p) => p.chapterId === chapterId);
    return chapterProgress?.performance?.masteryScore || 0;
  };

  const isChapterUnlocked = (chapter: Chapter) => {
    // First chapter is always unlocked
    if (chapter.order === 1) return true;

    // Check if prerequisites are completed
    const prerequisites = chapter.metadata.prerequisites || [];
    if (prerequisites.length === 0) return true;

    return prerequisites.every((prereqId) => {
      const status = getChapterStatus(prereqId);
      return status === 'completed' || status === 'mastered';
    });
  };

  const handleStartChapter = async (chapter: Chapter) => {
    // Initialize progress
    try {
      await fetch('/api/progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          subject,
          grade,
          chapterId: chapter.chapterId,
        }),
      });

      // Callback to parent
      onChapterSelect(chapter);
    } catch (error) {
      console.error('Error starting chapter:', error);
      alert('Failed to start chapter');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <p>Loading chapters...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="mb-6">
        <h2 className="text-2xl font-bold">{subject} - Grade {grade}</h2>
        <p className="text-gray-600">Select a chapter to begin learning</p>
      </div>

      <div className="space-y-3">
        {chapters.map((chapter) => {
          const status = getChapterStatus(chapter.chapterId);
          const masteryScore = getMasteryScore(chapter.chapterId);
          const unlocked = isChapterUnlocked(chapter);

          return (
            <Card
              key={chapter.chapterId}
              className={`p-4 transition-all ${
                unlocked
                  ? 'hover:shadow-md cursor-pointer'
                  : 'opacity-50 cursor-not-allowed'
              }`}
              onClick={() => unlocked && handleStartChapter(chapter)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="text-2xl">
                    {!unlocked ? (
                      <Lock className="w-6 h-6 text-gray-400" />
                    ) : status === 'completed' || status === 'mastered' ? (
                      <CheckCircle className="w-6 h-6 text-green-500" />
                    ) : status === 'in_progress' ? (
                      <Circle className="w-6 h-6 text-blue-500" />
                    ) : (
                      <Circle className="w-6 h-6 text-gray-300" />
                    )}
                  </div>

                  <div>
                    <h3 className="font-semibold">
                      {chapter.order}. {chapter.title}
                    </h3>
                    <div className="flex items-center space-x-3 text-sm text-gray-600 mt-1">
                      <span className="capitalize">{chapter.metadata.difficulty}</span>
                      <span>•</span>
                      <span>{chapter.metadata.estimatedMinutes} min</span>
                      {masteryScore > 0 && (
                        <>
                          <span>•</span>
                          <span className="text-green-600 font-semibold">
                            {masteryScore}% mastered
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {unlocked && (
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStartChapter(chapter);
                    }}
                  >
                    {status === 'not_started'
                      ? 'Start'
                      : status === 'in_progress'
                      ? 'Continue'
                      : 'Review'}
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
