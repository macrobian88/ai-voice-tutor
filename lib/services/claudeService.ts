import Anthropic from '@anthropic-ai/sdk';
import { Chapter } from '@/backend/src/models/database';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ClaudeResponse {
  response: string;
  tokensUsed: {
    inputTokens: number;
    outputTokens: number;
    cachedInputTokens: number;
  };
  cost: number;
  wasFiltered: boolean;
  inScope: boolean;
  scopeConfidence: number;
}

// Extended type for prompt caching support
type SystemPromptWithCache = Array<{
  type: 'text';
  text: string;
  cache_control?: { type: 'ephemeral' };
}>;

export class ClaudeService {
  private promptCachingEnabled = process.env.ENABLE_PROMPT_CACHING === 'true';

  /**
   * Chat with Claude using chapter context
   * Implements prompt caching for cost savings
   */
  async chat(
    userMessage: string,
    chapter: Chapter,
    history: ClaudeMessage[] = [],
    scopeCheck: { inScope: boolean; confidence: number; reason?: string }
  ): Promise<ClaudeResponse> {
    // If question is off-topic, return generic response WITHOUT calling API
    if (!scopeCheck.inScope || scopeCheck.confidence < 0.3) {
      const genericResponse = this.selectGenericResponse(userMessage, chapter.title);
      return {
        response: genericResponse,
        tokensUsed: {
          inputTokens: 0,
          outputTokens: 0,
          cachedInputTokens: 0,
        },
        cost: 0,
        wasFiltered: true,
        inScope: false,
        scopeConfidence: scopeCheck.confidence,
      };
    }

    // Build system prompt with chapter context
    const systemPrompt = this.buildSystemPrompt(chapter);

    // Prepare messages
    const messages: Anthropic.MessageParam[] = [
      ...history.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      {
        role: 'user' as const,
        content: userMessage,
      },
    ];

    try {
      // Build request parameters with proper typing
      const requestParams: Anthropic.MessageCreateParamsNonStreaming = {
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        messages,
        system: systemPrompt, // Default to string
      };

      // Add prompt caching if enabled (using type assertion)
      if (this.promptCachingEnabled) {
        const systemWithCache: SystemPromptWithCache = [
          {
            type: 'text',
            text: systemPrompt,
            cache_control: { type: 'ephemeral' },
          },
        ];
        // Use type assertion to bypass TypeScript's strict checking for prompt caching
        requestParams.system = systemWithCache as any;
      }

      // Call Claude
      const response = await anthropic.messages.create(requestParams);

      // Extract text from response
      const responseText =
        response.content[0].type === 'text' ? response.content[0].text : '';

      // Calculate costs
      const usage = response.usage;
      const inputCost = (usage.input_tokens * 3) / 1_000_000; // $3 per 1M
      const cachedInputCost = ((usage as any).cache_read_input_tokens || 0 * 0.3) / 1_000_000; // 90% discount
      const outputCost = (usage.output_tokens * 15) / 1_000_000; // $15 per 1M
      const totalCost = inputCost + cachedInputCost + outputCost;

      return {
        response: responseText,
        tokensUsed: {
          inputTokens: usage.input_tokens,
          outputTokens: usage.output_tokens,
          cachedInputTokens: (usage as any).cache_read_input_tokens || 0,
        },
        cost: totalCost,
        wasFiltered: false,
        inScope: true,
        scopeConfidence: scopeCheck.confidence,
      };
    } catch (error) {
      console.error('Claude API error:', error);
      throw new Error('Failed to generate response');
    }
  }

  /**
   * Build system prompt with chapter context
   */
  private buildSystemPrompt(chapter: Chapter): string {
    const chapterContent = this.formatChapterContent(chapter);

    return `You are an expert educational tutor specializing in ${chapter.subject} for Grade ${chapter.grade}.

CURRENT CHAPTER: "${chapter.title}"

${chapterContent}

=== STRICT RULES ===
1. ONLY answer questions related to the current chapter: "${chapter.title}"
2. If a student asks about topics from other chapters or subjects:
   - Politely acknowledge their curiosity
   - Tell them which chapter covers that topic (if you know)
   - Encourage them to focus on the current chapter first
   - Example: "That's a great question about [topic]! That's covered in Chapter X. Let's master [current chapter] first!"

3. Teaching Style:
   - Be encouraging and supportive
   - Use clear, simple explanations
   - Provide examples when helpful
   - Ask questions to check understanding
   - Break down complex concepts step-by-step

4. Keep responses concise (2-3 paragraphs max)
5. Use the examples and practice problems in the chapter content to guide your teaching

Your goal is to help students master THIS chapter before moving on.`;
  }

  /**
   * Format chapter content for prompt
   */
  private formatChapterContent(chapter: Chapter): string {
    const concepts = chapter.content.concepts
      .map(
        (c) =>
          `### ${c.title}\n${c.explanation}\n\nKey Points:\n${c.keyPoints.map((p) => `- ${p}`).join('\n')}`
      )
      .join('\n\n');

    const examples = chapter.content.examples
      .map(
        (ex, idx) =>
          `**Example ${idx + 1}:**\n${ex.problem}\n\nSolution:\n${ex.steps.join('\n')}`
      )
      .join('\n\n');

    return `## Learning Objectives:
${chapter.metadata.learningObjectives.map((obj) => `- ${obj}`).join('\n')}

## Concepts:

${concepts}

## Examples:

${examples}`;
  }

  /**
   * Select appropriate generic response for off-topic questions
   */
  private selectGenericResponse(question: string, currentChapterTitle: string): string {
    const responses = [
      `That's an interesting question! However, that topic isn't part of our current chapter: "${currentChapterTitle}". Let's stay focused on what we're learning right now. What would you like to know about ${currentChapterTitle}?`,
      `Great curiosity! But that's from a different chapter. Right now, we're working on "${currentChapterTitle}". Let's master this chapter first, then we can explore other topics!`,
      `I appreciate your question! That topic is covered in another chapter. For now, let's concentrate on "${currentChapterTitle}". What specific part of this chapter would you like help with?`,
      `That's a topic we'll cover later! Right now, let's focus on "${currentChapterTitle}". Do you have any questions about the current chapter?`,
    ];

    // Randomly select a response for variety
    return responses[Math.floor(Math.random() * responses.length)];
  }
}

export const claudeService = new ClaudeService();
