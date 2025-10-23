import { ObjectId } from 'mongodb';

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
  
  // Conversation data
  subject?: string;
  topic?: string;
  messages: SessionMessage[];
  
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
  promptType: 'system' | 'curriculum' | 'subject_intro' | 'transition';
  content: string;
  tokens: number;
  subject?: string;
  topic?: string;
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
    };
    averageLatency: number;
    averageSessionCost: number;
    costPerUser: number;
  };
  
  createdAt: Date;
}

// MongoDB Collection Names
export const COLLECTIONS = {
  USERS: 'users',
  SESSIONS: 'sessions',
  CACHED_PROMPTS: 'cached_prompts',
  CACHED_TTS: 'cached_tts_responses',
  COST_METRICS: 'cost_metrics',
} as const;

// Indexes for performance
export const INDEXES = {
  users: [
    { key: { email: 1 }, unique: true },
    { key: { 'subscription.tier': 1 } },
    { key: { createdAt: -1 } },
  ],
  sessions: [
    { key: { userId: 1, startTime: -1 } },
    { key: { startTime: -1 } },
    { key: { subject: 1, topic: 1 } },
    { key: { createdAt: 1 }, expireAfterSeconds: 7776000 }, // 90 days for free tier
  ],
  cached_prompts: [
    { key: { cacheKey: 1 }, unique: true },
    { key: { promptType: 1, subject: 1 } },
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
};
