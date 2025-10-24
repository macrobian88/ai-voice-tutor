# Complete Setup & Testing Guide

## 🚀 Quick Start (5 Minutes)

### Prerequisites
- Node.js 20+ and npm 10+
- MongoDB Atlas account (free tier works)
- OpenAI API key
- Anthropic API key

### 1. Clone and Install

```bash
git clone https://github.com/macrobian88/ai-voice-tutor.git
cd ai-voice-tutor
npm install
```

### 2. Environment Setup

```bash
cp .env.example .env.local
```

Edit `.env.local` with your credentials:

```env
# REQUIRED - Get these first
MONGODB_URI=mongodb+srv://your-connection-string
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# REQUIRED - Security
JWT_SECRET=your-super-secret-key-min-32-chars

# OPTIONAL - For production
REDIS_URL=redis://...  # For caching (optional)
R2_ACCOUNT_ID=...      # For audio storage (optional)
```

### 3. Seed Database

```bash
npm run db:seed -- --all
```

This creates:
- ✅ All database indexes
- ✅ 6 sample chapters (Math + English)
- ✅ 5 cached TTS responses

### 4. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 🧪 Testing the Complete Flow

### Test 1: User Registration & Authentication

1. **Register a new account**
   - Go to http://localhost:3000
   - Click "Start Learning Free"
   - Fill in:
     - Name: Test User
     - Email: test@example.com
     - Password: Test1234!
   - Click "Create Account"
   
2. **Expected Result:**
   - ✅ Redirect to /dashboard
   - ✅ See "Test User" in header
   - ✅ See "Free Plan" badge

3. **Test Login:**
   - Logout (top right)
   - Click "Sign In"
   - Use same credentials
   - Should redirect to dashboard

### Test 2: Chapter Navigation

1. **View available chapters**
   - On dashboard, you should see 6 chapters:
     - Math Grade 8: Introduction to Algebra
     - Math Grade 8: Solving Linear Equations
     - Math Grade 8: Introduction to Geometry
     - English: Parts of Speech
     - English: Sentence Structure
     - English: Punctuation and Capitalization

2. **Select a chapter**
   - Click on "Solving Linear Equations"
   - Should redirect to /session?chapterId=algebra-linear-equations

3. **Expected Result:**
   - ✅ Loading spinner appears briefly
   - ✅ Session page loads
   - ✅ Chapter title displays at top
   - ✅ Microphone button is visible

### Test 3: Voice Tutoring Session

1. **Start recording**
   - Click the blue microphone button
   - Browser will ask for microphone permission - **Allow it**
   - Timer should start counting (0:00, 0:01, 0:02...)
   - Button turns red with "Stop" icon

2. **Ask an in-scope question** (about linear equations)
   ```
   Say: "How do I solve 2x plus 5 equals 15?"
   ```

3. **Stop recording**
   - Click the red stop button
   - See "Processing..." message
   - Wait 3-5 seconds

4. **Expected Result:**
   - ✅ Your message appears (right side, blue bubble)
   - ✅ AI response appears (left side, gray bubble)
   - ✅ Audio plays automatically (AI speaking the response)
   - ✅ Response explains how to solve the equation step-by-step
   - ✅ No "off-topic" warning (it's in scope!)

5. **Ask an off-topic question** (not about linear equations)
   ```
   Say: "What is the Pythagorean theorem?"
   ```

6. **Expected Result:**
   - ✅ AI response appears in YELLOW bubble
   - ✅ Message says something like: "That's from a different chapter! Let's focus on linear equations."
   - ✅ See "Off-topic question" badge
   - ✅ **Cost savings: $0.016!** (No Claude API call was made)

### Test 4: Progress Tracking

1. **Switch to Progress tab**
   - Click "Progress" button in dashboard
   
2. **Expected Result:**
   - ✅ See session count
   - ✅ See chapters in progress
   - ✅ See completion percentage
   - ✅ See cost metrics

### Test 5: Session Management

1. **End session**
   - Click "End Session" button
   - Should redirect to /dashboard

2. **View session history**
   - Progress tab shows completed sessions
   - Cost breakdown visible

---

## 🔍 Troubleshooting Common Issues

### Issue: "Failed to connect to MongoDB"

**Solution:**
```bash
# Check your MONGODB_URI in .env.local
# Make sure it's a valid connection string
# Test connection:
mongosh "mongodb+srv://your-connection-string"
```

### Issue: "OpenAI API Error: Invalid API Key"

**Solution:**
```bash
# Verify your API key:
# 1. Go to https://platform.openai.com/api-keys
# 2. Create new key if needed
# 3. Update .env.local with correct key (starts with sk-)
```

### Issue: "Anthropic API Error"

**Solution:**
```bash
# Verify your API key:
# 1. Go to https://console.anthropic.com/settings/keys
# 2. Create new key if needed
# 3. Update .env.local with correct key (starts with sk-ant-)
```

### Issue: Microphone not working

**Solution:**
1. Check browser permissions:
   - Chrome: Settings > Privacy > Site Settings > Microphone
   - Allow microphone access for localhost
2. Try different browser (Chrome recommended)
3. Check if microphone works in other apps

### Issue: No audio playback

**Solution:**
1. Check browser audio settings
2. Ensure volume is not muted
3. Try headphones
4. Check console for errors (F12 → Console tab)

### Issue: "Chapter not found"

**Solution:**
```bash
# Re-seed the database:
npm run db:seed -- --chapters
```

---

## 📊 Verifying Cost Optimization

### Check Prompt Caching

1. **Enable debug mode:**
   Add to `.env.local`:
   ```env
   LOG_LEVEL=debug
   ```

2. **Check server logs:**
   ```bash
   # Terminal where npm run dev is running
   # Look for:
   ✅ Prompt cache hit: 4000 tokens saved
   ✅ TTS cache hit: "Great question!"
   ```

### Check Off-Topic Filtering

1. Ask 5 off-topic questions
2. Check session cost in database:
   ```bash
   mongosh "your-connection-string"
   use ai-voice-tutor
   db.sessions.findOne({}, {costs: 1, offTopicAttempts: 1})
   ```

3. **Expected:**
   - `offTopicAttempts: 5`
   - Lower `claudeCost` (filtered questions = $0)

---

## 🎯 Advanced Testing

### Test API Endpoints Directly

#### 1. Test Authentication

```bash
# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "api@test.com",
    "password": "Test1234!",
    "name": "API Test"
  }'

# Response should include token
```

#### 2. Test Chat API

```bash
# Save token from above as TOKEN variable
TOKEN="eyJhbGc..."

# Test with text message
curl -X POST http://localhost:3000/api/chat \
  -H "Authorization: Bearer $TOKEN" \
  -F "message=How do I solve 3x = 12?" \
  -F "chapterId=algebra-linear-equations"
```

#### 3. Test Chapters API

```bash
curl http://localhost:3000/api/chapters/algebra-linear-equations \
  -H "Authorization: Bearer $TOKEN"
```

### Test Database Directly

```bash
mongosh "your-connection-string"

# Switch to database
use ai-voice-tutor

# Check collections
show collections

# Count chapters
db.chapters.countDocuments()
# Should return: 6

# View a chapter
db.chapters.findOne({chapterId: "algebra-linear-equations"})

# Check cached TTS responses
db.cached_tts_responses.countDocuments()
# Should return: 5

# View sessions
db.sessions.find().limit(5)
```

---

## 🚨 Health Check Checklist

Before considering the app ready for production, verify:

### Backend Health
- [ ] MongoDB connection working
- [ ] All 6 chapters seeded
- [ ] Database indexes created
- [ ] OpenAI API responding
- [ ] Anthropic API responding
- [ ] JWT auth working

### Frontend Health
- [ ] All pages load without errors
- [ ] Authentication flow works
- [ ] Dashboard displays chapters
- [ ] Session page loads
- [ ] Microphone permission works
- [ ] Audio recording works
- [ ] Audio playback works

### Feature Health
- [ ] In-scope questions get full AI responses
- [ ] Off-topic questions get filtered
- [ ] Progress tracking updates
- [ ] Session costs are tracked
- [ ] Prompt caching is active
- [ ] TTS caching is active

### Cost Optimization Health
- [ ] Chapter content is cached (check logs)
- [ ] Off-topic filter saving money
- [ ] TTS cache hit rate >20%
- [ ] Average session cost <$0.20

---

## 📈 Performance Benchmarks

### Expected Performance

| Metric | Target | How to Check |
|--------|--------|--------------|
| API Response Time | <2s | Browser DevTools → Network |
| Whisper Transcription | <3s | Check `latency` in API response |
| Claude Response | <2s | Check server logs |
| TTS Generation | <1s | Check `latency` in API response |
| Full Turn Time | <5s | From stop recording to audio playback |

### Expected Costs (per 10-min session)

| Component | Cost | Optimization |
|-----------|------|--------------|
| Whisper | $0.06 | VAD can reduce by 25% |
| Claude | $0.08 | Caching reduces by 54% |
| TTS | $0.09 | Caching reduces by 30% |
| **Total** | **$0.13-0.16** | **Target: <$0.20** |

---

## 🎓 Next Steps After Testing

### Week 1: Production Prep
- [ ] Set up production MongoDB cluster
- [ ] Configure Cloudflare R2 for audio storage
- [ ] Set up Redis for caching
- [ ] Configure error monitoring (Sentry)
- [ ] Set up CI/CD pipeline

### Week 2: Launch Prep
- [ ] Load testing (100 concurrent users)
- [ ] Security audit
- [ ] Set up monitoring dashboards
- [ ] Configure backup system
- [ ] Prepare launch checklist

### Week 3: Soft Launch
- [ ] Beta user onboarding (10-50 users)
- [ ] Monitor costs daily
- [ ] Collect user feedback
- [ ] Fix critical bugs
- [ ] Optimize based on real usage

---

## 💡 Tips for Best Results

### For Development
1. **Use Chrome** for best WebRTC support
2. **Use headphones** to prevent audio feedback
3. **Speak clearly** 12-18 inches from mic
4. **Check logs** when things go wrong (F12 → Console)

### For Testing
1. **Test all browsers:** Chrome, Firefox, Safari, Edge
2. **Test on mobile:** iOS Safari, Android Chrome
3. **Test different accents** (Whisper is good but not perfect)
4. **Test long sessions** (>10 minutes)
5. **Test rapid-fire questions** (latency stress test)

### For Cost Optimization
1. **Monitor cache hit rates** in database
2. **Track off-topic percentage** per user
3. **Analyze session costs** for outliers
4. **Compare to baseline** ($0.23/session)

---

## 📞 Getting Help

### Check These First
1. **Console Errors:** F12 → Console tab
2. **Network Errors:** F12 → Network tab
3. **Server Logs:** Terminal where `npm run dev` runs
4. **Database:** Check MongoDB Atlas dashboard

### Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| "Failed to send message" | API error | Check API keys |
| "Chapter not found" | Not seeded | Run `npm run db:seed` |
| "Unauthorized" | Bad token | Re-login |
| "Failed to transcribe" | Whisper error | Check OpenAI quota |
| "Failed to generate speech" | TTS error | Check OpenAI quota |

---

## ✅ Success Criteria

You know everything is working when:

1. ✅ You can register and login
2. ✅ You can see 6 chapters
3. ✅ You can start a session
4. ✅ You can record audio
5. ✅ You get AI responses
6. ✅ Audio plays automatically
7. ✅ Off-topic questions are filtered
8. ✅ Progress is tracked
9. ✅ Costs are <$0.20 per session
10. ✅ Everything feels fast (<5s per turn)

**Congratulations! Your AI Voice Tutor is now fully operational! 🎉**
