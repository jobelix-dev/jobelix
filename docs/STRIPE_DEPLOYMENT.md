# Stripe Deployment Guide: Test to Production

## Current Status: Test Mode ✅

Your implementation is **environment-agnostic** and works in both test and live modes. The code automatically adapts based on your Stripe keys.

---

## Security Features Implemented

### ✅ Authentication
- All requests verify user authentication via Supabase
- Unauthorized requests return 401

### ✅ Server-Side Validation
- Price-to-credits mapping stored server-side only
- Client cannot manipulate credit amounts
- Price IDs validated against whitelist

### ✅ Idempotency
- Duplicate webhook events are safely ignored
- Checks both `stripe_event_id` and `stripe_checkout_session_id`
- Prevents double-crediting even if Stripe retries

### ✅ Webhook Security
- Signature verification enforced
- Rejects requests without valid Stripe signatures
- Protects against replay attacks

### ✅ Input Validation
- All inputs sanitized and validated
- Type checking for all parameters
- Safe error handling without leaking sensitive data

---

## Switching from Test Mode to Live Mode

### Step 1: Create Live Mode Product in Stripe

1. **Switch to Live Mode** in Stripe Dashboard (toggle in top right)
2. **Create Product:**
   - Go to: Products → Add product
   - Name: "500 Credits" (or your preference)
   - Pricing: One-time payment
   - Price: €5.00 (or your price)
   - Click "Save product"
3. **Copy Live Price ID:**
   - Format: `price_1XxxxxxxxxxxxxxxXXXXXX` (NOT starting with `price_test_`)
   - Save this for Step 2

### Step 2: Update Price Mapping

Edit these two files and add your live price ID:

**File: `app/api/stripe/create-checkout/route.ts`**
```typescript
const PRICE_TO_CREDITS: Record<string, number> = {
  // Test mode
  'price_1SoYLdRkZ3GWynzuYzRcNCuG': 500,
  
  // Live mode - ADD YOUR LIVE PRICE ID HERE
  'price_1YourLivePriceID': 500,
};
```

**File: `app/api/stripe/webhook/route.ts`**
```typescript
const PRICE_TO_CREDITS: Record<string, number> = {
  // Test mode
  'price_1SoYLdRkZ3GWynzuYzRcNCuG': 500,
  
  // Live mode - ADD YOUR LIVE PRICE ID HERE
  'price_1YourLivePriceID': 500,
};
```

**File: `app/dashboard/student/features/auto-apply/AutoApplyTab.tsx`**
```typescript
const handleBuyCredits = async () => {
  try {
    const response = await fetch('/api/stripe/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        priceId: 'price_1YourLivePriceID', // CHANGE THIS TO YOUR LIVE PRICE ID
      }),
    });
    // ... rest of code
```

### Step 3: Get Live Stripe Keys

1. Go to: https://dashboard.stripe.com/apikeys (in **Live mode**)
2. Copy:
   - **Secret key** (starts with `sk_live_...`)
   - **Publishable key** (starts with `pk_live_...`) - if needed

### Step 4: Create Production Webhook

1. Go to: https://dashboard.stripe.com/webhooks (in **Live mode**)
2. Click "Add endpoint"
3. **Endpoint URL:** `https://your-domain.vercel.app/api/stripe/webhook`
4. **Events to listen for:**
   - `checkout.session.completed`
   - `payment_intent.payment_failed`
5. Click "Add endpoint"
6. **Copy the Webhook Signing Secret** (starts with `whsec_...`)

### Step 5: Update Vercel Environment Variables

In your Vercel project settings (Settings → Environment Variables):

```bash
# Production (Live Mode)
STRIPE_SECRET_KEY=sk_live_YOUR_LIVE_SECRET_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_LIVE_WEBHOOK_SECRET

# Other required variables
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
OPENAI_API_KEY=your_openai_key
```

**Important:** Set these for "Production" environment in Vercel.

### Step 6: Deploy to Vercel

```bash
# Commit your code changes
git add .
git commit -m "Add live mode Stripe price ID"
git push

# Deploy to Vercel
vercel --prod
```

Or push to your `main` branch if you have auto-deployments configured.

### Step 7: Test Live Mode

⚠️ **Use a real card** - Test cards won't work in live mode!

1. Visit your production site
2. Click "Buy Credits"
3. Use a **real credit card** (will actually charge)
4. Verify credits are added after payment

---

## Environment Variables Summary

### Local Development (.env.local)
```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_... (from stripe CLI)
```

### Production (Vercel)
```bash
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_... (from Stripe dashboard webhook)
```

---

## Testing Checklist

### Before Going Live
- [ ] Live mode product created in Stripe
- [ ] Live price ID added to both route files
- [ ] Live price ID added to AutoApplyTab.tsx
- [ ] Live Stripe keys added to Vercel
- [ ] Production webhook created and secret added to Vercel
- [ ] Code deployed to production
- [ ] Test purchase with real card (small amount)
- [ ] Verify credits added correctly
- [ ] Check webhook logs in Stripe dashboard
- [ ] Verify purchase record in Supabase

### After Going Live
- [ ] Monitor webhook logs for failures
- [ ] Check Supabase for duplicate purchases (should be none)
- [ ] Test purchase flow regularly
- [ ] Set up Stripe email notifications for failed payments

---

## Troubleshooting

### Credits not added after payment
1. Check Stripe webhook logs: https://dashboard.stripe.com/webhooks
2. Look for failed webhook deliveries
3. Check your Vercel logs for webhook errors
4. Verify webhook secret is correct in Vercel

### Payment succeeds but webhook fails
- Webhook URL might be wrong in Stripe
- Webhook secret might be incorrect
- Check Vercel function logs for errors

### "Invalid price ID" error
- Price ID not in PRICE_TO_CREDITS mapping
- Make sure you added the live price ID to ALL three files

---

## Security Best Practices

✅ **Your implementation follows all security best practices:**

1. ✅ Never trust client input for credit amounts
2. ✅ Always verify webhook signatures
3. ✅ Implement idempotency checks
4. ✅ Validate all inputs server-side
5. ✅ Use environment variables for secrets
6. ✅ Log errors without exposing sensitive data
7. ✅ Use HTTPS in production (Vercel provides this)
8. ✅ Session expiry to prevent replay attacks

---

## Rollback Plan

If something goes wrong in production:

1. **Emergency:** Change `AutoApplyTab.tsx` to use test price ID
2. **Deploy:** Push to Vercel immediately
3. **Notify users:** Show maintenance message
4. **Debug:** Check webhook logs and Vercel logs
5. **Fix:** Update configuration
6. **Re-deploy:** Test thoroughly before switching back to live

---

## Support

- **Stripe Dashboard:** https://dashboard.stripe.com
- **Stripe API Docs:** https://stripe.com/docs/api
- **Webhook Testing:** Use Stripe CLI in production: `stripe listen --forward-to https://your-domain.vercel.app/api/stripe/webhook`
