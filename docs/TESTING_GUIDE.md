# 🧪 Testing Guide - AI Voice Tutor

Complete guide to test your AI Voice Tutor application at every level.

## 📋 Table of Contents

1. [Pre-Testing Setup](#pre-testing-setup)
2. [Backend Services Testing](#backend-services-testing)
3. [API Endpoints Testing](#api-endpoints-testing)
4. [Frontend Testing](#frontend-testing)
5. [Integration Testing](#integration-testing)
6. [Performance Testing](#performance-testing)
7. [Cost Tracking Testing](#cost-tracking-testing)

---

## Pre-Testing Setup

### 1. Verify Environment Setup

```bash
# Check all API keys are present
node -e "
require('dotenv').config({ path: '.env.local' });
const keys = ['ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'MONGODB_URI', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'NEXTAUTH_SECRET'];
keys.forEach(k => console.log(process.env[k] ? '✅ ' + k : '❌ ' + k + ' MISSING'));
"
```

### 2. Install Dependencies

```bash
# Install all packages
npm install

# Install testing dependencies
npm install --save-dev @jest/globals jest ts-jest @types/jest
npm install --save-dev supertest @types/supertest
```

### 3. Database Setup

```bash
# Connect to MongoDB and create test database
mongosh "$MONGODB_URI"

# In MongoDB shell:
use ai-voice-tutor-test
db.createCollection("test")
show dbs
```

---

## Backend Services Testing

### Test 1: Chapter Service

Create `backend/src/services/__tests__/chapterService.test.ts`:

```typescript
import { MongoClient } from 'mongodb';
import { ChapterService } from '../chapterService';
import { SAMPLE_CHAPTERS } from '../../data/sampleChapters';

describe('ChapterService', () => {
  let client: MongoClient;
  let chapterService: ChapterService;

  beforeAll(async () => {
    client = new MongoClient(process.env.MONGODB_URI!);
    await client.connect();
    chapterService = new ChapterService(client);

    // Seed test data
    const db = client.db();
    await db.collection('chapters').insertMany(SAMPLE_CHAPTERS);
  });

  afterAll(async () => {
    await client.close();
  });

  test('should get chapter by ID', async () => {
    const chapter = await chapterService.getChapter('algebra-intro');
    expect(chapter).toBeDefined();
    expect(chapter?.title).toBe('Introduction to Algebra');
  });

  test('should cache chapters', async () => {
    // First call
    const start1 = Date.now();
    await chapterService.getChapter('algebra-intro');
    const time1 = Date.now() - start1;

    // Second call (should be cached)
    const start2 = Date.now();
    await chapterService.getChapter('algebra-intro');
    const time2 = Date.now() - start2;

    expect(time2).toBeLessThan(time1);
  });

  test('should detect in-scope questions', async () => {
    const result = await chapterService.isQuestionInScope(
      'How do I solve 2x + 5 = 15?',
      'linear-equations'
    );

    expect(result.inScope).toBe(true);
    expect(result.confidence).toBeGreaterThan(0.3);
  });

  test('should detect off-topic questions', async () => {
    const result = await chapterService.isQuestionInScope(
      'What is the Pythagorean theorem?',
      'linear-equations'
    );

    expect(result.inScope).toBe(false);
    expect(result.confidence).toBeLessThan(0.3);
  });
});
```

Run test:
```bash
npm test -- chapterService.test.ts
```

### Test 2: Context-Aware Claude Service

Create `backend/src/services/__tests__/contextAwareClaudeService.test.ts`:

```typescript
import { MongoClient } from 'mongodb';
import { ContextAwareClaudeService } from '../contextAwareClaudeService';
import { ChapterService } from '../chapterService';
import { ObjectId } from 'mongodb';

describe('ContextAwareClaudeService', () => {
  let client: MongoClient;
  let claudeService: ContextAwareClaudeService;
  let chapterService: ChapterService;

  beforeAll(async () => {
    client = new MongoClient(process.env.MONGODB_URI!);
    await client.connect();
    chapterService = new ChapterService(client);
    claudeService = new ContextAwareClaudeService(
      process.env.ANTHROPIC_API_KEY!,
      chapterService
    );

    // Seed test user with current chapter
    const db = client.db();
    await db.collection('user_progress').insertOne({
      userId: new ObjectId('507f1f77bcf86cd799439011'),
      subject: 'Mathematics',
      grade: '8',
      chapters: [
        {
          chapterId: 'linear-equations',
          status: 'in_progress',
          lastAccessedAt: new Date()
        }
      ]
    });
  });

  afterAll(async () => {
    await client.close();
  });

  test('should respond to in-scope question', async () => {
    const userId = new ObjectId('507f1f77bcf86cd799439011');
    const result = await claudeService.chat(
      userId,
      'How do I solve x + 5 = 12?',
      []
    );

    expect(result.response).toBeDefined();
    expect(result.inScope).toBe(true);
    expect(result.wasFiltered).toBe(false);
    expect(result.tokensUsed.output).toBeGreaterThan(0);
  });

  test('should filter off-topic question', async () => {
    const userId = new ObjectId('507f1f77bcf86cd799439011');
    const result = await claudeService.chat(
      userId,
      'What is the capital of France?',
      []
    );

    expect(result.response).toBeDefined();
    expect(result.inScope).toBe(false);
    expect(result.wasFiltered).toBe(true);
    expect(result.tokensUsed.input).toBe(0); // No API call!
    expect(result.tokensUsed.output).toBe(0);
  });

  test('should calculate cost correctly', () => {
    const cost = claudeService.calculateCost({
      input: 1000,
      output: 500,
      cached: 2000
    });

    expect(cost).toBeCloseTo(0.011); // (1000*3 + 500*15 + 2000*0.3) / 1M
  });
});
```

---

## API Endpoints Testing

### Test 3: Chat API (Once Created)

Create `app/api/chat/__tests__/route.test.ts`:

```typescript
import { POST } from '../route';
import { NextRequest } from 'next/server';

describe('Chat API', () => {
  test('should handle in-scope question', async () => {
    const request = new NextRequest('http://localhost:3000/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        userId: '507f1f77bcf86cd799439011',
        message: 'How do I solve 2x = 10?',
        sessionId: 'test-session-123'
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.response).toBeDefined();
    expect(data.inScope).toBe(true);
  });

  test('should handle off-topic question', async () => {
    const request = new NextRequest('http://localhost:3000/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        userId: '507f1f77bcf86cd799439011',
        message: 'Tell me about dinosaurs',
        sessionId: 'test-session-123'
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.response).toBeDefined();
    expect(data.wasFiltered).toBe(true);
  });

  test('should reject missing parameters', async () => {
    const request = new NextRequest('http://localhost:3000/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: 'Test message' // Missing userId and sessionId
      })
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});
```

### Test 4: Manual API Testing with cURL

Create `scripts/test-api.sh`:

```bash
#!/bin/bash

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🧪 Testing AI Voice Tutor APIs"
echo "================================"
echo ""

# Test 1: Chat API - In-scope question
echo -e "${YELLOW}Test 1: Chat API (in-scope question)${NC}"
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "507f1f77bcf86cd799439011",
    "message": "How do I solve x + 5 = 12?",
    "sessionId": "test-session-1"
  }' | jq '.'

echo ""
echo "---"
echo ""

# Test 2: Chat API - Off-topic question
echo -e "${YELLOW}Test 2: Chat API (off-topic question)${NC}"
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "507f1f77bcf86cd799439011",
    "message": "What is the capital of France?",
    "sessionId": "test-session-1"
  }' | jq '.'

echo ""
echo "---"
echo ""

# Test 3: Get Chapters
echo -e "${YELLOW}Test 3: Get Chapters${NC}"
curl http://localhost:3000/api/chapters/Mathematics/8 | jq '.'

echo ""
echo "---"
echo ""

# Test 4: Get User Progress
echo -e "${YELLOW}Test 4: Get User Progress${NC}"
curl http://localhost:3000/api/progress/507f1f77bcf86cd799439011 | jq '.'

echo ""
echo -e "${GREEN}✅ Tests Complete${NC}"
```

Make executable and run:
```bash
chmod +x scripts/test-api.sh
./scripts/test-api.sh
```

---

## Manual Testing Checklist

### Test 5: End-to-End User Flow

Create `scripts/e2e-test.md`:

```markdown
# End-to-End Manual Test

## Setup
- [ ] Application running: `npm run dev`
- [ ] Database connected
- [ ] API keys configured

## Test Flow: New User Journey

### 1. User Registration
- [ ] Go to http://localhost:3000/signup
- [ ] Enter email: test@example.com
- [ ] Enter password: TestPassword123!
- [ ] Click "Sign Up"
- [ ] ✅ User created successfully

### 2. Subject Selection
- [ ] Choose subject: Mathematics
- [ ] Choose grade: 8th Grade
- [ ] Click "Start Learning"
- [ ] ✅ Progress initialized

### 3. Chapter 1: Introduction to Algebra
- [ ] Chapter loads correctly
- [ ] Ask question: "What is a variable?"
- [ ] ✅ Gets in-scope response
- [ ] ✅ Response is relevant to algebra
- [ ] ✅ No errors in console

### 4. Test Off-Topic Filtering
- [ ] Ask: "What is the Pythagorean theorem?"
- [ ] ✅ Gets redirect message
- [ ] ✅ Message is encouraging
- [ ] ✅ No Claude API call made (check logs)

### 5. Progress Tracking
- [ ] Complete 3 questions
- [ ] Go to Progress Dashboard
- [ ] ✅ Questions count shows 3
- [ ] ✅ Chapter progress shows correct %
- [ ] ✅ Off-topic attempts tracked

### 6. Chapter Navigation
- [ ] Try to access Chapter 2
- [ ] ✅ Shows "Complete Chapter 1 first" or allows access
- [ ] Complete Chapter 1
- [ ] ✅ Chapter 2 unlocks

### 7. Voice Features (If Implemented)
- [ ] Click microphone button
- [ ] Speak: "How do I solve two x equals ten?"
- [ ] ✅ Audio recorded
- [ ] ✅ Transcribed correctly
- [ ] ✅ Gets appropriate response
- [ ] ✅ Response audio plays

### 8. Session Persistence
- [ ] Refresh page
- [ ] ✅ Still logged in
- [ ] ✅ Current chapter remembered
- [ ] ✅ Progress persisted

### 9. Cost Tracking
- [ ] Check database: `db.sessions.findOne()`
- [ ] ✅ Tokens tracked
- [ ] ✅ Costs calculated
- [ ] ✅ Cache hits recorded
```

---

## Performance Testing

### Test 6: Load Testing

Create `scripts/load-test.js`:

```javascript
const axios = require('axios');

async function loadTest() {
  console.log('🔥 Starting Load Test\n');
  
  const questions = [
    'How do I solve x + 5 = 12?',
    'What is 2x + 3x?',
    'Explain variables',
    'Help me with equations'
  ];
  
  const results = {
    successful: 0,
    failed: 0,
    totalTime: 0,
    responses: []
  };
  
  const numRequests = 20;
  
  for (let i = 0; i < numRequests; i++) {
    const question = questions[i % questions.length];
    const start = Date.now();
    
    try {
      const response = await axios.post('http://localhost:3000/api/chat', {
        userId: '507f1f77bcf86cd799439011',
        message: question,
        sessionId: `load-test-${i}`
      });
      
      const time = Date.now() - start;
      results.successful++;
      results.totalTime += time;
      results.responses.push({
        question,
        time,
        inScope: response.data.inScope,
        wasFiltered: response.data.wasFiltered
      });
      
      console.log(`✅ Request ${i + 1}: ${time}ms`);
    } catch (error) {
      results.failed++;
      console.log(`❌ Request ${i + 1}: Failed`);
    }
  }
  
  console.log('\n📊 Results:');
  console.log(`Total Requests: ${numRequests}`);
  console.log(`Successful: ${results.successful}`);
  console.log(`Failed: ${results.failed}`);
  console.log(`Average Response Time: ${(results.totalTime / results.successful).toFixed(0)}ms`);
  console.log(`Filtered Requests: ${results.responses.filter(r => r.wasFiltered).length}`);
}

loadTest();
```

Run:
```bash
node scripts/load-test.js
```

### Test 7: Cache Performance

Create `scripts/test-cache.js`:

```javascript
const { MongoClient } = require('mongodb');
const { ChapterService } = require('../backend/src/services/chapterService');

async function testCache() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  
  const chapterService = new ChapterService(client);
  
  console.log('🧪 Testing Chapter Cache Performance\n');
  
  // First request (cold cache)
  console.log('1️⃣ Cold cache request...');
  const start1 = Date.now();
  await chapterService.getChapter('linear-equations');
  const time1 = Date.now() - start1;
  console.log(`   Time: ${time1}ms\n`);
  
  // Second request (warm cache)
  console.log('2️⃣ Warm cache request...');
  const start2 = Date.now();
  await chapterService.getChapter('linear-equations');
  const time2 = Date.now() - start2;
  console.log(`   Time: ${time2}ms\n`);
  
  const speedup = ((time1 - time2) / time1 * 100).toFixed(1);
  console.log(`📈 Cache speedup: ${speedup}%`);
  console.log(`✅ Cache is ${time1 > time2 ? 'WORKING' : 'NOT WORKING'}`);
  
  await client.close();
}

testCache();
```

---

## Cost Tracking Testing

### Test 8: Verify Cost Calculations

Create `scripts/verify-costs.js`:

```javascript
const { MongoClient } = require('mongodb');

async function verifyCosts() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db();
  
  console.log('💰 Verifying Cost Tracking\n');
  
  // Get recent sessions
  const sessions = await db.collection('sessions')
    .find()
    .sort({ startTime: -1 })
    .limit(10)
    .toArray();
  
  console.log(`Found ${sessions.length} sessions\n`);
  
  sessions.forEach((session, i) => {
    console.log(`Session ${i + 1}:`);
    console.log(`  Tokens: ${session.tokens.inputTokens} in, ${session.tokens.outputTokens} out`);
    console.log(`  Cached: ${session.tokens.cachedInputTokens}`);
    console.log(`  Claude cost: $${session.costs.claudeCost.toFixed(4)}`);
    console.log(`  TTS cost: $${session.costs.ttsCost.toFixed(4)}`);
    console.log(`  Total: $${session.costs.totalCost.toFixed(4)}`);
    console.log(`  Off-topic attempts: ${session.offTopicAttempts || 0}`);
    console.log('');
  });
  
  // Calculate totals
  const totals = sessions.reduce((acc, s) => ({
    totalCost: acc.totalCost + s.costs.totalCost,
    totalSessions: acc.totalSessions + 1,
    totalOffTopic: acc.totalOffTopic + (s.offTopicAttempts || 0)
  }), { totalCost: 0, totalSessions: 0, totalOffTopic: 0 });
  
  console.log('📊 Summary:');
  console.log(`  Total cost: $${totals.totalCost.toFixed(2)}`);
  console.log(`  Avg cost/session: $${(totals.totalCost / totals.totalSessions).toFixed(4)}`);
  console.log(`  Off-topic rate: ${(totals.totalOffTopic / totals.totalSessions * 100).toFixed(1)}%`);
  
  await client.close();
}

verifyCosts();
```

---

## Testing Checklist

### Complete Testing Checklist

```markdown
## Backend Services
- [ ] ChapterService: getChapter works
- [ ] ChapterService: Caching works
- [ ] ChapterService: Scope detection works
- [ ] ClaudeService: In-scope questions work
- [ ] ClaudeService: Off-topic filtering works
- [ ] ClaudeService: Cost calculation accurate

## API Endpoints (When created)
- [ ] POST /api/chat - In-scope questions
- [ ] POST /api/chat - Off-topic questions
- [ ] POST /api/chat - Error handling
- [ ] GET /api/chapters/:subject/:grade
- [ ] GET /api/progress/:userId
- [ ] POST /api/progress/:userId/chapter/:chapterId

## Performance
- [ ] Response time < 2 seconds
- [ ] Cache hit rate > 80%
- [ ] Load test: 20 concurrent users
- [ ] Database queries optimized

## Cost Tracking
- [ ] Tokens tracked correctly
- [ ] Costs calculated accurately
- [ ] Cache savings recorded
- [ ] Off-topic attempts tracked

## Security
- [ ] API keys not exposed
- [ ] Authentication works
- [ ] Authorization enforced
- [ ] Input validation working

## User Experience
- [ ] Chapter navigation smooth
- [ ] Progress updates correctly
- [ ] Error messages helpful
- [ ] Loading states clear
```

---

## Next Steps

1. **Run Unit Tests**:
   ```bash
   npm test
   ```

2. **Manual Testing**:
   - Follow the E2E test checklist
   - Test each user flow
   - Verify chapter system works

3. **Performance Testing**:
   - Run load tests
   - Check cache performance
   - Monitor response times

4. **Cost Verification**:
   - Review cost tracking
   - Verify calculations
   - Check savings metrics

5. **Before Production**:
   - All tests passing
   - Performance acceptable
   - Costs within budget
   - Security verified

---

**Ready to test?** Start with the unit tests and work your way through! 🧪
