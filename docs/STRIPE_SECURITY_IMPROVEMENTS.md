# Stripe Security Improvements

**Date:** 2026-01-13  
**Status:** ✅ COMPLETED  
**Author:** Professional Security Audit & Implementation

## Overview

This document details the comprehensive security improvements applied to the Stripe payment integration in the Jobelix application. All changes follow zero-trust principles and Stripe best practices.

---

## Issues Identified & Fixed

### 1. ❌ Status Flow Inconsistency
**Problem:**
- Create-checkout created purchase with status "initiated"
- Then immediately updated to "pending"
- Webhook looked for "pending" purchases
- Race condition potential if webhook fired before status update

**Solution:**
- ✅ Single status flow: Create purchase as "pending" from the start
- ✅ Removed redundant status update
- ✅ Simplified code and eliminated race condition window

### 2. ❌ Currency Mismatch
**Problem:**
- Database default: 'eur' (in migration)
- Code hardcoded: 'usd' (in create-checkout)
- Inconsistency between DB and actual Stripe price

**Solution:**
- ✅ Fetch actual currency from Stripe price object
- ✅ Use `priceObject.currency` instead of hardcoding
- ✅ Ensures DB matches Stripe's source of truth

### 3. ❌ Price Cents Not Set
**Problem:**
- Create-checkout inserted `price_cents: 0`
- Webhook later updated with actual amount
- Database temporarily inconsistent

**Solution:**
- ✅ Fetch price object from Stripe in create-checkout
- ✅ Set `price_cents: priceObject.unit_amount || 0`
- ✅ Database accurate from insert time

### 4. ❌ Metadata Trust Issues
**Problem:**
- Webhook compared credits from metadata vs line items
- Logged "warning" if mismatch (but still used line items)
- Unnecessary code that implied metadata was important

**Solution:**
- ✅ Removed all metadata trust/comparison code
- ✅ Only validate from Stripe line items (source of truth)
- ✅ Cleaned metadata to bare minimum (only user_id for context)

---

## Security Architecture

### Zero-Trust Principles Applied

1. **Never Trust Client Input**
   - Server-side whitelist of allowed price IDs
   - Client cannot choose arbitrary prices
   - All prices validated against Stripe API

2. **Never Trust Metadata**
   - Metadata used only for reference/logging
   - Credits always validated from Stripe line items
   - Price/currency always from Stripe objects

3. **Multiple Idempotency Layers**
   - Layer 1: Stripe event ID deduplication
   - Layer 2: Checkout session ID completion check
   - Layer 3: Database-level SELECT FOR UPDATE locks
   - Layer 4: RPC function with purchase_id uniqueness

4. **Signature Verification**
   - Webhook signature verified before processing
   - Raw request body used (not parsed JSON)
   - STRIPE_WEBHOOK_SECRET required

---

## Code Changes

### app/api/stripe/create-checkout/route.ts

**Before:**
```typescript
// Hardcoded currency
const { error: insertError } = await serviceSupabase
  .from("credit_purchases")
  .insert({
    user_id: userId,
    stripe_checkout_session_id: "",
    stripe_price_id: priceId,
    credits_amount: credits,
    status: "initiated", // ❌ Wrong initial status
    currency: "usd", // ❌ Hardcoded
    price_cents: 0, // ❌ Not set
  });

// Redundant status update
await serviceSupabase
  .from("credit_purchases")
  .update({ status: "pending" })
  .eq("id", purchase.id);
```

**After:**
```typescript
// Fetch actual price from Stripe
const stripe = getStripe();
const priceObject = await stripe.prices.retrieve(priceId);

// Single status, correct data from start
const { error: insertError } = await serviceSupabase
  .from("credit_purchases")
  .insert({
    user_id: userId,
    stripe_checkout_session_id: "",
    stripe_price_id: priceId,
    credits_amount: credits,
    status: "pending", // ✅ Correct from start
    currency: priceObject.currency, // ✅ From Stripe
    price_cents: priceObject.unit_amount || 0, // ✅ Actual price
  });

// No redundant update needed
```

### app/api/stripe/webhook/route.ts

**Before:**
```typescript
// Unnecessary metadata trust
const creditsFromMetadata = session.metadata?.credits
  ? parseInt(session.metadata.credits)
  : null;

// Unnecessary comparison
if (creditsFromMetadata && creditsFromMetadata !== creditsAmount) {
  console.warn("⚠️ Metadata mismatch", ...);
}
```

**After:**
```typescript
// SECURITY: metadata is for reference only - validate from source of truth
const userId = session.metadata?.user_id;
const paymentIntentId = session.payment_intent as string;

// Get REAL paid priceId from Stripe line items (source of truth)
// No metadata comparison - we don't trust it
```

---

## Payment Flow

### 1. User Initiates Purchase
```
Client → POST /api/stripe/create-checkout
├── Validates user authentication
├── Validates priceId against whitelist
├── Fetches price object from Stripe
│   ├── Gets unit_amount (price_cents)
│   └── Gets currency
└── Creates DB record with status "pending"
```

### 2. User Completes Checkout
```
User → Stripe Checkout Page
└── Enters payment information
```

### 3. Stripe Fires Webhook
```
Stripe → POST /api/stripe/webhook
├── Verifies webhook signature
├── Checks event type (checkout.session.completed)
├── Idempotency Layer 1: Check stripe_event_id
├── Idempotency Layer 2: Check session completion
├── Idempotency Layer 3: Verify pending purchase exists
├── Validates line items from Stripe (source of truth)
├── Calls add_purchased_credits RPC
│   ├── SELECT FOR UPDATE lock
│   ├── Updates purchase status to "completed"
│   ├── Adds credits to user_credits
│   └── Sets stripe_event_id
└── Returns success
```

---

## Idempotency Guarantees

The system provides **4 layers** of idempotency protection:

### Layer 1: Event ID Check
```sql
SELECT id FROM credit_purchases WHERE stripe_event_id = $1
```
- Prevents processing same webhook event twice
- Handles Stripe webhook retries

### Layer 2: Session Completion Check
```sql
SELECT id FROM credit_purchases 
WHERE stripe_checkout_session_id = $1 
AND status = 'completed'
```
- Prevents double-crediting same session
- Handles duplicate events for same session

### Layer 3: Pending Purchase Verification
```sql
SELECT id, status, user_id FROM credit_purchases
WHERE stripe_checkout_session_id = $1
AND user_id = $2
```
- Ensures purchase was created via our API
- Validates user consistency
- Early exit if already completed

### Layer 4: Database-Level Locks
```sql
-- Inside add_purchased_credits RPC
SELECT * FROM credit_purchases 
WHERE id = purchase_id 
FOR UPDATE;
```
- Prevents concurrent webhook processing
- Ensures atomic status transition
- Guarantees exactly-once credit addition

---

## Security Checklist

✅ **Webhook Signature Verification**
- Raw body used for signature validation
- STRIPE_WEBHOOK_SECRET required in environment
- Returns 400 for invalid signatures

✅ **Price Validation**
- Server-side whitelist of allowed price IDs
- Client cannot choose arbitrary prices
- Unknown prices rejected

✅ **Zero-Trust Metadata**
- Metadata used only for user_id context
- Credits validated from line items only
- No trust in client-provided data

✅ **Idempotency Protection**
- 4 layers of deduplication
- Database locks prevent race conditions
- Safe for webhook retries

✅ **Data Consistency**
- Currency from Stripe price object
- Price cents from Stripe price object
- Status flow simplified (no race conditions)

✅ **Error Handling**
- All errors logged with context
- Webhook returns 200 even on handled errors (prevents retries)
- Unknown events ignored gracefully

✅ **Audit Trail**
- Comprehensive logging at each step
- Session ID, user ID, price ID, amount logged
- Success and error states tracked

---

## Testing Recommendations

### 1. Stripe CLI Testing
```bash
# Forward webhooks to local endpoint
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Trigger test checkout completed event
stripe trigger checkout.session.completed
```

### 2. Idempotency Testing
```bash
# Send same webhook event multiple times
curl -X POST http://localhost:3000/api/stripe/webhook \
  -H "Content-Type: application/json" \
  -H "Stripe-Signature: $SIGNATURE" \
  -d @test-event.json

# Verify credits added only once
```

### 3. Race Condition Testing
```bash
# Send multiple webhooks concurrently
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/stripe/webhook \
    -H "Content-Type: application/json" \
    -H "Stripe-Signature: $SIGNATURE" \
    -d @test-event.json &
done

# Verify credits added exactly once
```

### 4. Price Validation Testing
```bash
# Test with valid price
curl -X POST http://localhost:3000/api/stripe/create-checkout \
  -H "Content-Type: application/json" \
  -d '{"priceId": "price_valid123"}'

# Test with invalid price (should be rejected)
curl -X POST http://localhost:3000/api/stripe/create-checkout \
  -H "Content-Type: application/json" \
  -d '{"priceId": "price_invalid999"}'
```

---

## Monitoring & Alerts

### Key Metrics to Monitor

1. **Purchase Success Rate**
   - Ratio of completed purchases to initiated
   - Alert if drops below threshold

2. **Webhook Processing Time**
   - Time from event to credit addition
   - Alert if exceeds 10 seconds

3. **Idempotency Triggers**
   - How often duplicate events are caught
   - High rate may indicate Stripe issues

4. **Failed Validations**
   - Unknown price IDs
   - Missing pending purchases
   - Line item validation failures

### Log Queries

```sql
-- Recent successful purchases
SELECT * FROM credit_purchases 
WHERE status = 'completed' 
AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- Failed/stuck purchases
SELECT * FROM credit_purchases 
WHERE status = 'pending' 
AND created_at < NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;

-- Credit addition audit
SELECT 
  cp.id,
  cp.user_id,
  cp.credits_amount,
  cp.status,
  cp.created_at,
  uc.balance
FROM credit_purchases cp
JOIN user_credits uc ON uc.user_id = cp.user_id
WHERE cp.status = 'completed'
ORDER BY cp.created_at DESC;
```

---

## Environment Variables Required

```bash
# Stripe API keys
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Application URL (for checkout success/cancel)
NEXT_PUBLIC_APP_ORIGIN=http://localhost:3000

# Supabase credentials (for service role)
NEXT_PUBLIC_SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

---

## Future Enhancements

### Recommended Additions

1. **Rate Limiting**
   - Limit checkout requests per user per hour
   - Prevent purchase spam/abuse

2. **Maximum Purchase Validation**
   - Set maximum credits per transaction
   - Alert on unusually large purchases

3. **Purchase History Check**
   - Warn if user makes multiple purchases rapidly
   - Flag suspicious patterns

4. **Email Notifications**
   - Send receipt email on successful purchase
   - Include purchase ID, credits, amount

5. **Refund Handling**
   - Implement webhook for charge.refunded
   - Deduct credits on refund
   - Update purchase status to "refunded"

6. **Failed Payment Handling**
   - Implement webhook for payment_intent.payment_failed
   - Update purchase status to "failed"
   - Send notification to user

---

## Summary

All identified security issues have been resolved:

✅ **Status Flow:** Simplified to single "pending" status from creation  
✅ **Currency Consistency:** Fetched from Stripe price object  
✅ **Price Data:** Set correctly in create-checkout (not 0)  
✅ **Zero-Trust:** All metadata trust/comparison removed  
✅ **Idempotency:** 4-layer protection against duplicates  
✅ **Audit Trail:** Comprehensive logging for monitoring  

The Stripe integration now follows industry best practices and is production-ready with multiple layers of security and consistency guarantees.
