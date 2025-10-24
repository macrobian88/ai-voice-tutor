# Troubleshooting: No Responses Issue

## Quick Diagnosis

If you're not getting any responses after asking questions, follow these steps:

### Step 1: Check Browser Console

1. Press **F12** to open DevTools
2. Go to **Console** tab
3. Record a question and look for errors

**Common errors:**

```
❌ Failed to fetch
❌ ERR_CONNECTION_REFUSED
❌ Streaming error: ...
❌ Audio playback error: ...
```

### Step 2: Check Server Logs

In your terminal where you ran `npm run dev`, look for:

```
❌ Whisper transcription error
❌ Claude API error
❌ TTS generation error
❌ Streaming error
```

### Step 3: Disable Streaming (Quick Fix)

If streaming is causing issues, temporarily disable it:

**File: `components/TutorSession.tsx`**

Find line ~40 and change:

```typescript
// BEFORE (streaming enabled)
const [enableStreaming] = useState(true);

// AFTER (streaming disabled - fallback mode)
const [enableStreaming] = useState(false);
```

Save the file and refresh your browser. Try again.

### Step 4: Verify Environment Variables

Check your `.env` file:

```bash
# Required
ANTHROPIC_API_KEY=sk-ant-...    # Must start with sk-ant-
OPENAI_API_KEY=sk-...            # Must start with sk-
MONGODB_URI=mongodb+srv://...    # Must be valid

# Optional but recommended
ENABLE_PROMPT_CACHING=true
ENABLE_TTS_CACHING=true
```

### Step 5: Check API Keys

Test your API keys:

**Terminal commands:**

```bash
# Test OpenAI (Whisper & TTS)
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"

# Test Anthropic (Claude)
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{"model":"claude-sonnet-4-20250514","max_tokens":10,"messages":[{"role":"user","content":"Hi"}]}'
```

Should get valid responses, not auth errors.

### Step 6: Check Network Tab

1. Open DevTools (F12)
2. Go to **Network** tab
3. Record a question
4. Look for `/api/chat` request

**What to check:**

- **Status Code**: Should be 200 (OK) or streaming
- **Response**: Should have data or events
- **Time**: How long did it take?
- **Errors**: Any red entries?

### Step 7: Test Non-Streaming Mode

Edit `components/TutorSession.tsx`:

```typescript
const [enableStreaming] = useState(false); // Disable streaming
```

If non-streaming works but streaming doesn't:
- Issue is with SSE (Server-Sent Events)
- Check browser compatibility
- Check CORS headers

### Step 8: Add Debug Logging

**File: `components/TutorSession.tsx`**

Add logging in `sendAudioMessage`:

```typescript
const sendAudioMessage = async (blob: Blob) => {
  console.log('🎤 Sending audio message...');
  console.log('Blob size:', blob.size);
  console.log('Chapter ID:', chapterId);
  console.log('Session ID:', sessionId);
  console.log('Streaming enabled:', enableStreaming);

  if (!token) {
    console.error('❌ No auth token!');
    return;
  }

  setIsProcessing(true);
  setCurrentAssistantMessage('');

  try {
    const formData = new FormData();
    formData.append('audio', blob, 'recording.webm');
    formData.append('chapterId', chapterId);
    formData.append('stream', enableStreaming.toString());
    if (sessionId) {
      formData.append('sessionId', sessionId);
    }

    console.log('📤 FormData prepared, sending request...');

    // ... rest of code
  } catch (error) {
    console.error('❌ Error in sendAudioMessage:', error);
    alert('Failed to send message. Check console for details.');
  }
};
```

### Step 9: Check Chapter Selection

Make sure you've selected a valid chapter:

```typescript
// In browser console
console.log('Chapter ID:', chapterId);
console.log('Chapter Title:', chapterTitle);
```

If `chapterId` is null or undefined, that's the problem.

### Step 10: Test with Simple Message

Try sending a text message instead of audio:

**Temporarily modify `TutorSession.tsx`:**

```typescript
// Add a test button
<Button onClick={() => {
  const testMessage = "Hello, can you help me?";
  // Create a test blob or directly call API
  console.log('Testing with text message:', testMessage);
}}>
  Test Text Message
</Button>
```

## Common Issues & Solutions

### Issue 1: Streaming Stuck/Freezes

**Symptoms:**
- Shows "Processing..." indefinitely
- No text appears
- No errors in console

**Solution:**
```typescript
// Disable streaming
const [enableStreaming] = useState(false);
```

### Issue 2: Audio Not Playing

**Symptoms:**
- Text appears
- No audio plays
- No audio errors

**Solution:**
```typescript
// Check audio queue
console.log('Audio chunks queued:', audioQueueRef.current);

// Verify browser supports audio
const audio = new Audio();
console.log('Audio supported:', audio.canPlayType('audio/mp3'));
```

### Issue 3: CORS Errors

**Symptoms:**
- `Access-Control-Allow-Origin` errors
- Network requests fail

**Solution:**
Check `lib/middleware.ts` has correct CORS headers.

### Issue 4: MongoDB Connection

**Symptoms:**
- "Failed to connect to MongoDB"
- Session not saving

**Solution:**
```bash
# Test MongoDB connection
node -e "const {MongoClient} = require('mongodb'); new MongoClient(process.env.MONGODB_URI).connect().then(() => console.log('✅ Connected')).catch(e => console.error('❌', e))"
```

## Quick Test Script

Run this in your browser console on the session page:

```javascript
// Test complete flow
async function testFlow() {
  console.log('🧪 Testing voice tutor flow...');
  
  // 1. Check auth
  const token = localStorage.getItem('token');
  if (!token) {
    console.error('❌ Not authenticated');
    return;
  }
  console.log('✅ Auth token found');
  
  // 2. Check chapter
  const chapterId = 'YOUR_CHAPTER_ID'; // Replace with actual
  if (!chapterId) {
    console.error('❌ No chapter selected');
    return;
  }
  console.log('✅ Chapter selected:', chapterId);
  
  // 3. Test API directly
  const formData = new FormData();
  formData.append('message', 'Test message');
  formData.append('chapterId', chapterId);
  formData.append('stream', 'false');
  
  console.log('📤 Sending test request...');
  
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });
    
    console.log('📥 Response status:', res.status);
    
    if (!res.ok) {
      const error = await res.text();
      console.error('❌ API error:', error);
      return;
    }
    
    const data = await res.json();
    console.log('✅ Response received:', data);
    console.log('Message:', data.message);
    console.log('Latency:', data.latency, 'ms');
    
  } catch (error) {
    console.error('❌ Fetch error:', error);
  }
}

testFlow();
```

## Still Not Working?

If none of the above works, provide me with:

1. **Full error message** from browser console
2. **Server log errors** from terminal
3. **Network tab screenshot** showing the failed request
4. **What happens** step by step when you try to ask a question

I'll help you diagnose and fix the specific issue!

---

**Emergency Rollback:**

If you want to revert to the old working version:

```bash
git log --oneline  # Find commit before optimizations
git checkout <commit-hash>  # Revert to that version
```

Or disable streaming:
```typescript
const [enableStreaming] = useState(false);
```
