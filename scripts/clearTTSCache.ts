#!/usr/bin/env ts-node

/**
 * Clear TTS Cache Migration
 * 
 * This script clears the old TTS cache entries that were using placeholder URLs.
 * After the fix, new cache entries will store actual audio data.
 * 
 * Usage:
 *   npm run clear-tts-cache
 *   or
 *   npx ts-node scripts/clearTTSCache.ts
 */

import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in environment variables');
  process.exit(1);
}

async function clearTTSCache() {
  console.log('🔄 Connecting to MongoDB...');
  const client = new MongoClient(MONGODB_URI!);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db();
    const collection = db.collection('cachedTTSResponses');

    // Count existing entries
    const count = await collection.countDocuments();
    console.log(`📊 Found ${count} cached TTS entries`);

    if (count === 0) {
      console.log('✅ Cache is already empty');
      return;
    }

    // Ask for confirmation
    console.log('⚠️  This will delete all cached TTS entries');
    console.log('⚠️  New audio will be regenerated (costs money)');
    console.log('');
    console.log('Type "yes" to continue:');

    // Wait for input (in production, you might want to skip this)
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const answer = await new Promise<string>((resolve) => {
      readline.question('', resolve);
    });
    readline.close();

    if (answer.toLowerCase() !== 'yes') {
      console.log('❌ Cancelled');
      return;
    }

    // Delete all cache entries
    console.log('🗑️  Deleting cache entries...');
    const result = await collection.deleteMany({});
    console.log(`✅ Deleted ${result.deletedCount} cache entries`);

    console.log('');
    console.log('✅ TTS cache cleared successfully!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Restart your app: npm run dev');
    console.log('2. Test audio playback - it should work now');
    console.log('3. Audio will be cached again with proper data');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('👋 Disconnected from MongoDB');
  }
}

// Auto-run if this script is executed directly
if (require.main === module) {
  clearTTSCache()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { clearTTSCache };
