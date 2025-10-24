'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import ChapterNavigation from '@/components/ChapterNavigation';
import ProgressDashboard from '@/components/ProgressDashboard';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { BookOpen, BarChart3, User, LogOut } from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'chapters' | 'progress'>('chapters');

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, router]);

  const handleChapterSelect = (chapter: any) => {
    router.push(`/session?chapterId=${chapter.chapterId}`);
  };

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">AI Voice Tutor</h1>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="font-semibold">{user.name}</p>
              <p className="text-sm text-gray-600 capitalize">{user.tier} Plan</p>
            </div>
            <Button variant="outline" size="icon" onClick={handleLogout}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Navigation Tabs */}
        <div className="flex space-x-2 mb-6">
          <Button
            variant={activeTab === 'chapters' ? 'default' : 'outline'}
            onClick={() => setActiveTab('chapters')}
            className="flex items-center space-x-2"
          >
            <BookOpen className="w-4 h-4" />
            <span>Chapters</span>
          </Button>
          <Button
            variant={activeTab === 'progress' ? 'default' : 'outline'}
            onClick={() => setActiveTab('progress')}
            className="flex items-center space-x-2"
          >
            <BarChart3 className="w-4 h-4" />
            <span>Progress</span>
          </Button>
        </div>

        {/* Content */}
        {activeTab === 'chapters' ? (
          <ChapterNavigation onChapterSelect={handleChapterSelect} />
        ) : (
          <ProgressDashboard />
        )}
      </div>
    </div>
  );
}
