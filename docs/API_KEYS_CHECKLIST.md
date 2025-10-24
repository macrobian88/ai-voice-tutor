# 🔑 API Keys Quick Checklist

Use this checklist to track your progress in setting up all required API keys.

## 📋 Setup Progress

```
Progress: [    ] 0/5 Complete
```

---

## 1. Anthropic (Claude AI) - $165/month for 100 users

**Website**: https://console.anthropic.com/

### Steps:
- [ ] Sign up for Anthropic account
- [ ] Add payment method
- [ ] Create API key named `ai-voice-tutor`
- [ ] Copy key (starts with `sk-ant-api03-...`)
- [ ] Set monthly limit to $500
- [ ] Enable billing alerts (50%, 80%, 100%)
- [ ] Test key with curl command
- [ ] Add to `.env.local` as `ANTHROPIC_API_KEY`

**Test Command:**
```bash
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: YOUR_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{"model":"claude-sonnet-4-5-20250929","max_tokens":100,"messages":[{"role":"user","content":"Hi"}]}'
```

✅ **Status**: [ ] Complete

---

## 2. OpenAI (Whisper + TTS) - $209/month for 100 users

**Website**: https://platform.openai.com/

### Steps:
- [ ] Sign up for OpenAI account
- [ ] Add payment method
- [ ] Add initial credit ($10 minimum)
- [ ] Create API key named `ai-voice-tutor`
- [ ] Copy key (starts with `sk-...`)
- [ ] Set monthly budget to $300
- [ ] Enable usage notifications
- [ ] Test Whisper endpoint
- [ ] Test TTS endpoint
- [ ] Add to `.env.local` as `OPENAI_API_KEY`

**Test Commands:**
```bash
# Test TTS (easier to test)
curl https://api.openai.com/v1/audio/speech \
  -H "Authorization: Bearer YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"tts-1","input":"Test","voice":"alloy"}' \
  --output test.mp3
```

✅ **Status**: [ ] Complete

---

## 3. MongoDB Atlas - $15/month (Flex) or Free (M0)

**Website**: https://www.mongodb.com/cloud/atlas/register

### Steps:
- [ ] Sign up for MongoDB Atlas
- [ ] Create new cluster
  - [ ] Choose: Serverless (Flex) for production OR M0 Free for dev
  - [ ] Provider: AWS
  - [ ] Region: Closest to users
  - [ ] Name: `ai-voice-tutor`
- [ ] Create database user
  - [ ] Username: `aivoicetutor`
  - [ ] Auto-generate password (save it!)
  - [ ] Privilege: Read and write to any database
- [ ] Configure network access
  - [ ] Dev: Allow from anywhere (0.0.0.0/0)
  - [ ] Prod: Add specific IP addresses
- [ ] Get connection string
  - [ ] Database → Connect → Connect your application
  - [ ] Driver: Node.js
  - [ ] Copy connection string
  - [ ] Replace `<password>` with actual password
  - [ ] Add database name: `/ai-voice-tutor?`
- [ ] Test connection with MongoDB Compass
- [ ] Add to `.env.local` as `MONGODB_URI`

**Connection String Format:**
```
mongodb+srv://aivoicetutor:PASSWORD@cluster.xxxxx.mongodb.net/ai-voice-tutor?retryWrites=true&w=majority
```

**Test Command:**
```bash
# Using mongosh (install first: npm install -g mongodb)
mongosh "YOUR_CONNECTION_STRING"
```

✅ **Status**: [ ] Complete

---

## 4. Cloudflare R2 - ~$5/month

**Website**: https://dash.cloudflare.com/sign-up

### Steps:
- [ ] Sign up for Cloudflare account
- [ ] Navigate to R2 section
- [ ] Enable R2 (choose Pay As You Go)
- [ ] Create bucket
  - [ ] Name: `ai-voice-tutor-audio`
  - [ ] Location: Automatic
- [ ] Create API token
  - [ ] R2 → Manage R2 API Tokens
  - [ ] Create API token
  - [ ] Name: `ai-voice-tutor-token`
  - [ ] Permissions: Object Read & Write
  - [ ] Save all 3 values:
    - [ ] Access Key ID
    - [ ] Secret Access Key
    - [ ] Endpoint URL (with account ID)
- [ ] Test upload with AWS SDK
- [ ] Add to `.env.local`:
  - [ ] `R2_ACCESS_KEY_ID`
  - [ ] `R2_SECRET_ACCESS_KEY`
  - [ ] `R2_ACCOUNT_ID`
  - [ ] `R2_BUCKET_NAME`

**Endpoint Format:**
```
https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com
```

✅ **Status**: [ ] Complete

---

## 5. NextAuth Secret - Free (Self-Generated)

### Steps:
- [ ] Generate random secret (32+ characters)
- [ ] Copy the generated value
- [ ] Add to `.env.local` as `NEXTAUTH_SECRET`
- [ ] Add `NEXTAUTH_URL=http://localhost:3000` (dev)

**Generate Command (choose one):**
```bash
# Option 1: OpenSSL
openssl rand -base64 32

# Option 2: Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Option 3: Online
# Visit: https://generate-secret.vercel.app/32
```

✅ **Status**: [ ] Complete

---

## 📝 Final .env.local Template

Create `.env.local` in project root:

```bash
# Copy example file
cp .env.example .env.local

# Edit with your values
nano .env.local
```

**Complete template:**
```env
# Anthropic (Claude AI)
ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# OpenAI (Whisper + TTS)
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# MongoDB Atlas
MONGODB_URI=mongodb+srv://aivoicetutor:PASSWORD@cluster.xxxxx.mongodb.net/ai-voice-tutor?retryWrites=true&w=majority

# Cloudflare R2
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=xxxxxxxxxxxxxxxxxxxxx
R2_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
R2_BUCKET_NAME=ai-voice-tutor-audio
R2_PUBLIC_URL=https://your_account_id.r2.cloudflarestorage.com

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# App Settings
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## ✅ Verification Steps

### 1. Check all keys are set:
```bash
# Run this in your terminal
cat .env.local | grep -E "^[A-Z_]+=" | wc -l
# Should show: 11 (or more)
```

### 2. Verify no placeholders remain:
```bash
cat .env.local | grep -E "xxx|your_|YOUR_|PASSWORD|changeme"
# Should return: nothing (empty)
```

### 3. Test application startup:
```bash
npm install
npm run dev
```

Check browser console and terminal for any "missing key" errors.

### 4. Run key test script:

Create `scripts/verify-keys.js`:
```javascript
require('dotenv').config({ path: '.env.local' });

const keys = {
  'Anthropic': process.env.ANTHROPIC_API_KEY,
  'OpenAI': process.env.OPENAI_API_KEY,
  'MongoDB': process.env.MONGODB_URI,
  'R2 Access Key': process.env.R2_ACCESS_KEY_ID,
  'R2 Secret Key': process.env.R2_SECRET_ACCESS_KEY,
  'NextAuth Secret': process.env.NEXTAUTH_SECRET
};

console.log('🔍 API Keys Verification\n');

let allPresent = true;
Object.entries(keys).forEach(([name, value]) => {
  const status = value ? '✅' : '❌';
  const masked = value ? value.substring(0, 10) + '...' : 'MISSING';
  console.log(`${status} ${name}: ${masked}`);
  if (!value) allPresent = false;
});

console.log('\n' + (allPresent ? '🎉 All keys present!' : '⚠️  Some keys missing!'));
process.exit(allPresent ? 0 : 1);
```

Run:
```bash
node scripts/verify-keys.js
```

---

## 💰 Expected Monthly Costs (100 DAU)

| Service | Cost | Per User |
|---------|------|----------|
| Anthropic Claude | $165 | $1.65 |
| OpenAI (Whisper + TTS) | $209 | $2.09 |
| MongoDB Atlas Flex | $15 | $0.15 |
| Cloudflare R2 | $5 | $0.05 |
| NextAuth | $0 | $0 |
| **Total** | **$394** | **$3.94** |

**Revenue (70 paid users @ $24.99):** $1,749  
**Profit:** $1,355 (77% margin)

---

## 🔐 Security Checklist

- [ ] `.env.local` is in `.gitignore`
- [ ] Never commit API keys to Git
- [ ] Use different keys for dev/staging/production
- [ ] Enable billing alerts on all services
- [ ] Set usage limits where available
- [ ] Monitor usage regularly
- [ ] Rotate keys every 90 days
- [ ] Store production keys in secure vault (AWS Secrets Manager, Vercel env vars)

---

## 🆘 Common Issues

### Issue: "Invalid API Key"
**Solution:**
- Check for extra spaces or newlines
- Verify key is active in dashboard
- Ensure no quote marks around key in .env.local

### Issue: MongoDB connection timeout
**Solution:**
- Check IP whitelist in Atlas
- Verify network access allows your IP
- Test connection with MongoDB Compass

### Issue: R2 "Access Denied"
**Solution:**
- Verify API token has Object Read & Write permissions
- Check bucket name is correct
- Confirm account ID in endpoint URL

### Issue: "Module not found" after adding keys
**Solution:**
```bash
# Clear Next.js cache
rm -rf .next
npm run dev
```

---

## 📚 Additional Resources

- **Full Guide**: [API_KEYS_SETUP.md](./API_KEYS_SETUP.md)
- **Anthropic Docs**: https://docs.anthropic.com/
- **OpenAI Docs**: https://platform.openai.com/docs/
- **MongoDB Docs**: https://docs.mongodb.com/
- **Cloudflare R2 Docs**: https://developers.cloudflare.com/r2/

---

## 🎯 Next Steps After Setup

Once all keys are working:

1. ✅ **Test each service individually**
2. ✅ **Run the application**: `npm run dev`
3. ✅ **Seed sample chapters**: `npm run db:seed`
4. ✅ **Start building API routes**
5. ✅ **Connect frontend components**

**You're ready to develop!** 🚀

---

**Need help?** Check the [full setup guide](./API_KEYS_SETUP.md) or open an issue.
