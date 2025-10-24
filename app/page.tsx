'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Mic, Brain, Zap, TrendingUp } from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            AI Voice Tutor
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Learn through conversation. Master subjects with personalized voice-powered AI tutoring.
          </p>
          <div className="flex justify-center space-x-4">
            <Link href="/auth/register">
              <Button size="lg" className="text-lg px-8">
                Start Learning Free
              </Button>
            </Link>
            <Link href="/auth/login">
              <Button size="lg" variant="outline" className="text-lg px-8">
                Sign In
              </Button>
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mt-16">
          <Card className="p-6 text-center">
            <Mic className="w-12 h-12 mx-auto mb-4 text-blue-600" />
            <h3 className="font-semibold text-lg mb-2">Voice-First Learning</h3>
            <p className="text-gray-600 text-sm">
              Speak naturally with your AI tutor. No typing required.
            </p>
          </Card>

          <Card className="p-6 text-center">
            <Brain className="w-12 h-12 mx-auto mb-4 text-purple-600" />
            <h3 className="font-semibold text-lg mb-2">Chapter-Scoped Focus</h3>
            <p className="text-gray-600 text-sm">
              Stay on track with focused learning. One chapter at a time.
            </p>
          </Card>

          <Card className="p-6 text-center">
            <Zap className="w-12 h-12 mx-auto mb-4 text-yellow-600" />
            <h3 className="font-semibold text-lg mb-2">Instant Feedback</h3>
            <p className="text-gray-600 text-sm">
              Get immediate responses and explanations tailored to your questions.
            </p>
          </Card>

          <Card className="p-6 text-center">
            <TrendingUp className="w-12 h-12 mx-auto mb-4 text-green-600" />
            <h3 className="font-semibold text-lg mb-2">Track Progress</h3>
            <p className="text-gray-600 text-sm">
              Monitor your learning journey with detailed progress tracking.
            </p>
          </Card>
        </div>

        {/* How It Works */}
        <div className="mt-20 max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="space-y-8">
            <div className="flex items-start space-x-4">
              <div className="bg-blue-600 text-white rounded-full w-10 h-10 flex items-center justify-center flex-shrink-0 text-lg font-bold">
                1
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">Choose Your Chapter</h3>
                <p className="text-gray-600">
                  Select from English grammar, sentence structure, and more subjects coming soon.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="bg-purple-600 text-white rounded-full w-10 h-10 flex items-center justify-center flex-shrink-0 text-lg font-bold">
                2
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">Start Speaking</h3>
                <p className="text-gray-600">
                  Press the mic button and ask questions naturally. Your AI tutor listens and responds.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="bg-green-600 text-white rounded-full w-10 h-10 flex items-center justify-center flex-shrink-0 text-lg font-bold">
                3
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">Master the Material</h3>
                <p className="text-gray-600">
                  Practice, get feedback, and track your progress until you've mastered each chapter.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className="mt-20 max-w-md mx-auto">
          <Card className="p-8 text-center border-2 border-blue-600">
            <h2 className="text-2xl font-bold mb-4">Free Tier</h2>
            <p className="text-4xl font-bold mb-2">$0</p>
            <p className="text-gray-600 mb-6">5 sessions per month</p>
            <ul className="text-left space-y-3 mb-8">
              <li className="flex items-center">
                <span className="text-green-600 mr-2">✓</span>
                Voice-powered tutoring
              </li>
              <li className="flex items-center">
                <span className="text-green-600 mr-2">✓</span>
                All English chapters
              </li>
              <li className="flex items-center">
                <span className="text-green-600 mr-2">✓</span>
                Progress tracking
              </li>
              <li className="flex items-center">
                <span className="text-green-600 mr-2">✓</span>
                Standard voice quality
              </li>
            </ul>
            <Link href="/auth/register">
              <Button size="lg" className="w-full">
                Get Started Free
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
