# Demo OTP System Documentation

## Overview
This is a fake/demo OTP (One-Time Password) system that:
- ✅ Generates random 6-digit codes
- ✅ Saves to Supabase
- ✅ Displays codes in browser console (dev mode)
- ✅ Verifies OTP codes with expiry handling

## Files Created

### 1. **`src/lib/otp.js`** - Core OTP Library
Main functions for OTP operations:

```javascript
import { generateOTP, sendOTP, verifyOTP } from '../lib/otp'
```

#### Functions:

**`generateOTP()`**
- Generates a random 6-digit code
- Logs to console (dev mode)
- Returns: `"123456"` (string)

**`sendOTP(phone)`**
- Generates + saves OTP to Supabase
- Parameters: `phone` (string)
- Returns: `{ otp, data, error }`

```javascript
const { otp, data, error } = await sendOTP('+63 912 345 6789')
```

**`verifyOTP(phone, code)`**
- Verifies if OTP is valid and not expired
- Marks OTP as used after verification
- Parameters: `phone`, `code` (strings)
- Returns: `{ isValid, error, data }`

```javascript
const { isValid, error } = await verifyOTP('+63 912 345 6789', '123456')
```

**`saveOTP(phone, otp, expiryMinutes)`**
- Saves OTP directly to Supabase
- Default expiry: 10 minutes
- Returns: `{ data, error }`

**`cleanupExpiredOTPs()`**
- Removes expired OTP records
- Returns: `{ deletedCount, error }`

### 2. **`pages/OTPDemo.jsx`** - Demo Component
Interactive demo UI for testing OTP system
- Phone input form
- OTP input verification
- Real-time feedback messages
- Console instructions

### 3. **`docs/OTP_SETUP.sql`** - Database Schema
SQL script to create `otp_codes` table in Supabase

## Setup Instructions

### Step 1: Create Database Table
1. Go to Supabase Dashboard
2. Open SQL Editor
3. Copy & paste contents from `docs/OTP_SETUP.sql`
4. Click "Run"

This creates:
- ✅ `otp_codes` table
- ✅ Performance indexes
- ✅ Row Level Security (RLS) policies

### Step 2: Add Demo to Routes (Optional)
In your router configuration, add:

```jsx
import OTPDemo from './pages/OTPDemo'

// In your route definitions:
{
  path: '/otp-demo',
  element: <OTPDemo />
}
```

Then visit: `http://localhost:5173/otp-demo`

## Usage Examples

### Example 1: Send OTP
```javascript
import { sendOTP } from '../lib/otp'

const handleSendOTP = async () => {
  const { otp, error } = await sendOTP('+63 912 345 6789')
  if (error) {
    console.error('Failed to send OTP:', error)
  } else {
    console.log(`OTP sent: ${otp}`) // You'll see this in console
  }
}
```

### Example 2: Verify OTP
```javascript
import { verifyOTP } from '../lib/otp'

const handleVerify = async () => {
  const { isValid, error } = await verifyOTP(
    '+63 912 345 6789',
    userEnteredOTP
  )
  
  if (isValid) {
    console.log('✅ OTP verified!')
    // Proceed with login
  } else {
    console.error('❌ Invalid OTP:', error?.message)
  }
}
```

### Example 3: Integration with Login
```javascript
import { sendOTP, verifyOTP } from '../lib/otp'

// Step 1: User enters phone → Generate OTP
const handlePhoneSubmit = async (phone) => {
  const { otp, error } = await sendOTP(phone)
  if (error) return setError(error.message)
  
  setShowOtpInput(true)
  setPendingPhone(phone)
  // OTP is now in console + Supabase
}

// Step 2: User enters OTP → Verify
const handleOtpSubmit = async (code) => {
  const { isValid, error } = await verifyOTP(pendingPhone, code)
  
  if (isValid) {
    // Login successful
    navigate('/dashboard')
  } else {
    setError('Invalid OTP. Try again.')
  }
}
```

## Console Output Examples

When you use the OTP system, you'll see logs like:

```
🔐 [OTP Generated] 482937

💾 [Saving OTP to Supabase]
{
  phone: "+63 912 345 6789",
  otp: "482937",
  expiresAt: "2026-05-24T15:30:00.000Z",
  expiryMinutes: 10
}

✅ [OTP Saved Successfully]
{
  id: 42,
  phone: "+63 912 345 6789",
  code: "482937",
  expires_at: "2026-05-24T15:30:00.000Z",
  is_used: false
}

📱 [SMS Would Be Sent] OTP 482937 sent to +63 912 345 6789

🔍 [Verifying OTP] { phone: "+63 912 345 6789", code: "482937" }

✅ [OTP Verified Successfully]
{
  id: 42,
  phone: "+63 912 345 6789",
  code: "482937",
  is_used: true
}
```

## Database Schema

```sql
CREATE TABLE otp_codes (
  id BIGSERIAL PRIMARY KEY,
  phone TEXT NOT NULL,
  code TEXT NOT NULL,
  created_at TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  is_used BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP
)
```

### Column Descriptions:
- `id` - Unique identifier
- `phone` - Phone number or user identifier
- `code` - 6-digit OTP code
- `created_at` - When OTP was generated
- `expires_at` - When OTP expires (default: 10 minutes)
- `is_used` - Whether OTP was already used
- `updated_at` - Last modification time

## Testing Checklist

- [ ] Created `otp_codes` table in Supabase
- [ ] Can generate OTPs (check console)
- [ ] OTPs are saved to Supabase
- [ ] Can verify OTPs
- [ ] Expired OTPs are rejected
- [ ] OTPs are marked as used after verification
- [ ] Multiple OTP requests work
- [ ] Cleanup function removes expired OTPs

## Dev Mode Features

The system includes special features for development:

1. **Console Logging** 🔍
   - All OTP operations logged with emojis
   - Easy to track flow in dev tools

2. **Demo Component** 🎯
   - Full UI for testing
   - Instructions displayed
   - Real-time feedback

3. **Mock Data Friendly** ✅
   - Works with any phone format
   - No validation on phone numbers
   - Perfect for development/testing

## Next Steps

1. ✅ Run the SQL setup script
2. ✅ Test with `/otp-demo` page
3. ✅ Integrate into your Login flow
4. ✅ Add SMS gateway when ready for production

## Production Considerations

When deploying to production:

- [ ] Replace console logs with proper logging service
- [ ] Add actual SMS gateway (e.g., Twilio, AWS SNS)
- [ ] Implement rate limiting (e.g., max 5 OTPs per phone per hour)
- [ ] Add phone number validation
- [ ] Adjust OTP expiry time (currently 10 minutes)
- [ ] Monitor failed verification attempts
- [ ] Add honeypot/CAPTCHA to prevent abuse

## Troubleshooting

**Q: OTP not showing in console**
- Check that browser developer tools are open (F12)
- Make sure you're using Chrome/Firefox dev console
- Check that functions are actually being called

**Q: "Table otp_codes does not exist"**
- Run the SQL setup script in Supabase
- Make sure script ran without errors

**Q: OTP verification failing**
- Check OTP hasn't expired (10 minute default)
- Verify you're using correct phone number
- Check that OTP wasn't already used

**Q: Supabase connection errors**
- Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env`
- Check Supabase RLS policies allow INSERT/SELECT/UPDATE

## Support

For issues or questions:
1. Check console logs for error messages
2. Verify database setup in Supabase dashboard
3. Review this documentation
4. Check Supabase error messages in dashboard
