import { ObjectId } from 'mongodb';

// ============= EXISTING MODELS =============

export interface User {
  _id?: ObjectId;
  email: string;
  passwordHash: string;
  name: string;
  subscription: {
    tier: 'free' | 'founder' | 'plus' | 'pro';
    status: 'active' | 'cancelled' | 'past_due';
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
  };
  usage: {
    sessionsThisMonth: number;
    minutesThisMonth: number;
    lastResetDate: Date;
  };
  preferences: {
    voiceId: string;
    voiceQuality: 'standard' | 'hd';
    subjects: string[];
    learningStyle?: string;
  };
  // NEW: Current learning path
  currentLearningPath?: {
    subject: string;
    grade: string;
    currentChapterId: string;
  };
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

export interface Session {
  _id?: ObjectId;
  userId: ObjectId;
  startTime: Date;
  endTime?: Date;
  durationMinutes?: number;
  
  // Conversation data - ENHANCED with chapter context
  subject?: string;
  topic?: string;
  chapterId?: string;  // NEW: Current chapter ID
  messages: SessionMessage[];
  
  // NEW: Off-topic tracking
  offTopicAttempts?: number;  // Track how many off-topic questions were asked
  
  // Cost tracking
  costs: {
    whisperCost: number;
    claudeCost: number;
    ttsCost: number;
    totalCost: number;
  };
  
  // Token usage
  tokens: {
    inputTokens: number;
    outputTokens: number;
    cachedInputTokens: number;
    cacheCreationTokens: number;
  };
  
  // TTS usage
  tts: {
    charactersGenerated: number;
    cacheHits: number;
    cacheMisses: number;
  };
  
  // Audio metrics
  audio: {
    totalAudioMinutes: number;
    vadReductionPercent?: number;
    compressionRatio?: number;
  };
  
  // Quality metrics
  metrics: {
    averageLatency: number;
    userSatisfaction?: number;
    completionReason: 'completed' | 'user_ended' | 'error' | 'timeout';
  };
  
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  
  // NEW: Context validation
  isInScope?: boolean;  // Was this question within chapter scope?
  scopeConfidence?: number;  // 0-1 confidence score
  
  // Audio metadata (for user messages)
  audioUrl?: string;
  audioDurationMs?: number;
  transcriptionConfidence?: number;
  
  // Generation metadata (for assistant messages)
  tokensUsed?: number;
  cachedTokens?: number;
  generationLatency?: number;
  ttsCharacters?: number;
  ttsAudioUrl?: string;
  ttsCached?: boolean;
}

export interface CachedPrompt {
  _id?: ObjectId;
  cacheKey: string;
  promptType: 'system' | 'curriculum' | 'subject_intro' | 'transition' | 'chapter_content';  // ENHANCED
  content: string;
  tokens: number;
  subject?: string;
  topic?: string;
  chapterId?: string;  // NEW
  hitCount: number;
  lastUsed: Date;
  expiresAt: Date;
  createdAt: Date;
}

export interface CachedTTSResponse {
  _id?: ObjectId;
  textHash: string;
  text: string;
  voiceId: string;
  quality: 'standard' | 'hd';
  audioUrl: string;
  characters: number;
  durationMs: number;
  hitCount: number;
  lastUsed: Date;
  expiresAt: Date;
  createdAt: Date;
}

export interface CostMetrics {
  _id?: ObjectId;
  date: Date;
  period: 'daily' | 'weekly' | 'monthly';
  
  usage: {
    totalUsers: number;
    activeUsers: number;
    totalSessions: number;
    totalMinutes: number;
  };
  
  costs: {
    whisper: number;
    claude: number;
    tts: number;
    infrastructure: number;
    total: number;
  };
  
  savings: {
    promptCaching: number;
    ttsCaching: number;
    vad: number;
    tieredRouting: number;
    chapterScoping: number;  // NEW: Savings from chapter-scoped filtering
    total: number;
  };
  
  revenue: {
    founder: number;
    plus: number;
    pro: number;
    total: number;
  };
  
  performance: {
    cacheHitRate: {
      prompts: number;
      tts: number;
      chapters: number;  // NEW
    };
    averageLatency: number;
    averageSessionCost: number;
    costPerUser: number;
    offTopicRate: number;  // NEW: % of off-topic questions
  };
  
  createdAt: Date;
}

// ============= NEW MODELS FOR CHAPTER SYSTEM =============

export interface Chapter {
  _id?: ObjectId;
  chapterId: string;  // Unique identifier (e.g., "algebra-linear-equations")
  subject: string;  // e.g., "Mathematics"
  grade: string;  // e.g., "8th", "Grade 8"
  title: string;
  order: number;  // Sequential order in curriculum
  
  content: {
    concepts: ConceptSection[];
    examples: Example[];
    practiceProblems: PracticeProblem[];
    keywords: string[];  // For scope detection
  };
  
  metadata: {
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    prerequisites: string[];  // Array of chapter IDs
    estimatedMinutes: number;
    learningObjectives: string[];
  };
  
  // Caching metadata
  cacheKey: string;  // For prompt caching
  tokenCount: number;  // Approximate tokens in content
  
  createdAt: Date;
  updatedAt: Date;
}

export interface ConceptSection {
  id: string;
  title: string;
  explanation: string;
  keyPoints: string[];
}

export interface Example {
  id: string;
  problem: string;
  solution: string;
  steps: string[];
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface PracticeProblem {
  id: string;
  problem: string;
  hint?: string;
  solution: string;  // Hidden from student initially
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface UserProgress {
  _id?: ObjectId;
  userId: ObjectId;
  subject: string;
  grade: string;
  
  chapters: ChapterProgress[];
  
  overallProgress: {
    completedChapters: number;
    totalChapters: number;
    percentComplete: number;
  };
  
  createdAt: Date;
  updatedAt: Date;
}

export interface ChapterProgress {
  chapterId: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'mastered';
  
  startedAt?: Date;
  completedAt?: Date;
  
  sessionsCount: number;
  totalMinutesSpent: number;
  
  performance: {
    questionsAsked: number;
    offTopicAttempts: number;
    practiceProblemsCompleted: number;
    masteryScore: number;  // 0-100
  };
  
  lastAccessedAt: Date;
}

// MongoDB Collection Names
export const COLLECTIONS = {
  USERS: 'users',
  SESSIONS: 'sessions',
  CACHED_PROMPTS: 'cached_prompts',
  CACHED_TTS: 'cached_tts_responses',
  COST_METRICS: 'cost_metrics',
  CHAPTERS: 'chapters',  // NEW
  USER_PROGRESS: 'user_progress',  // NEW
} as const;

// Indexes for performance
export const INDEXES = {
  users: [
    { key: { email: 1 }, unique: true },
    { key: { 'subscription.tier': 1 } },
    { key: { 'currentLearningPath.subject': 1, 'currentLearningPath.chapterId': 1 } },  // NEW
    { key: { createdAt: -1 } },
  ],
  sessions: [
    { key: { userId: 1, startTime: -1 } },
    { key: { startTime: -1 } },
    { key: { subject: 1, topic: 1 } },
    { key: { chapterId: 1 } },  // NEW
    { key: { createdAt: 1 }, expireAfterSeconds: 7776000 }, // 90 days for free tier
  ],
  cached_prompts: [
    { key: { cacheKey: 1 }, unique: true },
    { key: { promptType: 1, subject: 1 } },
    { key: { chapterId: 1 } },  // NEW
    { key: { expiresAt: 1 }, expireAfterSeconds: 0 }, // TTL index
  ],
  cached_tts_responses: [
    { key: { textHash: 1, voiceId: 1, quality: 1 }, unique: true },
    { key: { expiresAt: 1 }, expireAfterSeconds: 0 }, // TTL index
  ],
  cost_metrics: [
    { key: { date: -1, period: 1 } },
    { key: { period: 1, date: -1 } },
  ],
  chapters: [  // NEW
    { key: { chapterId: 1 }, unique: true },
    { key: { subject: 1, grade: 1, order: 1 } },
    { key: { 'metadata.prerequisites': 1 } },
  ],
  user_progress: [  // NEW
    { key: { userId: 1, subject: 1, grade: 1 }, unique: true },
    { key: { 'chapters.chapterId': 1 } },
    { key: { updatedAt: -1 } },
  ],
};
