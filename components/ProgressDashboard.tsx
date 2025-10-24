'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card } from './ui/card';
import { Progress } from './ui/progress';
import { Trophy, Clock, Target, TrendingUp } from 'lucide-react';

interface UserProgress {
  subject: string;
  grade: string;
  overallProgress: {
    completedChapters: number;
    totalChapters: number;
    percentComplete: number;
  };
  chapters: {
    chapterId: string;
    status: string;
    sessionsCount: number;
    totalMinutesSpent: number;
    performance: {
      questionsAsked: number;
      offTopicAttempts: number;
      practiceProblemsCompleted: number;
      masteryScore: number;
    };
  }[];
}

export default function ProgressDashboard() {
  const { token } = useAuth();
  const [progress, setProgress] = useState<UserProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProgress();
  }, []);

  const fetchProgress = async () => {
    try {
      const res = await fetch('/api/progress', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      setProgress(data.progress || []);
    } catch (error) {
      console.error('Error fetching progress:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading progress...</div>;
  }

  if (progress.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No progress yet. Start a chapter to begin learning!</p>
      </div>
    );
  }

  const totalMinutes = progress.reduce(
    (acc, p) => acc + p.chapters.reduce((sum, c) => sum + c.totalMinutesSpent, 0),
    0
  );

  const totalSessions = progress.reduce(
    (acc, p) => acc + p.chapters.reduce((sum, c) => sum + c.sessionsCount, 0),
    0
  );

  const avgMastery =
    progress.reduce(
      (acc, p) =>
        acc +
        p.chapters.reduce((sum, c) => sum + c.performance.masteryScore, 0) /
          Math.max(p.chapters.length, 1),
      0
    ) / Math.max(progress.length, 1);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Your Progress</h2>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <Trophy className="w-8 h-8 text-yellow-500" />
            <div>
              <p className="text-2xl font-bold">{avgMastery.toFixed(0)}%</p>
              <p className="text-sm text-gray-600">Avg Mastery</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <Clock className="w-8 h-8 text-blue-500" />
            <div>
              <p className="text-2xl font-bold">{totalMinutes}</p>
              <p className="text-sm text-gray-600">Minutes Learned</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <Target className="w-8 h-8 text-green-500" />
            <div>
              <p className="text-2xl font-bold">{totalSessions}</p>
              <p className="text-sm text-gray-600">Sessions</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <TrendingUp className="w-8 h-8 text-purple-500" />
            <div>
              <p className="text-2xl font-bold">
                {progress.reduce((acc, p) => acc + p.overallProgress.completedChapters, 0)}
              </p>
              <p className="text-sm text-gray-600">Completed</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Subject Progress */}
      {progress.map((subjectProgress) => (
        <Card key={`${subjectProgress.subject}-${subjectProgress.grade}`} className="p-6">
          <h3 className="text-xl font-semibold mb-4">
            {subjectProgress.subject} - Grade {subjectProgress.grade}
          </h3>

          <div className="mb-4">
            <div className="flex justify-between text-sm mb-2">
              <span>Overall Progress</span>
              <span className="font-semibold">
                {subjectProgress.overallProgress.completedChapters} of{' '}
                {subjectProgress.overallProgress.totalChapters} chapters
              </span>
            </div>
            <Progress value={subjectProgress.overallProgress.percentComplete} />
          </div>

          <div className="space-y-2">
            {subjectProgress.chapters
              .filter((c) => c.status !== 'not_started')
              .map((chapter) => (
                <div
                  key={chapter.chapterId}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded"
                >
                  <div>
                    <p className="font-medium capitalize">{chapter.chapterId.replace(/-/g, ' ')}</p>
                    <p className="text-sm text-gray-600">
                      {chapter.sessionsCount} sessions • {chapter.totalMinutesSpent} min •{' '}
                      {chapter.performance.questionsAsked} questions
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-green-600">
                      {chapter.performance.masteryScore}%
                    </p>
                    <p className="text-xs text-gray-600 capitalize">{chapter.status}</p>
                  </div>
                </div>
              ))}
          </div>
        </Card>
      ))}
    </div>
  );
}
