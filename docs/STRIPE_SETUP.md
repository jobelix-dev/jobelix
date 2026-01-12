# Stripe Configuration Guide

## Required Environment Variables

Add these to your `.env.local` file:

```bash
# Stripe Secret Key (from Stripe Dashboard > Developers > API keys)
STRIPE_SECRET_KEY=sk_test_...

# Stripe Webhook Secret (from Stripe Dashboard > Developers > Webhooks)
# Generate this after creating your webhook endpoint
STRIPE_WEBHOOK_SECRET=whsec_...
```

## Setup Steps

### 1. Get Your Stripe Secret Key
- Go to https://dashboard.stripe.com/test/apikeys
- Copy the "Secret key" (starts with `sk_test_...` for test mode)
- Add it to `.env.local` as `STRIPE_SECRET_KEY`

### 2. Test Locally with Stripe CLI

```bash
# Install Stripe CLI (if not already installed)
# For Arch Linux:
sudo pacman -S stripe-cli-bin

# Login to Stripe
stripe login

# Forward webhooks to your local server
stripe listen --forward-to localhost:3000/api/stripe/webhook

# This will output a webhook signing secret like: whsec_...
# Copy this and add it to .env.local as STRIPE_WEBHOOK_SECRET
```

### 3. Test the Payment Flow

```bash
# Start your Next.js server
npm run dev

# In the app, click "Buy Credits"
# Use test card: 4242 4242 4242 4242
# Any future expiry date and any CVC
```

### 4. Production Setup

When deploying to production:

1. Create a webhook endpoint in Stripe Dashboard:
   - Go to: https://dashboard.stripe.com/webhooks
   - Click "Add endpoint"
   - URL: `https://your-domain.com/api/stripe/webhook`
   - Events to listen for:
     - `checkout.session.completed`
     - `payment_intent.payment_failed`
   - Copy the webhook signing secret

2. Update your production environment variables:
   - Use live mode secret key (starts with `sk_live_...`)
   - Use production webhook secret (starts with `whsec_...`)

## Product Configuration

Current product price ID: `price_1SoYBxRYZbsQXyd5fiLVwUB4`

To change the credits amount, update this line in `AutoApplyTab.tsx`:
```typescript
creditsAmount: 100, // Change this number
```

Make sure it matches what your Stripe product should provide.

## Testing

### Test Cards (Stripe Test Mode)
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- 3D Secure: `4000 0025 0000 3155`

Use any:
- Future expiry date (e.g., 12/34)
- Any 3-digit CVC (e.g., 123)
- Any ZIP code

## Troubleshooting

**Webhook not receiving events:**
1. Check Stripe CLI is running: `stripe listen --forward-to localhost:3000/api/stripe/webhook`
2. Check your webhook secret is correct in `.env.local`
3. Restart your Next.js server after adding env variables

**Credits not added after payment:**
1. Check the webhook logs in Stripe Dashboard
2. Check your Next.js terminal for webhook handler logs
3. Check the `credit_purchases` table in Supabase for the transaction

**"Missing STRIPE_SECRET_KEY" error:**
1. Make sure `.env.local` has `STRIPE_SECRET_KEY` set
2. Restart your Next.js server
