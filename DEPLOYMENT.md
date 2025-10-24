# Deployment Guide - AI Voice Tutor

## Overview

This guide covers deploying the AI Voice Tutor application to production. The application consists of:
- **Frontend**: Next.js application (can deploy to Vercel, Netlify, or Cloudflare)
- **Backend**: Next.js API routes (serverless functions)
- **Database**: MongoDB Atlas
- **Storage**: Cloudflare R2 (optional for production audio storage)

## Prerequisites

- [ ] MongoDB Atlas account (M10+ tier recommended for production)
- [ ] OpenAI API key
- [ ] Anthropic API key
- [ ] Cloudflare account (for R2 storage)
- [ ] Deployment platform account (Vercel/Netlify/Cloudflare)

## Option 1: Deploy to Vercel (Recommended)

### Step 1: Prepare Repository

```bash
# Ensure all files are committed
git add .
git commit -m "Ready for deployment"
git push origin main
```

### Step 2: Connect to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click "Import Project"
3. Import your GitHub repository
4. Select `ai-voice-tutor` repository

### Step 3: Configure Environment Variables

Add these in Vercel dashboard under Settings > Environment Variables:

```
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app

MONGODB_URI=mongodb+srv://...
MONGODB_DB_NAME=ai-voice-tutor

OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
JWT_SECRET=your-production-secret-at-least-32-characters

ENABLE_PROMPT_CACHING=true
ENABLE_TTS_CACHING=true

R2_ACCOUNT_ID=your-cloudflare-account-id
R2_ACCESS_KEY_ID=your-r2-access-key
R2_SECRET_ACCESS_KEY=your-r2-secret
R2_BUCKET_NAME=ai-voice-tutor-audio
R2_PUBLIC_URL=https://your-bucket.r2.cloudflarestorage.com

NEXT_PUBLIC_FOUNDER_PRICE=19.00
NEXT_PUBLIC_PLUS_PRICE=24.99
NEXT_PUBLIC_PRO_PRICE=39.99
NEXT_PUBLIC_FREE_SESSIONS=5
```

### Step 4: Deploy

1. Click "Deploy"
2. Wait for build to complete (~2-3 minutes)
3. Visit your deployment URL

### Step 5: Seed Production Database

```bash
# From your local machine, connect to production MongoDB
export MONGODB_URI="your-production-mongodb-uri"
npm run db:seed
```

## Option 2: Deploy to Cloudflare Pages

### Step 1: Build Application

```bash
npm run build
```

### Step 2: Deploy to Cloudflare

```bash
npx wrangler pages deploy .next --project-name=ai-voice-tutor
```

### Step 3: Configure Environment Variables

In Cloudflare dashboard:
1. Go to Workers & Pages
2. Select your project
3. Go to Settings > Environment Variables
4. Add all variables from above

### Step 4: Configure Cloudflare Workers

Create `wrangler.toml`:

```toml
name = "ai-voice-tutor"
compatibility_date = "2024-01-01"

[env.production]
vars = { NODE_ENV = "production" }

[[r2_buckets]]
binding = "AUDIO_BUCKET"
bucket_name = "ai-voice-tutor-audio"
```

## MongoDB Atlas Setup (Production)

### Step 1: Create Cluster

1. Go to [cloud.mongodb.com](https://cloud.mongodb.com)
2. Create new cluster (M10 or higher for production)
3. Select your region (close to users)
4. Configure cluster name: `ai-voice-tutor-prod`

### Step 2: Configure Network Access

1. Go to Network Access
2. Add IP: `0.0.0.0/0` (allow from anywhere for serverless)
3. Or whitelist specific IPs if possible

### Step 3: Create Database User

1. Go to Database Access
2. Add new user
3. Username: `ai-tutor-app`
4. Password: Generate strong password
5. Role: `readWrite` on `ai-voice-tutor` database

### Step 4: Get Connection String

1. Click "Connect" on your cluster
2. Choose "Connect your application"
3. Copy connection string
4. Replace `<password>` with your password

```
mongodb+srv://ai-tutor-app:<password>@ai-voice-tutor-prod.xxxxx.mongodb.net/ai-voice-tutor?retryWrites=true&w=majority
```

## Cloudflare R2 Setup (Audio Storage)

### Step 1: Create R2 Bucket

1. Go to Cloudflare Dashboard
2. Navigate to R2
3. Click "Create bucket"
4. Name: `ai-voice-tutor-audio`
5. Location: Choose region close to users

### Step 2: Generate API Tokens

1. Go to R2 > Manage R2 API Tokens
2. Create API token
3. Permissions: `Object Read & Write`
4. Save: Account ID, Access Key ID, Secret Access Key

### Step 3: Configure Public Access (Optional)

1. Go to bucket settings
2. Enable "Public access"
3. Note the public URL

## Post-Deployment Setup

### Step 1: Test Deployment

```bash
# Test health check
curl https://your-domain.vercel.app/api/health

# Should return: {"status":"ok"}
```

### Step 2: Create Admin Account

1. Visit your production URL
2. Click "Sign Up"
3. Create your admin account
4. Verify email (if email service configured)

### Step 3: Test End-to-End

1. Login with your account
2. Select a chapter
3. Start a voice session
4. Record and send a message
5. Verify audio response plays
6. Check progress tracking

### Step 4: Monitor Costs

Set up monitoring in MongoDB:

```javascript
// Query recent sessions costs
db.sessions.aggregate([
  {
    $match: {
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    }
  },
  {
    $group: {
      _id: null,
      totalCost: { $sum: "$costs.totalCost" },
      totalSessions: { $sum: 1 },
      avgCost: { $avg: "$costs.totalCost" }
    }
  }
])
```

## Performance Optimization

### Enable Caching

In production environment variables:
```
ENABLE_PROMPT_CACHING=true
ENABLE_TTS_CACHING=true
```

### Configure CDN

1. Use Cloudflare for CDN (automatic with Cloudflare Pages)
2. Or enable Vercel Edge Network (automatic on Vercel)

### Database Indexing

Ensure indexes are created (done by seeding script):

```javascript
// Check indexes
db.sessions.getIndexes()
db.chapters.getIndexes()
db.user_progress.getIndexes()
```

## Security Checklist

- [ ] Strong JWT secret (32+ characters)
- [ ] HTTPS only (automatic on Vercel/Cloudflare)
- [ ] Rate limiting configured
- [ ] API keys stored in environment variables (never in code)
- [ ] CORS configured for your domain only
- [ ] MongoDB network access restricted
- [ ] Database user has minimal permissions
- [ ] Regular security updates

## Monitoring & Alerts

### Set Up Sentry (Optional)

```bash
npm install @sentry/nextjs
```

Add to `.env.local`:
```
SENTRY_DSN=https://...
```

### MongoDB Alerts

1. Go to MongoDB Atlas > Alerts
2. Create alerts for:
   - High connection count (> 80% of pool)
   - High CPU usage (> 80%)
   - Storage usage (> 80%)
   - Failed queries

### Cost Alerts

Set up billing alerts:

**OpenAI:**
1. Go to OpenAI dashboard > Usage
2. Set up email alerts at $50, $100, $200

**Anthropic:**
1. Go to Anthropic console > Settings
2. Set up usage limits and alerts

## Scaling

### Database Scaling

When to upgrade MongoDB:
- **M10 → M20**: > 500 active users
- **M20 → M30**: > 2,000 active users
- **M30+**: > 5,000 active users

### Serverless Scaling

Both Vercel and Cloudflare auto-scale:
- No manual intervention needed
- Costs scale linearly with usage
- Monitor function execution time and memory

### CDN Caching

Enable aggressive caching for static assets:
- Images: 1 year
- JS/CSS: 1 year with content hash
- API responses: No caching

## Troubleshooting

### Deployment Fails

**Error**: Build failed

**Solution**:
```bash
# Check build locally first
npm run build

# Fix any TypeScript errors
npm run type-check

# Fix any linting errors
npm run lint
```

### API Timeouts

**Error**: Function execution timeout

**Solution**:
1. Check API response times in logs
2. Optimize slow database queries
3. Add indexes if needed
4. Consider caching more aggressively

### High Costs

**Issue**: API costs higher than expected

**Solution**:
1. Check if caching is enabled
2. Review off-topic filter effectiveness
3. Monitor cache hit rates
4. Consider shorter session timeouts

## Rollback Procedure

### Vercel

1. Go to Deployments
2. Find previous working deployment
3. Click "..." > "Promote to Production"

### Cloudflare

1. Go to Workers & Pages > Deployments
2. Select previous deployment
3. Click "Rollback"

## Maintenance

### Regular Tasks

**Weekly:**
- Review error logs
- Check cost metrics
- Monitor user growth

**Monthly:**
- Review and optimize database
- Update dependencies
- Review security advisories
- Analyze cost trends

**Quarterly:**
- Evaluate scaling needs
- Review and optimize costs
- Plan new features
- Security audit

## Support

For deployment issues:
1. Check deployment logs
2. Review [SETUP.md](./SETUP.md)
3. Open GitHub issue with:
   - Deployment platform
   - Error messages
   - Steps to reproduce

## Next Steps

After successful deployment:

1. [ ] Configure custom domain
2. [ ] Set up email service (optional)
3. [ ] Configure payment processing (Stripe)
4. [ ] Set up analytics
5. [ ] Create admin dashboard
6. [ ] Document user onboarding
7. [ ] Set up customer support

---

**Deployment Time**: ~30 minutes for first deployment

**Status**: Ready for production deployment
