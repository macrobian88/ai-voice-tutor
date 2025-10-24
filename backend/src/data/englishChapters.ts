import { Chapter } from '../models/database';

/**
 * Sample English chapters for MVP
 * Only 2 chapters as requested
 */
export const ENGLISH_CHAPTERS: Omit<Chapter, '_id' | 'createdAt' | 'updatedAt'>[] = [
  {
    chapterId: 'english-grammar-basics',
    subject: 'English',
    grade: '8',
    title: 'Grammar Basics: Parts of Speech',
    order: 1,
    content: {
      concepts: [
        {
          id: 'concept-nouns',
          title: 'Nouns',
          explanation: 'A noun is a word that names a person, place, thing, or idea. Nouns are the building blocks of sentences and can be concrete (things you can touch) or abstract (ideas and concepts).',
          keyPoints: [
            'Proper nouns name specific people, places, or things and are always capitalized',
            'Common nouns are general names for people, places, or things',
            'Concrete nouns can be perceived by the senses',
            'Abstract nouns represent ideas, qualities, or states',
          ],
        },
        {
          id: 'concept-verbs',
          title: 'Verbs',
          explanation: 'Verbs are action words or words that show a state of being. They tell us what the subject is doing or what condition the subject is in.',
          keyPoints: [
            'Action verbs express physical or mental actions',
            'Linking verbs connect the subject to additional information',
            'Helping verbs work with main verbs to show tense or possibility',
            'Verbs change form to show tense (past, present, future)',
          ],
        },
        {
          id: 'concept-adjectives',
          title: 'Adjectives',
          explanation: 'Adjectives are words that describe or modify nouns and pronouns. They answer questions like "What kind?" "Which one?" "How many?"',
          keyPoints: [
            'Adjectives can come before the noun they modify',
            'Adjectives can also come after linking verbs',
            'Comparative adjectives compare two things (-er, more)',
            'Superlative adjectives compare three or more (-est, most)',
          ],
        },
      ],
      examples: [
        {
          id: 'example-1',
          problem: 'Identify the nouns, verbs, and adjectives in this sentence: "The quick brown fox jumps over the lazy dog."',
          solution: 'Nouns: fox, dog; Verbs: jumps; Adjectives: quick, brown, lazy',
          steps: [
            'Look for naming words (nouns): fox and dog name animals',
            'Find action words (verbs): jumps shows what the fox is doing',
            'Identify describing words (adjectives): quick and brown describe the fox, lazy describes the dog',
          ],
          difficulty: 'easy',
        },
        {
          id: 'example-2',
          problem: 'Write a sentence using at least two nouns, one verb, and two adjectives.',
          solution: 'Example: "The brilliant student reads interesting books." (Nouns: student, books; Verb: reads; Adjectives: brilliant, interesting)',
          steps: [
            'Choose a subject (noun): student',
            'Add an adjective to describe it: brilliant student',
            'Pick an action (verb): reads',
            'Select an object (noun): books',
            'Add an adjective to describe the object: interesting books',
          ],
          difficulty: 'medium',
        },
      ],
      practiceProblems: [
        {
          id: 'practice-1',
          problem: 'Identify all the parts of speech in this sentence: "My energetic puppy quickly chased the red ball."',
          hint: 'Look for pronouns (my), adjectives (energetic, red), nouns (puppy, ball), adverbs (quickly), and verbs (chased).',
          solution: 'Pronoun: my; Adjectives: energetic, red; Nouns: puppy, ball; Adverb: quickly; Verb: chased',
          difficulty: 'medium',
        },
        {
          id: 'practice-2',
          problem: 'Create three sentences, each highlighting a different part of speech we learned.',
          hint: 'Make one sentence with interesting nouns, one with strong verbs, and one with vivid adjectives.',
          solution: 'Example answers: 1) "The teacher, students, and principal attended the assembly." (nouns) 2) "She swims, dances, and sings beautifully." (verbs) 3) "The enormous, magnificent castle stood proudly." (adjectives)',
          difficulty: 'hard',
        },
      ],
      keywords: [
        'noun',
        'verb',
        'adjective',
        'parts of speech',
        'grammar',
        'sentence',
        'describe',
        'action',
        'naming word',
        'describing word',
      ],
    },
    metadata: {
      difficulty: 'beginner',
      prerequisites: [],
      estimatedMinutes: 35,
      learningObjectives: [
        'Identify nouns, verbs, and adjectives in sentences',
        'Understand the function of each part of speech',
        'Use parts of speech correctly in writing',
        'Distinguish between different types of nouns and verbs',
      ],
    },
    cacheKey: 'chapter:english-grammar-basics',
    tokenCount: 850,
  },
  {
    chapterId: 'english-sentence-structure',
    subject: 'English',
    grade: '8',
    title: 'Sentence Structure and Types',
    order: 2,
    content: {
      concepts: [
        {
          id: 'concept-complete-sentence',
          title: 'What Makes a Complete Sentence',
          explanation: 'A complete sentence must have a subject (who or what the sentence is about) and a predicate (what the subject is doing or what is being said about the subject). It must express a complete thought.',
          keyPoints: [
            'Every sentence needs a subject and a verb',
            'The subject tells us who or what',
            'The predicate tells us what the subject does or is',
            'A complete sentence expresses a complete thought and can stand alone',
          ],
        },
        {
          id: 'concept-sentence-types',
          title: 'Four Types of Sentences',
          explanation: 'There are four main types of sentences based on their purpose: declarative (statement), interrogative (question), imperative (command), and exclamatory (exclamation).',
          keyPoints: [
            'Declarative sentences make statements and end with a period',
            'Interrogative sentences ask questions and end with a question mark',
            'Imperative sentences give commands and usually end with a period',
            'Exclamatory sentences show strong emotion and end with an exclamation mark',
          ],
        },
        {
          id: 'concept-simple-compound',
          title: 'Simple and Compound Sentences',
          explanation: 'Simple sentences have one independent clause. Compound sentences join two independent clauses with a coordinating conjunction (and, but, or, nor, for, so, yet) or a semicolon.',
          keyPoints: [
            'Simple: One subject and one verb (I ran.)',
            'Compound: Two complete thoughts joined together',
            'Use FANBOYS to remember coordinating conjunctions',
            'A comma usually comes before the conjunction in compound sentences',
          ],
        },
      ],
      examples: [
        {
          id: 'example-1',
          problem: 'Identify the subject and predicate in: "The students studied hard for the exam."',
          solution: 'Subject: The students; Predicate: studied hard for the exam',
          steps: [
            'Ask "Who or what is this sentence about?" - The students (subject)',
            'Ask "What did they do?" - studied hard for the exam (predicate)',
            'The subject is the noun phrase before the verb',
            'The predicate includes the verb and everything that follows',
          ],
          difficulty: 'easy',
        },
        {
          id: 'example-2',
          problem: 'Combine these simple sentences into a compound sentence: "I like pizza. My sister prefers pasta."',
          solution: '"I like pizza, but my sister prefers pasta."',
          steps: [
            'Identify that both sentences are complete thoughts',
            'Choose an appropriate coordinating conjunction (but shows contrast)',
            'Place a comma before the conjunction',
            'Join the sentences together',
          ],
          difficulty: 'medium',
        },
      ],
      practiceProblems: [
        {
          id: 'practice-1',
          problem: 'Write one example of each type of sentence: declarative, interrogative, imperative, and exclamatory.',
          hint: 'Think about the purpose of each sentence type and use the correct punctuation.',
          solution: 'Example: Declarative: "The sky is blue." Interrogative: "Is it going to rain?" Imperative: "Close the door." Exclamatory: "What a beautiful day!"',
          difficulty: 'medium',
        },
        {
          id: 'practice-2',
          problem: 'Create two compound sentences using different coordinating conjunctions.',
          hint: 'Remember FANBOYS: for, and, nor, but, or, yet, so. Use a comma before the conjunction.',
          solution: 'Example: "I wanted to go to the park, but it started raining." "She studied all night, so she felt confident about the test."',
          difficulty: 'medium',
        },
      ],
      keywords: [
        'sentence',
        'subject',
        'predicate',
        'declarative',
        'interrogative',
        'imperative',
        'exclamatory',
        'simple sentence',
        'compound sentence',
        'conjunction',
        'complete thought',
      ],
    },
    metadata: {
      difficulty: 'beginner',
      prerequisites: ['english-grammar-basics'],
      estimatedMinutes: 40,
      learningObjectives: [
        'Identify subjects and predicates in sentences',
        'Recognize and write the four types of sentences',
        'Understand the difference between simple and compound sentences',
        'Correctly use coordinating conjunctions to combine sentences',
      ],
    },
    cacheKey: 'chapter:english-sentence-structure',
    tokenCount: 920,
  },
];
