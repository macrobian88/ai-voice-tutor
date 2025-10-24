import { MongoClient } from 'mongodb';
import { ENGLISH_CHAPTERS } from '../backend/src/data/englishChapters';
import { COLLECTIONS, INDEXES } from '../backend/src/models/database';

/**
 * Database seeding script
 * Seeds 2 English chapters and creates indexes
 */
async function seedDatabase() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI environment variable is not set');
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✓ Connected to MongoDB');

    const db = client.db(process.env.MONGODB_DB_NAME || 'ai-voice-tutor');

    // Check if already seeded
    const existingChapters = await db
      .collection(COLLECTIONS.CHAPTERS)
      .countDocuments();

    if (existingChapters > 0) {
      console.log(`⚠ Database already has ${existingChapters} chapters`);
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      return new Promise((resolve) => {
        readline.question(
          'Do you want to re-seed? This will delete existing chapters. (yes/no): ',
          async (answer: string) => {
            readline.close();
            if (answer.toLowerCase() === 'yes') {
              await db.collection(COLLECTIONS.CHAPTERS).deleteMany({});
              console.log('✓ Deleted existing chapters');
              await performSeeding(db);
            } else {
              console.log('Seeding cancelled');
            }
            resolve(true);
          }
        );
      });
    } else {
      await performSeeding(db);
    }
  } catch (error) {
    console.error('✗ Seeding failed:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n✓ Database connection closed');
  }
}

async function performSeeding(db: any) {
  // Seed chapters
  console.log('\n📚 Seeding chapters...');
  const chaptersWithDates = ENGLISH_CHAPTERS.map((chapter) => ({
    ...chapter,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));

  await db.collection(COLLECTIONS.CHAPTERS).insertMany(chaptersWithDates);
  console.log(`✓ Seeded ${ENGLISH_CHAPTERS.length} English chapters`);

  // Create indexes
  console.log('\n📑 Creating indexes...');

  // Users indexes
  for (const index of INDEXES.users) {
    await db.collection(COLLECTIONS.USERS).createIndex(index.key, {
      unique: index.unique,
    });
  }
  console.log(`✓ Created ${INDEXES.users.length} indexes for users`);

  // Sessions indexes
  for (const index of INDEXES.sessions) {
    await db.collection(COLLECTIONS.SESSIONS).createIndex(index.key, {
      expireAfterSeconds: index.expireAfterSeconds,
    });
  }
  console.log(`✓ Created ${INDEXES.sessions.length} indexes for sessions`);

  // Chapters indexes
  for (const index of INDEXES.chapters) {
    await db.collection(COLLECTIONS.CHAPTERS).createIndex(index.key, {
      unique: index.unique,
    });
  }
  console.log(`✓ Created ${INDEXES.chapters.length} indexes for chapters`);

  // User progress indexes
  for (const index of INDEXES.user_progress) {
    await db.collection(COLLECTIONS.USER_PROGRESS).createIndex(index.key, {
      unique: index.unique,
    });
  }
  console.log(`✓ Created ${INDEXES.user_progress.length} indexes for user_progress`);

  // Cached prompts indexes
  for (const index of INDEXES.cached_prompts) {
    await db.collection(COLLECTIONS.CACHED_PROMPTS).createIndex(index.key, {
      unique: index.unique,
      expireAfterSeconds: index.expireAfterSeconds,
    });
  }
  console.log(`✓ Created ${INDEXES.cached_prompts.length} indexes for cached_prompts`);

  // Cached TTS indexes
  for (const index of INDEXES.cached_tts_responses) {
    await db.collection(COLLECTIONS.CACHED_TTS).createIndex(index.key, {
      unique: index.unique,
      expireAfterSeconds: index.expireAfterSeconds,
    });
  }
  console.log(`✓ Created ${INDEXES.cached_tts_responses.length} indexes for cached_tts_responses`);

  // Cost metrics indexes
  for (const index of INDEXES.cost_metrics) {
    await db.collection(COLLECTIONS.COST_METRICS).createIndex(index.key);
  }
  console.log(`✓ Created ${INDEXES.cost_metrics.length} indexes for cost_metrics`);

  console.log('\n✅ Database seeding completed successfully!');
  console.log('\nSeeded chapters:');
  ENGLISH_CHAPTERS.forEach((chapter, idx) => {
    console.log(`  ${idx + 1}. ${chapter.title} (${chapter.chapterId})`);
  });
}

// Run if called directly
if (require.main === module) {
  seedDatabase().catch(console.error);
}

export { seedDatabase };
