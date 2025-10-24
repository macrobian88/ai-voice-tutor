import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { withAuth, corsHeaders, AuthenticatedNextRequest } from '@/lib/middleware';
import { whisperService } from '@/lib/services/whisperService';
import { claudeService } from '@/lib/services/claudeService';
import { ttsService } from '@/lib/services/ttsService';
import { MongoClient } from 'mongodb';
import { ChapterService } from '@/backend/src/services/chapterService';
import { Session, SessionMessage, COLLECTIONS } from '@/backend/src/models/database';
import { ObjectId } from 'mongodb';

/**
 * Chat API - Main conversation endpoint
 * Handles: Audio transcription -> Chapter scope check -> Claude chat -> TTS generation
 */
export const POST = withAuth(async (req: AuthenticatedNextRequest) => {
  const startTime = Date.now();
  
  try {
    const userId = new ObjectId(req.user!.userId);
    const formData = await req.formData();
    
    const audioFile = formData.get('audio') as File | null;
    const textMessage = formData.get('message') as string | null;
    const sessionId = formData.get('sessionId') as string | null;
    const chapterId = formData.get('chapterId') as string | null;

    // Validate input
    if (!audioFile && !textMessage) {
      return NextResponse.json(
        { error: 'Either audio or text message is required' },
        { status: 400, headers: corsHeaders() }
      );
    }

    if (!chapterId) {
      return NextResponse.json(
        { error: 'Chapter ID is required' },
        { status: 400, headers: corsHeaders() }
      );
    }

    const db = await getDatabase();
    const client = await (db as any).client || new MongoClient(process.env.MONGODB_URI!);
    const chapterService = new ChapterService(client);

    // Get chapter
    const chapter = await chapterService.getChapter(chapterId);
    if (!chapter) {
      return NextResponse.json(
        { error: 'Chapter not found' },
        { status: 404, headers: corsHeaders() }
      );
    }

    // Step 1: Transcribe audio if provided
    let userMessage = textMessage || '';
    let transcriptionCost = 0;
    let audioDuration = 0;

    if (audioFile) {
      const audioBuffer = Buffer.from(await audioFile.arrayBuffer());
      const transcription = await whisperService.transcribe(audioBuffer, audioFile.name);
      userMessage = transcription.text;
      transcriptionCost = transcription.cost;
      audioDuration = transcription.duration;
    }

    // Step 2: Check if question is in scope (pre-filter to save costs)
    const scopeCheck = await chapterService.isQuestionInScope(userMessage, chapterId);

    // Step 3: Get conversation history
    let session: Session | null = null;
    let history: SessionMessage[] = [];

    if (sessionId) {
      session = await db
        .collection<Session>(COLLECTIONS.SESSIONS)
        .findOne({ _id: new ObjectId(sessionId) });
      if (session) {
        history = session.messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        }));
      }
    }

    // Create new session if needed
    if (!session) {
      const now = new Date();
      const newSession: Session = {
        userId,
        startTime: now,
        chapterId,
        subject: chapter.subject,
        topic: chapter.title,
        offTopicAttempts: 0,
        messages: [],
        costs: {
          whisperCost: 0,
          claudeCost: 0,
          ttsCost: 0,
          totalCost: 0,
        },
        tokens: {
          inputTokens: 0,
          outputTokens: 0,
          cachedInputTokens: 0,
          cacheCreationTokens: 0,
        },
        tts: {
          charactersGenerated: 0,
          cacheHits: 0,
          cacheMisses: 0,
        },
        audio: {
          totalAudioMinutes: 0,
        },
        metrics: {
          averageLatency: 0,
          completionReason: 'user_ended',
        },
        createdAt: now,
        updatedAt: now,
      };

      const result = await db.collection<Session>(COLLECTIONS.SESSIONS).insertOne(newSession);
      session = { ...newSession, _id: result.insertedId };
    }

    // Step 4: Generate Claude response
    const claudeResponse = await claudeService.chat(
      userMessage,
      chapter,
      history as any,
      scopeCheck
    );

    // Step 5: Generate TTS for response
    const ttsResult = await ttsService.generateSpeech(claudeResponse.response);

    // Step 6: Save messages to session
    const userMsg: SessionMessage = {
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
      isInScope: scopeCheck.inScope,
      scopeConfidence: scopeCheck.confidence,
      audioDurationMs: audioDuration * 1000,
    };

    const assistantMsg: SessionMessage = {
      role: 'assistant',
      content: claudeResponse.response,
      timestamp: new Date(),
      tokensUsed: claudeResponse.tokensUsed.inputTokens + claudeResponse.tokensUsed.outputTokens,
      cachedTokens: claudeResponse.tokensUsed.cachedInputTokens,
      generationLatency: Date.now() - startTime,
      ttsCharacters: ttsResult.characters,
      ttsCached: ttsResult.cached,
    };

    // Update session
    const updatedCosts = {
      whisperCost: session.costs.whisperCost + transcriptionCost,
      claudeCost: session.costs.claudeCost + claudeResponse.cost,
      ttsCost: session.costs.ttsCost + ttsResult.cost,
      totalCost:
        session.costs.totalCost + transcriptionCost + claudeResponse.cost + ttsResult.cost,
    };

    const updatedTokens = {
      inputTokens: session.tokens.inputTokens + claudeResponse.tokensUsed.inputTokens,
      outputTokens: session.tokens.outputTokens + claudeResponse.tokensUsed.outputTokens,
      cachedInputTokens:
        session.tokens.cachedInputTokens + claudeResponse.tokensUsed.cachedInputTokens,
      cacheCreationTokens: session.tokens.cacheCreationTokens,
    };

    const updatedTTS = {
      charactersGenerated: session.tts.charactersGenerated + ttsResult.characters,
      cacheHits: session.tts.cacheHits + (ttsResult.cached ? 1 : 0),
      cacheMisses: session.tts.cacheMisses + (ttsResult.cached ? 0 : 1),
    };

    await db.collection<Session>(COLLECTIONS.SESSIONS).updateOne(
      { _id: session._id },
      {
        $push: {
          messages: { $each: [userMsg, assistantMsg] },
        } as any,
        $set: {
          costs: updatedCosts,
          tokens: updatedTokens,
          tts: updatedTTS,
          updatedAt: new Date(),
          offTopicAttempts: (session.offTopicAttempts || 0) + (!scopeCheck.inScope ? 1 : 0),
        },
      }
    );

    // Step 7: Update user progress
    if (scopeCheck.inScope) {
      await chapterService.updateProgress(userId, chapterId, {
        sessionsCount: 1,
        performance: {
          questionsAsked: 1,
          offTopicAttempts: 0,
          practiceProblemsCompleted: 0,
          masteryScore: 0,
        },
      } as any);
    }

    // Return response
    return NextResponse.json(
      {
        sessionId: session._id!.toString(),
        message: claudeResponse.response,
        audio: ttsResult.audioUrl || null,
        audioBuffer: ttsResult.cached ? null : ttsResult.audioBuffer.toString('base64'),
        inScope: claudeResponse.inScope,
        scopeConfidence: claudeResponse.scopeConfidence,
        wasFiltered: claudeResponse.wasFiltered,
        costs: {
          whisper: transcriptionCost,
          claude: claudeResponse.cost,
          tts: ttsResult.cost,
          total: transcriptionCost + claudeResponse.cost + ttsResult.cost,
        },
        tokens: claudeResponse.tokensUsed,
        latency: Date.now() - startTime,
      },
      { headers: corsHeaders() }
    );
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat request', details: (error as Error).message },
      { status: 500, headers: corsHeaders() }
    );
  }
});

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders() });
}
