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
  private cacheEnabled = process.env.ENABLE_TTS_CACHING !== 'false'; // Default to enabled

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

    console.log('🎵 TTS generateSpeech called:', {
      textLength: characters,
      voiceId,
      quality,
      cacheEnabled: this.cacheEnabled
    });

    // Check cache first
    if (this.cacheEnabled) {
      const cached = await this.getFromCache(text, voiceId, quality);
      if (cached) {
        console.log('✅ TTS cache HIT, returning cached audio');
        // Return actual audio buffer from cache
        const audioBuffer = cached.audioData 
          ? Buffer.from(cached.audioData, 'base64')
          : Buffer.from([]);
        
        return {
          audioBuffer,
          characters,
          cost: 0, // No cost for cached
          cached: true,
        };
      } else {
        console.log('❌ TTS cache MISS, generating new audio');
      }
    }

    // Generate new speech
    try {
      console.log('🎤 Calling OpenAI TTS API...');
      const mp3 = await openai.audio.speech.create({
        model: quality === 'hd' ? 'tts-1-hd' : 'tts-1',
        voice: voiceId as any,
        input: text,
        response_format: 'mp3',
      });

      const buffer = Buffer.from(await mp3.arrayBuffer());
      console.log('✅ TTS audio generated, size:', buffer.length, 'bytes');

      // Cache the result if enabled
      if (this.cacheEnabled) {
        console.log('💾 Saving to TTS cache...');
        await this.saveToCache(text, voiceId, quality, buffer, characters);
      }

      return {
        audioBuffer: buffer,
        characters,
        cost,
        cached: false,
      };
    } catch (error) {
      console.error('❌ TTS generation error:', error);
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
  ): Promise<(CachedTTSResponse & { audioData?: string }) | null> {
    try {
      const db = await getDatabase();
      const textHash = this.hashText(text);

      const cached = await db
        .collection<CachedTTSResponse & { audioData?: string }>(COLLECTIONS.CACHED_TTS)
        .findOne({
          textHash,
          voiceId,
          quality,
        });

      if (cached) {
        console.log('📦 Found cached TTS response');
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
      console.error('❌ TTS cache read error:', error);
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
      const db = await getDatabase();
      const textHash = this.hashText(text);
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

      // Store audio data as base64 in MongoDB
      // For production, consider using GridFS or external storage (R2/S3)
      const audioData = audioBuffer.toString('base64');
      
      console.log('💾 Saving TTS cache entry:', {
        textHash: textHash.substring(0, 8) + '...',
        audioDataSize: audioData.length,
        characters
      });

      await db.collection(COLLECTIONS.CACHED_TTS).insertOne({
        textHash,
        text,
        voiceId,
        quality,
        audioUrl: null, // Not using URL storage for now
        audioData, // Store base64-encoded audio
        characters,
        durationMs: 0,
        hitCount: 0,
        lastUsed: now,
        expiresAt,
        createdAt: now,
      });
      
      console.log('✅ TTS cache saved successfully');
    } catch (error) {
      console.error('❌ TTS cache write error:', error);
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
    console.log('🔄 Pre-caching common TTS phrases...');
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

    let cached = 0;
    for (const phrase of commonPhrases) {
      try {
        await this.generateSpeech(phrase);
        cached++;
      } catch (error) {
        console.error(`❌ Failed to precache phrase: ${phrase}`, error);
      }
    }
    console.log(`✅ Pre-cached ${cached}/${commonPhrases.length} phrases`);
  }
  
  /**
   * Split text into sentences for streaming TTS
   */
  splitIntoSentences(text: string): string[] {
    // Split on sentence boundaries
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    return sentences.map(s => s.trim()).filter(s => s.length > 0);
  }
}

export const ttsService = new TTSService();
