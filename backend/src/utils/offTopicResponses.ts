/**
 * Pre-cached generic responses for common off-topic scenarios
 * These responses are used WITHOUT making Claude API calls
 * Saves ~$0.40/user/month by filtering 20-30% of off-topic questions
 */

export interface OffTopicResponse {
  text: string;
  category: 'future_chapter' | 'past_chapter' | 'different_subject' | 'way_off_topic' | 'encourage_return';
  estimatedCharacters: number;  // For TTS cost estimation
}

/**
 * Generate contextual off-topic responses
 * These can be pre-generated and cached in TTS for even more savings
 */
export class OffTopicResponseGenerator {
  
  static futureChapter(chapterTitle: string): OffTopicResponse {
    return {
      text: `That's a great question! That topic is actually covered in a future chapter. For now, let's focus on mastering "${chapterTitle}" first. Once you complete this chapter, we'll move on to more advanced topics. Sound good?`,
      category: 'future_chapter',
      estimatedCharacters: 200,
    };
  }

  static pastChapter(previousTopic: string, currentChapter: string): OffTopicResponse {
    return {
      text: `Good memory! We covered ${previousTopic} in a previous chapter. Would you like a quick 30-second review, or should we continue with "${currentChapter}"? I'm here to help either way!`,
      category: 'past_chapter',
      estimatedCharacters: 180,
    };
  }

  static differentSubject(askedSubject: string, currentSubject: string, currentChapter: string): OffTopicResponse {
    return {
      text: `That's from ${askedSubject}! Right now we're focused on ${currentSubject}, specifically "${currentChapter}". Let's stick with that for now so you can really master the material. We can explore ${askedSubject} in a different session!`,
      category: 'different_subject',
      estimatedCharacters: 220,
    };
  }

  static wayOffTopic(currentChapter: string): OffTopicResponse {
    return {
      text: `Interesting question! But to help you learn effectively, let's stay focused on "${currentChapter}" for now. We'll make better progress if we master one topic at a time. What specific part of this chapter would you like to explore?`,
      category: 'way_off_topic',
      estimatedCharacters: 210,
    };
  }

  static encourageReturn(currentChapter: string, offTopicCount: number): OffTopicResponse {
    const encouragement = offTopicCount > 3
      ? "I notice we're getting sidetracked. "
      : "";
    
    return {
      text: `${encouragement}Let's bring our focus back to "${currentChapter}". This is important material that will help you succeed. What would you like help with in this chapter?`,
      category: 'encourage_return',
      estimatedCharacters: 180,
    };
  }

  /**
   * Determine which type of off-topic response to use
   */
  static selectResponse(
    userMessage: string,
    currentChapter: string,
    offTopicCount: number
  ): OffTopicResponse {
    const messageLower = userMessage.toLowerCase();

    // Detect future chapter questions
    if (
      messageLower.includes('next chapter') ||
      messageLower.includes('after this') ||
      messageLower.includes('later') ||
      messageLower.includes('future')
    ) {
      return this.futureChapter(currentChapter);
    }

    // Detect past chapter questions
    if (
      messageLower.includes('previous') ||
      messageLower.includes('before') ||
      messageLower.includes('earlier') ||
      messageLower.includes('last chapter') ||
      messageLower.includes('remember')
    ) {
      return this.pastChapter('that topic', currentChapter);
    }

    // Detect different subject
    const subjects = ['history', 'science', 'english', 'geography', 'biology', 'chemistry', 'physics'];
    const detectedSubject = subjects.find(s => messageLower.includes(s));
    if (detectedSubject) {
      return this.differentSubject(detectedSubject, 'Mathematics', currentChapter);
    }

    // If user asked multiple off-topic questions, encourage return
    if (offTopicCount >= 2) {
      return this.encourageReturn(currentChapter, offTopicCount);
    }

    // Default: completely off-topic
    return this.wayOffTopic(currentChapter);
  }
}
