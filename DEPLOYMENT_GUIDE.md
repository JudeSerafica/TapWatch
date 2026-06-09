# Deployment Guide for TapWatch

## What Changed

The app now uses **Vercel Serverless Functions** instead of a separate Express server. This means:
- ✅ Frontend (React) deployed to Vercel
- ✅ Backend (Node.js API) deployed as Vercel Functions in `/api` folder
- ✅ Everything on one platform - simpler, faster, free tier available

## Before Deploying

Make sure you have these **environment variables** set in Vercel:

### Required Env Vars:
```
GMAIL_USER=your-gmail@gmail.com
GMAIL_APP_PASSWORD=your-app-password-16-chars
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-key
```

**How to get Gmail App Password:**
1. Go to: https://myaccount.google.com/security
2. Enable "2-Step Verification" if not already done
3. Go to "App passwords"
4. Generate password for "Mail" + "Windows Computer"
5. Copy the 16-character password

## Deployment Steps

### Option 1: Deploy via Git Push (Recommended)

1. **Commit your changes:**
```bash
git add .
git commit -m "Add email OTP verification with Vercel serverless functions"
```

2. **Push to GitHub:**
```bash
git push origin main
```

3. **Vercel auto-deploys** when you push to main branch ✅

### Option 2: Deploy via Vercel CLI

```bash
# Install Vercel CLI (if not already)
npm install -g vercel

# Deploy
vercel

# For production
vercel --prod
```

### Option 3: Deploy via Vercel Dashboard

1. Go to https://vercel.com/dashboard
2. Select your TapWatch project
3. It auto-deploys on push, or click "Deploy" manually

## Verify Deployment

After deployment:

1. **Check Build Logs:**
   - Go to Vercel Dashboard → TapWatch → Deployments
   - Click latest deployment → View Build Logs
   - Look for success messages

2. **Test the app:**
   - Visit your deployment URL (e.g., https://tapwatch.vercel.app)
   - Try signing up with email
   - Verify you receive the email
   - Login with the account

3. **Check API Functions:**
   - `/api/signup` - sends OTP email
   - `/api/verify` - verifies OTP code

## Local Development (Before Deploy)

To test locally before pushing:

```bash
# Install dependencies
npm install

# Start dev server (frontend only)
npm run dev

# The app will call /api/signup and /api/verify locally
# Vercel will route these to local functions if you use Vercel CLI
```

## Troubleshooting

### "Email failed to send"
- Check GMAIL_USER and GMAIL_APP_PASSWORD in Vercel env vars
- Gmail account must have 2FA enabled
- Use 16-character app password, not regular password

### "Invalid credentials on login"
- Make sure account was created successfully
- Check that email matches exactly (case-insensitive)
- Verify password was saved correctly

### "OTP code not sent"
- Check Vercel logs: Dashboard → Deployments → latest → Logs
- Make sure gmail environment variables are set

## Old server.js

The `server.js` file is still in the repo but **no longer used**. You can:
- Keep it for local backup
- Delete it if you want (optional)

The new API functions are in `/api` folder instead.

## Next Steps

- Monitor Vercel logs for errors
- Set up error alerts in Vercel dashboard
- Consider adding database persistence for OTPs (currently in-memory)

## Questions?

Check Vercel docs: https://vercel.com/docs
