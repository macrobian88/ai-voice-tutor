'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import TutorSession from '@/components/TutorSession';

function SessionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, token } = useAuth();
  const chapterId = searchParams.get('chapterId');
  const [chapter, setChapter] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    if (!chapterId) {
      router.push('/dashboard');
      return;
    }

    fetchChapter();
  }, [isAuthenticated, chapterId]);

  const fetchChapter = async () => {
    try {
      const res = await fetch(`/api/chapters/${chapterId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      setChapter(data.chapter);
    } catch (error) {
      console.error('Error fetching chapter:', error);
      alert('Failed to load chapter');
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleSessionEnd = () => {
    router.push('/dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading chapter...</p>
      </div>
    );
  }

  if (!chapter) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <TutorSession
        chapterId={chapter.chapterId}
        chapterTitle={chapter.title}
        onSessionEnd={handleSessionEnd}
      />
    </div>
  );
}

export default function SessionPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <SessionContent />
    </Suspense>
  );
}
