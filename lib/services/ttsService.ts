import OpenAI from 'openai';
import crypto from 'crypto';
import { getDatabase } from '../db';
import { CachedTTSResponse, COLLECTIONS } from '@/backend/src/models/database';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface TTSResult {
  audioBuffer: Buffer;
  characters: number;
  cost: number;
  cached: boolean;
  audioUrl?: string;
}

export class TTSService {
  private cacheEnabled = process.env.ENABLE_TTS_CACHING === 'true';

  /**
   * Generate speech from text using OpenAI TTS
   * Cost: $0.015 per 1K characters (standard), $0.030 per 1K (HD)
   */
  async generateSpeech(
    text: string,
    voiceId: string = 'alloy',
    quality: 'standard' | 'hd' = 'standard'
  ): Promise<TTSResult> {
    const characters = text.length;
    const costPerChar = quality === 'hd' ? 0.030 / 1000 : 0.015 / 1000;
    const cost = characters * costPerChar;

    // Check cache first
    if (this.cacheEnabled) {
      const cached = await this.getFromCache(text, voiceId, quality);
      if (cached) {
        return {
          audioBuffer: Buffer.from([]), // URL only for cached
          characters,
          cost: 0, // No cost for cached
          cached: true,
          audioUrl: cached.audioUrl,
        };
      }
    }

    // Generate new speech
    try {
      const mp3 = await openai.audio.speech.create({
        model: quality === 'hd' ? 'tts-1-hd' : 'tts-1',
        voice: voiceId as any,
        input: text,
        response_format: 'mp3',
      });

      const buffer = Buffer.from(await mp3.arrayBuffer());

      // Cache the result if enabled
      if (this.cacheEnabled) {
        await this.saveToCache(text, voiceId, quality, buffer, characters);
      }

      return {
        audioBuffer: buffer,
        characters,
        cost,
        cached: false,
      };
    } catch (error) {
      console.error('TTS generation error:', error);
      throw new Error('Failed to generate speech');
    }
  }

  /**
   * Get cached TTS response
   */
  private async getFromCache(
    text: string,
    voiceId: string,
    quality: 'standard' | 'hd'
  ): Promise<CachedTTSResponse | null> {
    try {
      const db = await getDatabase();
      const textHash = this.hashText(text);

      const cached = await db
        .collection<CachedTTSResponse>(COLLECTIONS.CACHED_TTS)
        .findOne({
          textHash,
          voiceId,
          quality,
        });

      if (cached) {
        // Update hit count and last used
        await db
          .collection<CachedTTSResponse>(COLLECTIONS.CACHED_TTS)
          .updateOne(
            { _id: cached._id },
            {
              $inc: { hitCount: 1 },
              $set: { lastUsed: new Date() },
            }
          );

        return cached;
      }

      return null;
    } catch (error) {
      console.error('TTS cache read error:', error);
      return null;
    }
  }

  /**
   * Save TTS response to cache
   */
  private async saveToCache(
    text: string,
    voiceId: string,
    quality: 'standard' | 'hd',
    audioBuffer: Buffer,
    characters: number
  ): Promise<void> {
    try {
      // In a real app, upload to R2/S3 and store URL
      // For now, we'll store a placeholder URL
      const audioUrl = `https://storage.example.com/tts/${this.hashText(text)}.mp3`;

      const db = await getDatabase();
      const textHash = this.hashText(text);
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

      await db.collection<CachedTTSResponse>(COLLECTIONS.CACHED_TTS).insertOne({
        textHash,
        text,
        voiceId,
        quality,
        audioUrl,
        characters,
        durationMs: 0, // Calculate from audio if needed
        hitCount: 0,
        lastUsed: now,
        expiresAt,
        createdAt: now,
      });
    } catch (error) {
      console.error('TTS cache write error:', error);
      // Don't throw - caching failure shouldn't break the request
    }
  }

  /**
   * Hash text for cache key
   */
  private hashText(text: string): string {
    return crypto.createHash('sha256').update(text).digest('hex');
  }

  /**
   * Pre-cache common phrases
   */
  async precacheCommonPhrases(): Promise<void> {
    const commonPhrases = [
      "Hello! I'm your AI tutor. What would you like to learn today?",
      "Great question! Let me explain that.",
      "That's correct! Well done.",
      "Let's try that again. Can you think of another approach?",
      "Excellent work! You're making great progress.",
      "Let's move on to the next concept.",
      "Would you like me to explain that in a different way?",
      "Let's practice with an example.",
    ];

    for (const phrase of commonPhrases) {
      try {
        await this.generateSpeech(phrase);
      } catch (error) {
        console.error(`Failed to precache phrase: ${phrase}`, error);
      }
    }
  }
}

export const ttsService = new TTSService();
