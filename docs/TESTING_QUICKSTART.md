# 🚀 Quick Start: Testing Your App

**5-minute guide to test your AI Voice Tutor application right now**

---

## ⚡ Fastest Way to Test (3 Steps)

### Step 1: Install & Start (2 minutes)

```bash
# Install dependencies
npm install

# Start the dev server
npm run dev
```

✅ **Expected**: Server starts at http://localhost:3000

---

### Step 2: Test Backend Services (1 minute)

Create `test-backend.js` in your project root:

```javascript
// test-backend.js
require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

async function quickTest() {
  console.log('🧪 Quick Backend Test\n');
  
  // Test 1: MongoDB Connection
  console.log('1️⃣ Testing MongoDB...');
  try {
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    console.log('   ✅ MongoDB connected!\n');
    await client.close();
  } catch (error) {
    console.log('   ❌ MongoDB failed:', error.message, '\n');
  }
  
  // Test 2: Anthropic Key
  console.log('2️⃣ Testing Anthropic...');
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  console.log(anthropicKey ? '   ✅ Key found!\n' : '   ❌ Key missing!\n');
  
  // Test 3: OpenAI Key
  console.log('3️⃣ Testing OpenAI...');
  const openaiKey = process.env.OPENAI_API_KEY;
  console.log(openaiKey ? '   ✅ Key found!\n' : '   ❌ Key missing!\n');
  
  console.log('✨ Quick test complete!');
}

quickTest();
```

Run it:
```bash
node test-backend.js
```

✅ **Expected**: All 3 tests pass with ✅

---

### Step 3: Test Chapter System (2 minutes)

Create `test-chapters.js`:

```javascript
// test-chapters.js
require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

async function testChapters() {
  console.log('📚 Testing Chapter System\n');
  
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db();
  
  // Check if chapters exist
  const count = await db.collection('chapters').countDocuments();
  console.log(`Found ${count} chapters in database\n`);
  
  if (count === 0) {
    console.log('⚠️  No chapters found! Seeding sample data...\n');
    
    // Import and insert sample chapters
    const { SAMPLE_CHAPTERS } = require('./backend/src/data/sampleChapters');
    await db.collection('chapters').insertMany(SAMPLE_CHAPTERS);
    
    console.log('✅ Seeded 3 sample chapters!\n');
  }
  
  // List all chapters
  const chapters = await db.collection('chapters')
    .find()
    .project({ chapterId: 1, title: 1, subject: 1, grade: 1 })
    .toArray();
  
  console.log('📖 Available Chapters:');
  chapters.forEach((ch, i) => {
    console.log(`   ${i + 1}. ${ch.title} (${ch.subject}, Grade ${ch.grade})`);
  });
  
  console.log('\n✨ Chapter system ready!');
  await client.close();
}

testChapters();
```

Run it:
```bash
node test-chapters.js
```

✅ **Expected**: Shows 3 Math chapters

---

## 🎯 What Can You Test Right Now?

### Without API Routes (Backend Only)

Since your API routes aren't created yet, test the backend services directly:

#### Test 1: Chapter Scope Detection

```javascript
// test-scope.js
require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');
const { ChapterService } = require('./backend/src/services/chapterService');

async function testScope() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  
  const chapterService = new ChapterService(client);
  
  console.log('🎯 Testing Scope Detection\n');
  
  // Test in-scope question
  console.log('Question: "How do I solve 2x + 5 = 15?"');
  const result1 = await chapterService.isQuestionInScope(
    'How do I solve 2x + 5 = 15?',
    'linear-equations'
  );
  console.log(`Result: ${result1.inScope ? '✅ IN SCOPE' : '❌ OFF-TOPIC'}`);
  console.log(`Confidence: ${(result1.confidence * 100).toFixed(0)}%\n`);
  
  // Test off-topic question
  console.log('Question: "What is the Pythagorean theorem?"');
  const result2 = await chapterService.isQuestionInScope(
    'What is the Pythagorean theorem?',
    'linear-equations'
  );
  console.log(`Result: ${result2.inScope ? '✅ IN SCOPE' : '❌ OFF-TOPIC'}`);
  console.log(`Confidence: ${(result2.confidence * 100).toFixed(0)}%\n`);
  
  await client.close();
}

testScope();
```

Run:
```bash
node test-scope.js
```

---

#### Test 2: Claude Response (Costs Real Money!)

**⚠️ Warning**: This test makes a real API call and costs ~$0.01

```javascript
// test-claude.js
require('dotenv').config({ path: '.env.local' });
const { MongoClient, ObjectId } = require('mongodb');
const { ChapterService } = require('./backend/src/services/chapterService');
const { ContextAwareClaudeService } = require('./backend/src/services/contextAwareClaudeService');

async function testClaude() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  
  const chapterService = new ChapterService(client);
  const claudeService = new ContextAwareClaudeService(
    process.env.ANTHROPIC_API_KEY,
    chapterService
  );
  
  // Create test user with current chapter
  const db = client.db();
  const testUserId = new ObjectId();
  
  await db.collection('user_progress').insertOne({
    userId: testUserId,
    subject: 'Mathematics',
    grade: '8',
    chapters: [{
      chapterId: 'linear-equations',
      status: 'in_progress',
      lastAccessedAt: new Date()
    }]
  });
  
  console.log('🤖 Testing Claude Response\n');
  console.log('Question: "How do I solve x + 5 = 12?"\n');
  
  const result = await claudeService.chat(
    testUserId,
    'How do I solve x + 5 = 12?',
    []
  );
  
  console.log('📝 Response:', result.response);
  console.log('\n📊 Stats:');
  console.log(`   In-scope: ${result.inScope}`);
  console.log(`   Filtered: ${result.wasFiltered}`);
  console.log(`   Tokens: ${result.tokensUsed.input} in, ${result.tokensUsed.output} out`);
  console.log(`   Cached: ${result.tokensUsed.cached}`);
  
  const cost = claudeService.calculateCost(result.tokensUsed);
  console.log(`   Cost: $${cost.toFixed(4)}`);
  
  // Cleanup
  await db.collection('user_progress').deleteOne({ userId: testUserId });
  await client.close();
}

testClaude();
```

Run:
```bash
node test-claude.js
```

---

## 📋 Simple Testing Checklist

Copy this checklist and mark off as you test:

```
## Environment Setup
- [ ] .env.local file exists
- [ ] All API keys present
- [ ] MongoDB connected
- [ ] npm install completed
- [ ] npm run dev works

## Backend Services
- [ ] ChapterService loads chapters
- [ ] Scope detection works (in-scope)
- [ ] Scope detection works (off-topic)
- [ ] Claude responds to questions
- [ ] Off-topic filtering works
- [ ] Cost calculation accurate

## Database
- [ ] Sample chapters seeded
- [ ] Can query chapters collection
- [ ] Can create test user progress
- [ ] Indexes created

## Cost Tracking
- [ ] Token counts recorded
- [ ] Costs calculated
- [ ] Cache hits tracked
- [ ] Off-topic attempts logged

## Ready for Next Steps
- [ ] All tests passing
- [ ] Understand how system works
- [ ] Ready to create API routes
```

---

## 🐛 Common Issues & Fixes

### Issue: "Cannot find module"
```bash
# Fix: Install dependencies
npm install
```

### Issue: "MONGODB_URI is not defined"
```bash
# Fix: Check .env.local
cat .env.local | grep MONGODB_URI

# Should show: MONGODB_URI=mongodb+srv://...
```

### Issue: "Connection timeout"
```bash
# Fix: Check MongoDB IP whitelist
# Go to MongoDB Atlas → Network Access
# Add your IP or allow all (0.0.0.0/0) for testing
```

### Issue: "Invalid API key"
```bash
# Fix: Verify keys are correct
node -e "
require('dotenv').config({ path: '.env.local' });
console.log('Anthropic:', process.env.ANTHROPIC_API_KEY?.substring(0, 15) + '...');
console.log('OpenAI:', process.env.OPENAI_API_KEY?.substring(0, 10) + '...');
"
```

---

## 🎓 What You're Testing

When you run these tests, here's what happens:

### Backend Flow:
```
1. Load chapter from MongoDB (or cache)
   ↓
2. User asks question
   ↓
3. Check if question matches chapter keywords
   ↓
4a. IF IN-SCOPE:
    - Call Claude with cached chapter content
    - Return detailed answer
    - Cost: ~$0.016
   ↓
4b. IF OFF-TOPIC:
    - Return generic redirect
    - NO Claude call
    - Cost: $0.00 ✨
   ↓
5. Track everything in database
```

### What's Being Validated:
- ✅ Chapter content loads correctly
- ✅ Keyword matching works
- ✅ Claude API integration works
- ✅ Prompt caching works (90% discount)
- ✅ Off-topic filtering saves money
- ✅ Cost tracking is accurate

---

## 📚 More Detailed Testing

Want to test more thoroughly?

**See**: [docs/TESTING_GUIDE.md](./TESTING_GUIDE.md) for:
- Unit tests
- API endpoint tests
- Load testing
- Performance benchmarks
- Full E2E test flows

---

## 🚀 Next Steps After Testing

Once basic tests pass:

1. **Create API Routes** (`app/api/`)
   - `/api/chat` - Main conversation endpoint
   - `/api/chapters` - Chapter data
   - `/api/progress` - User progress

2. **Build Frontend Components**
   - TutorSession component
   - Chapter navigation
   - Progress dashboard

3. **Test Full Application**
   - Run E2E tests
   - Test user flows
   - Verify cost tracking

---

## 💡 Pro Tips

**Test incrementally:**
- ✅ Test backend first (what you can do now)
- ✅ Then test API routes (once created)
- ✅ Finally test full app (with frontend)

**Monitor costs:**
```bash
# Check recent session costs
mongosh "$MONGODB_URI" --eval "
  db.sessions.find().sort({startTime: -1}).limit(5).forEach(s => {
    print('Cost: $' + s.costs.totalCost.toFixed(4));
  });
"
```

**Start simple:**
- First test with 1 question
- Then test with 10 questions
- Finally test with load

---

**Ready?** Start with Step 1 above! 🎯

**Questions?** Check [TESTING_GUIDE.md](./TESTING_GUIDE.md) for more details.
