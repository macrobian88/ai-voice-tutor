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
    const streamEnabled = formData.get('stream') === 'true';

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
        history = session.messages;
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

    // Step 4: Determine if we should use streaming
    if (streamEnabled && scopeCheck.inScope) {
      return handleStreamingResponse(
        req,
        userMessage,
        chapter,
        history,
        scopeCheck,
        session,
        transcriptionCost,
        audioDuration,
        startTime
      );
    }

    // Step 5: Generate Claude response (non-streaming fallback)
    const claudeResponse = await claudeService.chat(
      userMessage,
      chapter,
      history as any,
      scopeCheck
    );

    // Step 6: Generate TTS for response
    const ttsResult = await ttsService.generateSpeech(claudeResponse.response);

    // Step 7: Save messages to session
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

    // Step 8: Update user progress
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

/**
 * Handle streaming response for lower latency
 */
async function handleStreamingResponse(
  req: AuthenticatedNextRequest,
  userMessage: string,
  chapter: any,
  history: SessionMessage[],
  scopeCheck: any,
  session: Session,
  transcriptionCost: number,
  audioDuration: number,
  startTime: number
) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        let fullResponse = '';
        let totalInputTokens = 0;
        let totalOutputTokens = 0;
        let cachedInputTokens = 0;
        let ttsCost = 0;
        let ttsCharacters = 0;
        let audioChunks: Buffer[] = [];

        // Stream Claude response and generate TTS in parallel
        const claudeStream = claudeService.chatStream(
          userMessage,
          chapter,
          history as any,
          scopeCheck
        );

        let sentenceBuffer = '';

        for await (const chunk of claudeStream) {
          fullResponse += chunk.text;
          sentenceBuffer += chunk.text;

          // Check if we have complete sentences
          const sentences = ttsService.splitIntoSentences(sentenceBuffer);
          
          if (sentences.length > 1 || chunk.isComplete) {
            // Process all but the last sentence (which might be incomplete)
            const completeSentences = chunk.isComplete ? sentences : sentences.slice(0, -1);
            sentenceBuffer = chunk.isComplete ? '' : sentences[sentences.length - 1];

            // Generate TTS for complete sentences
            for (const sentence of completeSentences) {
              if (sentence.trim()) {
                const ttsResult = await ttsService.generateSpeech(sentence);
                ttsCost += ttsResult.cost;
                ttsCharacters += ttsResult.characters;

                if (!ttsResult.cached) {
                  audioChunks.push(ttsResult.audioBuffer);

                  // Send audio chunk to client
                  const data = JSON.stringify({
                    type: 'audio',
                    data: ttsResult.audioBuffer.toString('base64'),
                    text: sentence,
                  });
                  controller.enqueue(encoder.encode(`data: ${data}\n\n`));
                }
              }
            }
          }

          // Send text chunk to client
          if (chunk.text) {
            const data = JSON.stringify({
              type: 'text',
              data: chunk.text,
            });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          }

          // Update token counts on completion
          if (chunk.isComplete && chunk.tokensUsed) {
            totalInputTokens = chunk.tokensUsed.inputTokens;
            totalOutputTokens = chunk.tokensUsed.outputTokens;
            cachedInputTokens = chunk.tokensUsed.cachedInputTokens;
          }
        }

        // Calculate final costs
        const inputCost = (totalInputTokens * 3) / 1_000_000;
        const cachedInputCost = (cachedInputTokens * 0.3) / 1_000_000;
        const outputCost = (totalOutputTokens * 15) / 1_000_000;
        const claudeCost = inputCost + cachedInputCost + outputCost;

        // Save session data
        const db = await getDatabase();
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
          content: fullResponse,
          timestamp: new Date(),
          tokensUsed: totalInputTokens + totalOutputTokens,
          cachedTokens: cachedInputTokens,
          generationLatency: Date.now() - startTime,
          ttsCharacters,
          ttsCached: false,
        };

        await db.collection<Session>(COLLECTIONS.SESSIONS).updateOne(
          { _id: session._id },
          {
            $push: {
              messages: { $each: [userMsg, assistantMsg] },
            } as any,
            $set: {
              costs: {
                whisperCost: session.costs.whisperCost + transcriptionCost,
                claudeCost: session.costs.claudeCost + claudeCost,
                ttsCost: session.costs.ttsCost + ttsCost,
                totalCost: session.costs.totalCost + transcriptionCost + claudeCost + ttsCost,
              },
              tokens: {
                inputTokens: session.tokens.inputTokens + totalInputTokens,
                outputTokens: session.tokens.outputTokens + totalOutputTokens,
                cachedInputTokens: session.tokens.cachedInputTokens + cachedInputTokens,
                cacheCreationTokens: session.tokens.cacheCreationTokens,
              },
              tts: {
                charactersGenerated: session.tts.charactersGenerated + ttsCharacters,
                cacheHits: session.tts.cacheHits,
                cacheMisses: session.tts.cacheMisses + audioChunks.length,
              },
              updatedAt: new Date(),
            },
          }
        );

        // Send completion event
        const completionData = JSON.stringify({
          type: 'complete',
          sessionId: session._id!.toString(),
          costs: {
            whisper: transcriptionCost,
            claude: claudeCost,
            tts: ttsCost,
            total: transcriptionCost + claudeCost + ttsCost,
          },
          tokens: {
            inputTokens: totalInputTokens,
            outputTokens: totalOutputTokens,
            cachedInputTokens,
          },
          latency: Date.now() - startTime,
        });
        controller.enqueue(encoder.encode(`data: ${completionData}\n\n`));

        controller.close();
      } catch (error) {
        console.error('Streaming error:', error);
        const errorData = JSON.stringify({
          type: 'error',
          error: (error as Error).message,
        });
        controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
        controller.close();
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      ...corsHeaders(),
    },
  });
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders() });
}
