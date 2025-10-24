# 🔑 API Keys Setup Guide

This guide will walk you through obtaining all the necessary API keys for the AI Voice Tutor application.

## 📋 Required API Keys

You need **5 main API keys**:

1. ✅ **Anthropic API Key** (Claude AI) - For conversational AI
2. ✅ **OpenAI API Key** - For Whisper (speech-to-text) and TTS (text-to-speech)
3. ✅ **MongoDB Connection String** - For database
4. ✅ **Cloudflare R2 Credentials** - For audio file storage
5. ⚠️ **NextAuth Secret** - For authentication (auto-generated)

---

## 1. 🤖 Anthropic API Key (Claude)

**Cost**: Pay-as-you-go, ~$3.95/user/month with optimizations

### Step-by-Step:

1. **Go to Anthropic Console**
   - Visit: https://console.anthropic.com/

2. **Sign Up / Log In**
   - Click "Sign Up" if new user
   - Use your email or Google account
   - Verify your email

3. **Add Payment Method**
   - Go to "Settings" → "Billing"
   - Add a credit card (required even for free tier)
   - Set up billing alerts (recommended: $50, $100, $200)

4. **Create API Key**
   - Go to "API Keys" section
   - Click "Create Key"
   - Name it: `ai-voice-tutor-production` or `ai-voice-tutor-dev`
   - **Copy the key immediately** (you won't see it again!)
   - Format: `sk-ant-api03-...`

5. **Set Usage Limits** (Recommended)
   - Go to "Settings" → "Limits"
   - Set monthly limit: $500 (for 100 users)
   - Enable email alerts at 50%, 80%, 100%

### Testing Your Key:

```bash
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: YOUR_API_KEY_HERE" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{
    "model": "claude-sonnet-4-5-20250929",
    "max_tokens": 1024,
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

**Expected Response**: You should see a JSON response with Claude's greeting.

---

## 2. 🎙️ OpenAI API Key (Whisper + TTS)

**Cost**: ~$2.09/user/month (Whisper: $0.45, TTS: $1.54)

### Step-by-Step:

1. **Go to OpenAI Platform**
   - Visit: https://platform.openai.com/

2. **Sign Up / Log In**
   - Click "Sign up" if new
   - Use email or Google/Microsoft account
   - Verify your email

3. **Add Payment Method**
   - Go to "Settings" → "Billing"
   - Click "Add payment method"
   - Add credit card
   - **Important**: Add initial credit ($5-10 minimum)

4. **Create API Key**
   - Go to "API keys" in left sidebar
   - Click "Create new secret key"
   - Name it: `ai-voice-tutor`
   - **Copy immediately!** (won't be shown again)
   - Format: `sk-...`

5. **Set Usage Limits**
   - Go to "Settings" → "Limits"
   - Set monthly budget: $300 (for 100 users)
   - Enable email notifications

### Testing Your Key:

```bash
# Test Whisper (Speech-to-Text)
curl https://api.openai.com/v1/audio/transcriptions \
  -H "Authorization: Bearer YOUR_OPENAI_KEY" \
  -F model="whisper-1" \
  -F file="@/path/to/audio.mp3"

# Test TTS (Text-to-Speech)
curl https://api.openai.com/v1/audio/speech \
  -H "Authorization: Bearer YOUR_OPENAI_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "tts-1",
    "input": "Hello, this is a test.",
    "voice": "alloy"
  }' \
  --output speech.mp3
```

---

## 3. 🗄️ MongoDB Atlas (Database)

**Cost**: Free tier (512MB) or Flex tier ($15/month)

### Step-by-Step:

1. **Go to MongoDB Atlas**
   - Visit: https://www.mongodb.com/cloud/atlas/register

2. **Sign Up**
   - Create account with email or Google
   - Verify email

3. **Create a Cluster**
   - Choose deployment option: **"Serverless"** or **"M0 Free"**
   - For production: Select **"Serverless (Flex)"** - $15/month
   - For development: Select **"M0 Free"** - Free forever (512MB)
   - Choose cloud provider: **AWS**
   - Choose region: **Closest to your users** (e.g., US East, Europe West)
   - Cluster name: `ai-voice-tutor`

4. **Create Database User**
   - Go to "Database Access"
   - Click "Add New Database User"
   - Username: `aivoicetutor`
   - Password: **Auto-generate** (copy it!)
   - Database User Privileges: **Read and write to any database**

5. **Configure Network Access**
   - Go to "Network Access"
   - Click "Add IP Address"
   - For development: Click "Allow Access from Anywhere" (0.0.0.0/0)
   - For production: Add your server's IP address

6. **Get Connection String**
   - Go to "Database" → "Connect"
   - Choose "Connect your application"
   - Driver: **Node.js**, Version: **Latest**
   - Copy the connection string
   - Format: `mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority`
   - **Replace `<password>` with your actual password**
   - **Add database name**: `mongodb+srv://...mongodb.net/ai-voice-tutor?retryWrites=true&w=majority`

### Testing Your Connection:

```bash
# Install MongoDB tools
npm install -g mongodb

# Test connection
mongosh "YOUR_CONNECTION_STRING"
```

**Expected**: Should connect successfully and show MongoDB prompt.

---

## 4. ☁️ Cloudflare R2 (Storage)

**Cost**: Very cheap! ~$0.015/GB/month storage, $0/egress

### Step-by-Step:

1. **Sign Up for Cloudflare**
   - Visit: https://dash.cloudflare.com/sign-up
   - Create account with email
   - Verify email

2. **Enable R2**
   - Log in to Cloudflare Dashboard
   - In left sidebar, click "R2"
   - Click "Purchase R2 Plan"
   - Choose "Pay As You Go" (free tier: 10GB storage/month)

3. **Create R2 Bucket**
   - Click "Create bucket"
   - Name: `ai-voice-tutor-audio`
   - Location: **Automatic** (or closest to users)
   - Click "Create bucket"

4. **Create API Token**
   - Go to "R2" → "Manage R2 API Tokens"
   - Click "Create API token"
   - Token name: `ai-voice-tutor-token`
   - Permissions: **Object Read & Write**
   - TTL: **Forever** (or custom)
   - Click "Create API Token"
   - **Save these 3 values**:
     - Access Key ID: `xxx...`
     - Secret Access Key: `xxx...`
     - Endpoint URL: `https://<account_id>.r2.cloudflarestorage.com`

### Testing R2 Access:

```bash
# Install AWS CLI (R2 is S3-compatible)
npm install -g @aws-sdk/client-s3

# Test upload (create test.js)
cat > test-r2.js << 'EOF'
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

const client = new S3Client({
  region: "auto",
  endpoint: "YOUR_R2_ENDPOINT",
  credentials: {
    accessKeyId: "YOUR_ACCESS_KEY_ID",
    secretAccessKey: "YOUR_SECRET_ACCESS_KEY"
  }
});

async function test() {
  const command = new PutObjectCommand({
    Bucket: "ai-voice-tutor-audio",
    Key: "test.txt",
    Body: "Hello R2!"
  });
  
  await client.send(command);
  console.log("✅ Upload successful!");
}

test();
EOF

node test-r2.js
```

---

## 5. 🔐 NextAuth Secret (Authentication)

**Cost**: Free (self-generated)

### Generate Secret:

```bash
# Option 1: Using OpenSSL (Mac/Linux)
openssl rand -base64 32

# Option 2: Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Option 3: Online Generator
# Visit: https://generate-secret.vercel.app/32
```

**Copy the output** - this is your `NEXTAUTH_SECRET`

---

## 📝 Setting Up Your .env.local File

Now that you have all keys, create your `.env.local` file:

```bash
# Copy the example
cp .env.example .env.local

# Edit with your keys
nano .env.local  # or use your favorite editor
```

### Complete .env.local Template:

```bash
# ==============================================
# AI Voice Tutor - Environment Variables
# ==============================================

# ----- Anthropic (Claude AI) -----
ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# ----- OpenAI (Whisper + TTS) -----
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# ----- MongoDB Atlas -----
MONGODB_URI=mongodb+srv://aivoicetutor:YOUR_PASSWORD@cluster.xxxxx.mongodb.net/ai-voice-tutor?retryWrites=true&w=majority

# ----- Cloudflare R2 (Storage) -----
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=xxxxxxxxxxxxxxxxxxxxx
R2_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
R2_BUCKET_NAME=ai-voice-tutor-audio
R2_PUBLIC_URL=https://your_account_id.r2.cloudflarestorage.com

# ----- NextAuth (Authentication) -----
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# ----- Application Settings -----
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# ----- Optional: Monitoring -----
# SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
# LOG_LEVEL=debug
```

---

## ✅ Verification Checklist

After setting up all keys, verify each one:

```bash
# 1. Check .env.local exists and has all keys
cat .env.local | grep -E "ANTHROPIC|OPENAI|MONGODB|R2_ACCESS|NEXTAUTH_SECRET"

# 2. Verify no placeholder values remain
cat .env.local | grep -E "xxx|your_|YOUR_|changeme"
# Should return nothing!

# 3. Test application startup
npm run dev

# Check console for any missing key errors
```

### Quick Test Script:

Create `scripts/test-keys.ts`:

```typescript
// Test all API keys are working
async function testKeys() {
  console.log("🔍 Testing API Keys...\n");
  
  // Test Anthropic
  console.log("1️⃣ Testing Anthropic...");
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  console.log(anthropicKey ? "✅ Key found" : "❌ Key missing");
  
  // Test OpenAI
  console.log("2️⃣ Testing OpenAI...");
  const openaiKey = process.env.OPENAI_API_KEY;
  console.log(openaiKey ? "✅ Key found" : "❌ Key missing");
  
  // Test MongoDB
  console.log("3️⃣ Testing MongoDB...");
  const mongoUri = process.env.MONGODB_URI;
  console.log(mongoUri ? "✅ URI found" : "❌ URI missing");
  
  // Test R2
  console.log("4️⃣ Testing Cloudflare R2...");
  const r2Keys = process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY;
  console.log(r2Keys ? "✅ Keys found" : "❌ Keys missing");
  
  // Test NextAuth
  console.log("5️⃣ Testing NextAuth...");
  const nextAuthSecret = process.env.NEXTAUTH_SECRET;
  console.log(nextAuthSecret ? "✅ Secret found" : "❌ Secret missing");
  
  console.log("\n✨ All keys checked!");
}

testKeys();
```

Run it:
```bash
npx tsx scripts/test-keys.ts
```

---

## 💰 Cost Summary

**Monthly costs for 100 daily active users:**

| Service | Cost | Notes |
|---------|------|-------|
| Anthropic Claude | ~$165 | $1.65/user with optimizations |
| OpenAI (Whisper + TTS) | ~$209 | $0.45 + $1.54 per user |
| MongoDB Atlas | $15-57 | Flex tier or M10 |
| Cloudflare R2 | ~$5 | Storage + some bandwidth |
| NextAuth | $0 | Self-hosted |
| **Total** | **~$394-436** | **~$3.95-4.36/user** |

**Revenue at 70 paid users ($24.99/month):** $1,749  
**Profit:** ~$1,300-1,350 (74-77% margin)

---

## 🚨 Security Best Practices

### ❌ **NEVER** commit .env.local to Git!

```bash
# Verify .env.local is in .gitignore
cat .gitignore | grep .env.local

# If not, add it:
echo ".env.local" >> .gitignore
```

### ✅ **DO** use environment variables in production:

**For Vercel Deployment:**
1. Go to your project in Vercel
2. Settings → Environment Variables
3. Add each key individually
4. Set environment: Production, Preview, Development

**For AWS Lambda:**
1. Use AWS Systems Manager Parameter Store
2. Or AWS Secrets Manager
3. Reference in Lambda configuration

### 🔒 **DO** rotate keys regularly:

- Rotate every 90 days
- Use different keys for dev/staging/production
- Monitor usage for anomalies

---

## 🆘 Troubleshooting

### "Invalid API Key" Errors:

```bash
# Check for whitespace
echo $ANTHROPIC_API_KEY | wc -c
# Should match expected length

# Check for special characters
echo $ANTHROPIC_API_KEY | cat -A
# Should show no special characters
```

### MongoDB Connection Fails:

1. Check IP whitelist in Atlas
2. Verify password has no special characters (or URL encode them)
3. Test with MongoDB Compass: https://www.mongodb.com/try/download/compass

### R2 Access Denied:

1. Verify bucket permissions
2. Check API token has Object Read & Write
3. Confirm endpoint URL format

---

## 📞 Support Resources

- **Anthropic**: https://support.anthropic.com
- **OpenAI**: https://help.openai.com
- **MongoDB**: https://www.mongodb.com/support
- **Cloudflare**: https://support.cloudflare.com

---

## 🎉 Next Steps

Once all keys are set up:

1. ✅ Run `npm install`
2. ✅ Run `npm run dev`
3. ✅ Test basic functionality
4. ✅ Proceed to API route development

**You're ready to start building!** 🚀
