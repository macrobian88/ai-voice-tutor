# AI Voice Tutor - Complete Setup Guide

## Prerequisites

- Node.js 20+ and npm 10+
- MongoDB Atlas account (or local MongoDB)
- API Keys:
  - OpenAI API Key (for Whisper STT and TTS)
  - Anthropic API Key (for Claude)
  - Cloudflare R2 (optional, for audio storage)

## Step-by-Step Setup

### 1. Clone and Install

```bash
git clone https://github.com/macrobian88/ai-voice-tutor.git
cd ai-voice-tutor
npm install
```

### 2. Environment Configuration

Create `.env.local` file:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your credentials:

```env
# Required
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/ai-voice-tutor
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
JWT_SECRET=your-super-secret-jwt-key-at-least-32-chars

# Cost Optimization (Recommended)
ENABLE_PROMPT_CACHING=true
ENABLE_TTS_CACHING=true

# Optional (for production)
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=ai-voice-tutor-audio
```

### 3. Database Setup

**Seed the database with 2 English chapters:**

```bash
npm run db:seed
```

This will:
- Create all necessary collections
- Add indexes for performance
- Seed 2 English chapters (Grammar Basics & Sentence Structure)

### 4. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 5. Create Your First Account

1. Go to http://localhost:3000
2. Click "Start Learning Free"
3. Register with your email
4. You'll be redirected to the dashboard

### 6. Start Your First Session

1. Select a chapter (e.g., "Grammar Basics")
2. Click "Start"
3. Allow microphone access when prompted
4. Press the microphone button and speak
5. Release to send your question
6. Listen to the AI tutor's response

## Testing the Application

### Manual Testing Checklist

✅ **Authentication**
- [ ] Register new user
- [ ] Login with credentials
- [ ] Logout

✅ **Chapter Navigation**
- [ ] View list of chapters
- [ ] Start a chapter
- [ ] Prerequisites are enforced

✅ **Voice Session**
- [ ] Record audio message
- [ ] Receive transcription
- [ ] Get AI response
- [ ] Play audio response
- [ ] End session

✅ **Chapter Scoping**
- [ ] Ask in-scope question → Get detailed answer
- [ ] Ask off-topic question → Get generic redirect
- [ ] Verify no Claude API call for off-topic questions

✅ **Progress Tracking**
- [ ] View progress dashboard
- [ ] See completed chapters
- [ ] Check mastery scores

### Run Unit Tests

```bash
npm test
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login

### Chapters
- `GET /api/chapters` - List chapters
- `GET /api/chapters/:chapterId` - Get chapter details

### Progress
- `GET /api/progress` - Get user progress
- `POST /api/progress` - Update progress

### Chat
- `POST /api/chat` - Send voice/text message
  - Handles: Whisper transcription → Claude chat → TTS generation
  - Includes: Chapter scope checking, cost tracking, session management

### Sessions
- `GET /api/sessions` - List user sessions
- `GET /api/sessions/:sessionId` - Get session details
- `PUT /api/sessions/:sessionId` - End session

## Cost Monitoring

### Check API Costs

After a few sessions, check MongoDB for cost metrics:

```javascript
db.sessions.aggregate([
  {
    $group: {
      _id: null,
      totalWhisper: { $sum: "$costs.whisperCost" },
      totalClaude: { $sum: "$costs.claudeCost" },
      totalTTS: { $sum: "$costs.ttsCost" },
      totalCost: { $sum: "$costs.totalCost" }
    }
  }
])
```

### Expected Costs (per 10-min session)

- Whisper: ~$0.06 (10 minutes audio)
- Claude: ~$0.08 (with caching)
- TTS: ~$0.09 (6,000 characters)
- **Total: ~$0.16 per session** (optimized)

### Cost Optimizations Active

✅ Prompt Caching (54% savings on Claude input)
✅ TTS Response Caching (30% savings on TTS)
✅ Chapter Content Caching (90% discount)
✅ Off-Topic Filtering (saves $0.016 per filtered question)

## Troubleshooting

### MongoDB Connection Issues

**Error**: `MongoServerError: bad auth`

**Solution**: Check your MongoDB URI and credentials in `.env.local`

### Microphone Not Working

**Error**: `DOMException: Permission denied`

**Solution**: 
1. Check browser permissions
2. Must use HTTPS or localhost
3. Try different browser (Chrome recommended)

### API Key Errors

**Error**: `Invalid API key`

**Solution**: Verify your API keys in `.env.local`:
- OpenAI: Should start with `sk-`
- Anthropic: Should start with `sk-ant-`

### Audio Not Playing

**Error**: Audio response not playing

**Solution**:
1. Check browser console for errors
2. Verify TTS generation in API logs
3. Check audio codec support (MP3)

## Production Deployment

### Frontend (Vercel/Netlify/Cloudflare Pages)

```bash
npm run build
```

Deploy `.next` folder or use:
- Vercel: `vercel deploy`
- Netlify: `netlify deploy`
- Cloudflare Pages: `wrangler pages deploy`

### Environment Variables

Set all variables from `.env.local` in your deployment platform.

### Database

- Use MongoDB Atlas M10+ for production
- Enable connection pooling
- Set up monitoring and alerts

### Audio Storage

For production, configure Cloudflare R2:
1. Create R2 bucket
2. Generate API tokens
3. Update `.env.local` with R2 credentials
4. Audio files will be automatically uploaded

## Next Steps

1. **Add More Chapters**: Follow the structure in `backend/src/data/englishChapters.ts`
2. **Implement VAD**: Add Voice Activity Detection to reduce Whisper costs
3. **Add Subjects**: Create chapters for Math, Science, etc.
4. **Enhance UI**: Customize branding and design
5. **Add Analytics**: Track user engagement and learning outcomes

## Support

For issues or questions:
1. Check the [docs](./docs/) folder
2. Review [IMPLEMENTATION_STATUS.md](./docs/IMPLEMENTATION_STATUS.md)
3. Open an issue on GitHub

## License

Proprietary - All rights reserved
