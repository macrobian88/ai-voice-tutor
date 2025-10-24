'use client';

import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  text?: string;
  fullScreen?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
  xl: 'w-16 h-16',
};

export default function Loading({
  size = 'md',
  text,
  fullScreen = false,
  className,
}: LoadingProps) {
  const content = (
    <div className={cn('flex flex-col items-center justify-center', className)}>
      <Loader2 className={cn('animate-spin text-blue-600', sizeClasses[size])} />
      {text && (
        <p className="mt-4 text-sm text-gray-600 animate-pulse">{text}</p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        {content}
      </div>
    );
  }

  return content;
}

// Specialized loading components
export function LoadingSpinner({ size = 'md' }: Pick<LoadingProps, 'size'>) {
  return <Loader2 className={cn('animate-spin', sizeClasses[size])} />;
}

export function LoadingOverlay({ text }: Pick<LoadingProps, 'text'>) {
  return (
    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
      <Loading text={text} size="lg" />
    </div>
  );
}

export function LoadingCard() {
  return (
    <div className="bg-white rounded-lg shadow p-6 animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
      <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
      <div className="h-4 bg-gray-200 rounded w-5/6"></div>
    </div>
  );
}
