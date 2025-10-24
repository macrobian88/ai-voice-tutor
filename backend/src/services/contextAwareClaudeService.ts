import Anthropic from '@anthropic-ai/sdk';
import { ChapterService } from './chapterService';
import { ObjectId } from 'mongodb';

// Extended usage type to include prompt caching fields
interface ExtendedUsage extends Anthropic.Usage {
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
}

/**
 * Context-Aware Claude Service
 * Implements chapter-scoped conversations with cost optimization
 */
export class ContextAwareClaudeService {
  private client: Anthropic;
  private chapterService: ChapterService;

  // Pre-cached generic responses for off-topic questions
  private readonly OFF_TOPIC_RESPONSES = {
    futureChapter: (
      chapterTitle: string
    ) => `That's a great question, but that topic is covered in a future chapter! Right now, let's focus on mastering ${chapterTitle}. Once you complete this chapter, we'll move on to that topic. Sound good?`,
    
    pastChapter: (
      chapterTitle: string,
      currentChapter: string
    ) => `Good memory! We covered ${chapterTitle} in a previous chapter. Would you like a quick review, or shall we continue with ${currentChapter}?`,
    
    differentSubject: (
      askedSubject: string,
      currentSubject: string,
      currentChapter: string
    ) => `That's from ${askedSubject}! Right now we're focused on ${currentSubject}, specifically ${currentChapter}. Let's stick with that for now.`,
    
    wayOffTopic: (
      currentChapter: string
    ) => `Interesting question! But let's stay focused on ${currentChapter} for now. We'll make better progress if we master one topic at a time. What would you like to explore about ${currentChapter}?`,
    
    encourageReturn: (
      currentChapter: string
    ) => `I notice you're asking about topics outside our current chapter. Let's bring it back to ${currentChapter}. What specific part of this chapter would you like help with?`,
  };

  constructor(apiKey: string, chapterService: ChapterService) {
    this.client = new Anthropic({ apiKey });
    this.chapterService = chapterService;
  }

  /**
   * Main conversation method with chapter-scoped context
   */
  async chat(
    userId: ObjectId,
    userMessage: string,
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>
  ): Promise<{
    response: string;
    inScope: boolean;
    scopeConfidence: number;
    tokensUsed: { input: number; output: number; cached: number };
    wasFiltered: boolean; // True if we used generic response (no Claude call)
  }> {
    // Get current chapter for this user
    const currentChapter = await this.chapterService.getCurrentChapter(userId);

    if (!currentChapter) {
      return {
        response: "Let's get you started with your first chapter! What subject would you like to study?",
        inScope: true,
        scopeConfidence: 1,
        tokensUsed: { input: 0, output: 0, cached: 0 },
        wasFiltered: true,
      };
    }

    // PRE-CALL FILTERING: Check if question is in scope
    // This is the key cost-saving feature!
    const scopeCheck = await this.chapterService.isQuestionInScope(
      userMessage,
      currentChapter.chapterId
    );

    // If clearly off-topic and low confidence, return generic response
    // WITHOUT making an expensive Claude API call
    if (!scopeCheck.inScope || scopeCheck.confidence < 0.3) {
      const genericResponse = this.selectGenericResponse(
        userMessage,
        currentChapter.title
      );

      return {
        response: genericResponse,
        inScope: false,
        scopeConfidence: scopeCheck.confidence,
        tokensUsed: { input: 0, output: 0, cached: 0 },
        wasFiltered: true, // Saved API cost!
      };
    }

    // If in scope or uncertain, proceed with Claude API call
    // with chapter context in system prompt (CACHEABLE)
    const chapterContent = this.chapterService.formatChapterForPrompt(currentChapter);

    const systemPrompt = `You are an expert tutor specializing in ${currentChapter.subject}. 

CURRENT ACTIVE CHAPTER: "${currentChapter.title}"

${chapterContent}

=== CRITICAL INSTRUCTION ===
You MUST only answer questions related to the current chapter: "${currentChapter.title}".

If the student asks about:
1. Topics from future chapters → Politely redirect: "That's covered in a future chapter. Let's master this chapter first!"
2. Topics from past chapters → Offer brief review or redirect to current chapter
3. Topics from different subjects → Gently redirect to current subject
4. Completely unrelated topics → Kindly redirect to the current chapter

Your goal is to keep students focused and help them master ONE chapter at a time.
Always be encouraging, patient, and supportive!

For in-scope questions:
- Provide clear, detailed explanations
- Use examples from the chapter
- Break down complex concepts
- Encourage practice and application
`;

    try {
      const response = await this.client.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 2048,
        system: [
          {
            type: 'text',
            text: systemPrompt,
            cache_control: { type: 'ephemeral' },
          } as any, // Type assertion needed for cache_control
        ],
        messages: [
          ...conversationHistory.map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
          {
            role: 'user',
            content: userMessage,
          },
        ],
      });

      const assistantMessage = response.content[0];
      const messageText =
        assistantMessage.type === 'text' ? assistantMessage.text : '';

      // Cast usage to extended type to access caching fields
      const usage = response.usage as ExtendedUsage;

      return {
        response: messageText,
        inScope: scopeCheck.inScope,
        scopeConfidence: scopeCheck.confidence,
        tokensUsed: {
          input: usage.input_tokens,
          output: usage.output_tokens,
          cached: usage.cache_read_input_tokens || 0,
        },
        wasFiltered: false,
      };
    } catch (error) {
      console.error('Claude API error:', error);
      throw new Error('Failed to generate response');
    }
  }

  /**
   * Select appropriate generic response based on question content
   * This is used when we filter out off-topic questions
   */
  private selectGenericResponse(userMessage: string, currentChapterTitle: string): string {
    const messageLower = userMessage.toLowerCase();

    // Try to detect what kind of off-topic question it is
    const futureIndicators = ['next chapter', 'after this', 'later', 'future'];
    const pastIndicators = ['previous', 'before', 'earlier', 'last chapter', 'remember'];
    const subjectIndicators = ['history', 'science', 'english', 'geography', 'biology'];

    if (futureIndicators.some((indicator) => messageLower.includes(indicator))) {
      return this.OFF_TOPIC_RESPONSES.futureChapter(currentChapterTitle);
    }

    if (pastIndicators.some((indicator) => messageLower.includes(indicator))) {
      return this.OFF_TOPIC_RESPONSES.pastChapter('that topic', currentChapterTitle);
    }

    if (subjectIndicators.some((indicator) => messageLower.includes(indicator))) {
      const detectedSubject = subjectIndicators.find((s) => messageLower.includes(s)) || 'another subject';
      return this.OFF_TOPIC_RESPONSES.differentSubject(
        detectedSubject,
        'Mathematics',
        currentChapterTitle
      );
    }

    // Default: completely off-topic
    return this.OFF_TOPIC_RESPONSES.wayOffTopic(currentChapterTitle);
  }

  /**
   * Calculate approximate cost for a conversation
   */
  calculateCost(tokensUsed: { input: number; output: number; cached: number }): number {
    const INPUT_COST_PER_1M = 3; // $3 per 1M input tokens
    const OUTPUT_COST_PER_1M = 15; // $15 per 1M output tokens
    const CACHED_INPUT_COST_PER_1M = 0.3; // $0.30 per 1M cached tokens (90% discount)

    const inputCost = (tokensUsed.input * INPUT_COST_PER_1M) / 1_000_000;
    const outputCost = (tokensUsed.output * OUTPUT_COST_PER_1M) / 1_000_000;
    const cachedCost = (tokensUsed.cached * CACHED_INPUT_COST_PER_1M) / 1_000_000;

    return inputCost + outputCost + cachedCost;
  }
}
