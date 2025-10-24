import OpenAI from 'openai';
import { Blob } from 'buffer';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface TranscriptionResult {
  text: string;
  duration: number;
  cost: number;
}

export class WhisperService {
  /**
   * Transcribe audio to text using Whisper API
   * Cost: $0.006 per minute
   */
  async transcribe(audioBuffer: Buffer, filename: string = 'audio.mp3'): Promise<TranscriptionResult> {
    const startTime = Date.now();

    try {
      // Convert Buffer to File using Blob
      // First create a Blob from the buffer
      const blob = new Blob([audioBuffer], { type: 'audio/mp3' });
      
      // Then create a File from the Blob
      const file = new File([blob], filename, { type: 'audio/mp3' });

      const transcription = await openai.audio.transcriptions.create({
        file,
        model: 'whisper-1',
        response_format: 'verbose_json',
      });

      const duration = (transcription as any).duration || 0; // Duration in seconds
      const cost = (duration / 60) * 0.006; // $0.006 per minute

      return {
        text: transcription.text,
        duration,
        cost,
      };
    } catch (error) {
      console.error('Whisper transcription error:', error);
      throw new Error('Failed to transcribe audio');
    }
  }

  /**
   * Calculate cost for given duration
   */
  calculateCost(durationSeconds: number): number {
    return (durationSeconds / 60) * 0.006;
  }
}

export const whisperService = new WhisperService();
