#!/usr/bin/env ts-node

/**
 * Database Seeding Script
 * 
 * Seeds the MongoDB database with:
 * - Sample chapters (Math Grade 8 + English Grammar)
 * - Cached TTS responses
 * - Database indexes
 * 
 * Usage:
 *   npm run seed -- --all           # Seed everything
 *   npm run seed -- --chapters      # Seed chapters only
 *   npm run seed -- --indexes       # Create indexes only
 *   npm run seed -- --tts           # Seed TTS cache only
 */

import { MongoClient, Db, ObjectId } from 'mongodb';
import { SAMPLE_CHAPTERS } from '../backend/src/data/sampleChapters';
import { ENGLISH_CHAPTERS } from '../backend/src/data/englishChapters';
import { COLLECTIONS, Chapter, CachedTTSResponse } from '../backend/src/models/database';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const MONGODB_URI = process.env.MONGODB_URI || '';
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'ai-voice-tutor';

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in environment variables');
  process.exit(1);
}

// Common TTS responses to cache
const COMMON_TTS_RESPONSES: Omit<CachedTTSResponse, '_id'>[] = [
  {
    text: "Hello! I'm your AI tutor. I'm here to help you learn. What would you like to study today?",
    audioUrl: null,
    audioBuffer: Buffer.from(''),
    characters: 95,
    voice: 'alloy',
    model: 'tts-1',
    createdAt: new Date(),
    lastUsed: new Date(),
    useCount: 0,
  },
  {
    text: "That's a great question! Let me explain that for you.",
    audioUrl: null,
    audioBuffer: Buffer.from(''),
    characters: 56,
    voice: 'alloy',
    model: 'tts-1',
    createdAt: new Date(),
    lastUsed: new Date(),
    useCount: 0,
  },
  {
    text: "That's from a different chapter! We're currently focusing on this topic. Let's stay on track.",
    audioUrl: null,
    audioBuffer: Buffer.from(''),
    characters: 94,
    voice: 'alloy',
    model: 'tts-1',
    createdAt: new Date(),
    lastUsed: new Date(),
    useCount: 0,
  },
  {
    text: "Excellent work! You're really getting the hang of this.",
    audioUrl: null,
    audioBuffer: Buffer.from(''),
    characters: 56,
    voice: 'alloy',
    model: 'tts-1',
    createdAt: new Date(),
    lastUsed: new Date(),
    useCount: 0,
  },
  {
    text: "That's covered in a future chapter. For now, let's master this topic first.",
    audioUrl: null,
    audioBuffer: Buffer.from(''),
    characters: 77,
    voice: 'alloy',
    model: 'tts-1',
    createdAt: new Date(),
    lastUsed: new Date(),
    useCount: 0,
  },
];

async function createIndexes(db: Db) {
  console.log('\n📊 Creating database indexes...');

  try {
    // Users collection indexes
    await db.collection(COLLECTIONS.USERS).createIndexes([
      { key: { email: 1 }, unique: true, name: 'email_unique' },
      { key: { createdAt: -1 }, name: 'created_at_desc' },
      { key: { 'subscription.tier': 1 }, name: 'subscription_tier' },
    ]);
    console.log('✅ Users indexes created');

    // Sessions collection indexes
    await db.collection(COLLECTIONS.SESSIONS).createIndexes([
      { key: { userId: 1, startTime: -1 }, name: 'user_sessions' },
      { key: { chapterId: 1 }, name: 'chapter_sessions' },
      { key: { startTime: -1 }, name: 'start_time_desc' },
    ]);
    console.log('✅ Sessions indexes created');

    // Chapters collection indexes
    await db.collection(COLLECTIONS.CHAPTERS).createIndexes([
      { key: { chapterId: 1 }, unique: true, name: 'chapter_id_unique' },
      { key: { subject: 1, grade: 1 }, name: 'subject_grade' },
      { key: { 'metadata.difficulty': 1 }, name: 'difficulty' },
    ]);
    console.log('✅ Chapters indexes created');

    // User Progress collection indexes
    await db.collection(COLLECTIONS.USER_PROGRESS).createIndexes([
      { key: { userId: 1, chapterId: 1 }, unique: true, name: 'user_chapter_unique' },
      { key: { userId: 1, isCompleted: 1 }, name: 'user_completed' },
      { key: { 'performance.masteryScore': -1 }, name: 'mastery_score_desc' },
    ]);
    console.log('✅ User Progress indexes created');

    // Cached Prompts collection indexes
    await db.collection(COLLECTIONS.CACHED_PROMPTS).createIndexes([
      { key: { promptHash: 1 }, unique: true, name: 'prompt_hash_unique' },
      { key: { lastUsed: -1 }, name: 'last_used_desc' },
      { key: { useCount: -1 }, name: 'use_count_desc' },
    ]);
    console.log('✅ Cached Prompts indexes created');

    // Cached TTS collection indexes
    await db.collection(COLLECTIONS.CACHED_TTS).createIndexes([
      { key: { text: 1, voice: 1, model: 1 }, unique: true, name: 'tts_unique' },
      { key: { lastUsed: -1 }, name: 'last_used_desc' },
      { key: { useCount: -1 }, name: 'use_count_desc' },
    ]);
    console.log('✅ Cached TTS indexes created');

    // Cost Metrics collection indexes
    await db.collection(COLLECTIONS.COST_METRICS).createIndexes([
      { key: { userId: 1, date: -1 }, name: 'user_date' },
      { key: { date: -1 }, name: 'date_desc' },
    ]);
    console.log('✅ Cost Metrics indexes created');

    console.log('✅ All indexes created successfully');
  } catch (error) {
    console.error('❌ Error creating indexes:', error);
    throw error;
  }
}

async function seedChapters(db: Db) {
  console.log('\n📚 Seeding chapters...');

  const allChapters = [
    ...SAMPLE_CHAPTERS,
    ...ENGLISH_CHAPTERS,
  ];

  try {
    const chaptersCollection = db.collection<Chapter>(COLLECTIONS.CHAPTERS);

    // Check existing chapters
    const existingChapters = await chaptersCollection.find({}).toArray();
    console.log(`Found ${existingChapters.length} existing chapters`);

    // Insert only new chapters
    let insertedCount = 0;
    let skippedCount = 0;

    for (const chapter of allChapters) {
      const exists = existingChapters.some(
        (existing) => existing.chapterId === chapter.chapterId
      );

      if (!exists) {
        await chaptersCollection.insertOne(chapter as any);
        console.log(`✅ Inserted: ${chapter.subject} - ${chapter.title}`);
        insertedCount++;
      } else {
        console.log(`⏭️  Skipped: ${chapter.subject} - ${chapter.title} (already exists)`);
        skippedCount++;
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Inserted: ${insertedCount} chapters`);
    console.log(`   Skipped: ${skippedCount} chapters`);
    console.log(`   Total: ${existingChapters.length + insertedCount} chapters in database`);
  } catch (error) {
    console.error('❌ Error seeding chapters:', error);
    throw error;
  }
}

async function seedTTSCache(db: Db) {
  console.log('\n🔊 Seeding TTS cache...');

  try {
    const ttsCollection = db.collection<CachedTTSResponse>(COLLECTIONS.CACHED_TTS);

    // Check existing cached responses
    const existingResponses = await ttsCollection.find({}).toArray();
    console.log(`Found ${existingResponses.length} existing cached TTS responses`);

    let insertedCount = 0;
    let skippedCount = 0;

    for (const response of COMMON_TTS_RESPONSES) {
      const exists = existingResponses.some(
        (existing) => existing.text === response.text && existing.voice === response.voice
      );

      if (!exists) {
        await ttsCollection.insertOne(response as any);
        console.log(`✅ Cached: "${response.text.substring(0, 50)}..."`);
        insertedCount++;
      } else {
        console.log(`⏭️  Skipped: "${response.text.substring(0, 50)}..." (already cached)`);
        skippedCount++;
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Inserted: ${insertedCount} TTS responses`);
    console.log(`   Skipped: ${skippedCount} TTS responses`);
    console.log(`   Total: ${existingResponses.length + insertedCount} cached responses`);
  } catch (error) {
    console.error('❌ Error seeding TTS cache:', error);
    throw error;
  }
}

async function main() {
  console.log('🌱 AI Voice Tutor - Database Seeding Script');
  console.log('==========================================\n');

  const args = process.argv.slice(2);
  const seedAll = args.includes('--all') || args.length === 0;
  const seedChaptersOnly = args.includes('--chapters');
  const seedIndexesOnly = args.includes('--indexes');
  const seedTTSOnly = args.includes('--tts');

  let client: MongoClient | null = null;

  try {
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db(MONGODB_DB_NAME);
    console.log(`📂 Using database: ${MONGODB_DB_NAME}`);

    // Execute seeding based on arguments
    if (seedAll || seedIndexesOnly) {
      await createIndexes(db);
    }

    if (seedAll || seedChaptersOnly) {
      await seedChapters(db);
    }

    if (seedAll || seedTTSOnly) {
      await seedTTSCache(db);
    }

    console.log('\n✨ Seeding completed successfully!\n');
  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 Disconnected from MongoDB');
    }
  }
}

// Run the script
main();
