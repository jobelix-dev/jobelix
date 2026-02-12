-- ============================================================================
-- Migration: 05 - Credits, Payments, and Feedback System
-- Description: User credits system, daily grants, Stripe payment tracking,
--              and user feedback collection
-- ============================================================================

-- =============================================================================
-- TABLES
-- =============================================================================

-- User credits: Track credit balance and usage for each user
create table "public"."user_credits" (
  "user_id" uuid not null,
  "balance" integer not null default 0,
  "total_earned" integer not null default 0,
  "total_purchased" integer not null default 0,
  "total_used" integer not null default 0,
  "last_updated" timestamp with time zone not null default now()
);

alter table "public"."user_credits" enable row level security;

-- Daily credit grants: Track daily free credit allocations
create table "public"."daily_credit_grants" (
  "user_id" uuid not null,
  "granted_date" date not null,
  "credits_amount" integer not null default 100,
  "granted_at" timestamp with time zone not null default now()
);

alter table "public"."daily_credit_grants" enable row level security;

-- Credit purchases: Stripe payment tracking for credit purchases
create table "public"."credit_purchases" (
  "id" uuid not null default gen_random_uuid(),
  "user_id" uuid not null,
  "stripe_payment_intent_id" text,
  "stripe_checkout_session_id" text,
  "credits_amount" integer not null,
  "price_cents" integer not null,
  "currency" text not null default 'eur'::text,
  "status" text not null default 'pending'::text,
  "purchased_at" timestamp with time zone not null default now(),
  "completed_at" timestamp with time zone,
  "stripe_event_id" text
);

alter table "public"."credit_purchases" enable row level security;

-- User feedback: Bug reports and feature requests
create table "public"."user_feedback" (
  "id" uuid not null default gen_random_uuid(),
  "user_id" uuid,
  "feedback_type" text not null,
  "subject" text not null,
  "description" text not null,
  "user_email" text,
  "user_agent" text,
  "page_url" text,
  "status" text default 'new'::text,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now()
);

alter table "public"."user_feedback" enable row level security;

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX idx_user_credits_balance ON public.user_credits USING btree (user_id, balance);
CREATE INDEX idx_daily_grants_user_date ON public.daily_credit_grants USING btree (user_id, granted_date DESC);
CREATE INDEX idx_purchases_user ON public.credit_purchases USING btree (user_id, purchased_at DESC);
CREATE INDEX idx_purchases_stripe ON public.credit_purchases USING btree (stripe_payment_intent_id);
CREATE INDEX idx_purchases_event_id ON public.credit_purchases USING btree (stripe_event_id);
CREATE INDEX idx_credit_purchases_session_status ON public.credit_purchases USING btree (stripe_checkout_session_id, status);
CREATE INDEX idx_feedback_user ON public.user_feedback USING btree (user_id, created_at DESC);
CREATE INDEX idx_feedback_type ON public.user_feedback USING btree (feedback_type, created_at DESC);
CREATE INDEX idx_feedback_status ON public.user_feedback USING btree (status, created_at DESC);

CREATE UNIQUE INDEX user_credits_pkey ON public.user_credits USING btree (user_id);
CREATE UNIQUE INDEX daily_credit_grants_pkey ON public.daily_credit_grants USING btree (user_id, granted_date);
CREATE UNIQUE INDEX credit_purchases_pkey ON public.credit_purchases USING btree (id);
CREATE UNIQUE INDEX credit_purchases_stripe_payment_intent_id_key ON public.credit_purchases USING btree (stripe_payment_intent_id);
CREATE UNIQUE INDEX credit_purchases_stripe_event_id_key ON public.credit_purchases USING btree (stripe_event_id);
CREATE UNIQUE INDEX credit_purchases_session_uniq ON public.credit_purchases USING btree (stripe_checkout_session_id) WHERE (stripe_checkout_session_id IS NOT NULL);
CREATE UNIQUE INDEX credit_purchases_event_uniq ON public.credit_purchases USING btree (stripe_event_id) WHERE (stripe_event_id IS NOT NULL);
CREATE UNIQUE INDEX user_feedback_pkey ON public.user_feedback USING btree (id);

-- =============================================================================
-- PRIMARY KEYS
-- =============================================================================

alter table "public"."user_credits" add constraint "user_credits_pkey" PRIMARY KEY using index "user_credits_pkey";
alter table "public"."daily_credit_grants" add constraint "daily_credit_grants_pkey" PRIMARY KEY using index "daily_credit_grants_pkey";
alter table "public"."credit_purchases" add constraint "credit_purchases_pkey" PRIMARY KEY using index "credit_purchases_pkey";
alter table "public"."user_feedback" add constraint "user_feedback_pkey" PRIMARY KEY using index "user_feedback_pkey";

-- =============================================================================
-- CONSTRAINTS
-- =============================================================================

alter table "public"."credit_purchases" add constraint "credit_purchases_stripe_payment_intent_id_key" UNIQUE using index "credit_purchases_stripe_payment_intent_id_key";
alter table "public"."credit_purchases" add constraint "credit_purchases_stripe_event_id_key" UNIQUE using index "credit_purchases_stripe_event_id_key";

alter table "public"."user_feedback" add constraint "user_feedback_feedback_type_check" CHECK ((feedback_type = ANY (ARRAY['bug'::text, 'feature'::text]))) not valid;
alter table "public"."user_feedback" validate constraint "user_feedback_feedback_type_check";

alter table "public"."user_feedback" add constraint "user_feedback_status_check" CHECK ((status = ANY (ARRAY['new'::text, 'reviewing'::text, 'resolved'::text, 'wont_fix'::text]))) not valid;
alter table "public"."user_feedback" validate constraint "user_feedback_status_check";

-- =============================================================================
-- FOREIGN KEYS
-- =============================================================================

alter table "public"."user_credits" add constraint "user_credits_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;
alter table "public"."user_credits" validate constraint "user_credits_user_id_fkey";

alter table "public"."daily_credit_grants" add constraint "daily_credit_grants_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;
alter table "public"."daily_credit_grants" validate constraint "daily_credit_grants_user_id_fkey";

alter table "public"."credit_purchases" add constraint "credit_purchases_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;
alter table "public"."credit_purchases" validate constraint "credit_purchases_user_id_fkey";

alter table "public"."user_feedback" add constraint "user_feedback_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL not valid;
alter table "public"."user_feedback" validate constraint "user_feedback_user_id_fkey";

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

set check_function_bodies = off;

-- Grant daily credits (50 credits per day, once per day per user)
-- SECURITY: User can only grant credits to themselves
CREATE OR REPLACE FUNCTION public.grant_daily_credits(p_user_id uuid)
 RETURNS TABLE(success boolean, credits_granted integer, new_balance integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_credits_amount INTEGER := 50;
  v_new_balance INTEGER;
BEGIN
  -- SECURITY: Verify user can only grant credits to themselves
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: can only grant daily credits to yourself';
  END IF;

  -- Try to insert daily grant (will fail if already claimed today)
  INSERT INTO public.daily_credit_grants (user_id, granted_date, credits_amount)
  VALUES (p_user_id, CURRENT_DATE, v_credits_amount)
  ON CONFLICT (user_id, granted_date) DO NOTHING;
  
  -- Check if we actually inserted (granted credits today)
  IF NOT FOUND THEN
    -- Already claimed today
    SELECT balance INTO v_new_balance
    FROM public.user_credits
    WHERE user_id = p_user_id;
    
    RETURN QUERY SELECT FALSE, 0, COALESCE(v_new_balance, 0);
    RETURN;
  END IF;
  
  -- Add credits to balance
  INSERT INTO public.user_credits (user_id, balance, total_earned, last_updated)
  VALUES (p_user_id, v_credits_amount, v_credits_amount, now())
  ON CONFLICT (user_id) DO UPDATE SET
    balance = user_credits.balance + v_credits_amount,
    total_earned = user_credits.total_earned + v_credits_amount,
    last_updated = now()
  RETURNING user_credits.balance INTO v_new_balance;
  
  RETURN QUERY SELECT TRUE, v_credits_amount, v_new_balance;
END;
$function$
;

-- Use credits (deduct from balance)
-- SECURITY: User can only use their own credits
-- NOTE: This function is overwritten by referral_system migration to add referral completion
CREATE OR REPLACE FUNCTION public.use_credits(p_user_id uuid, p_amount integer DEFAULT 1)
 RETURNS TABLE(success boolean, new_balance integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_current_balance INTEGER;
  v_new_balance INTEGER;
BEGIN
  -- SECURITY: Verify user can only use their own credits
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: can only use your own credits';
  END IF;

  -- Get current balance
  SELECT balance INTO v_current_balance
  FROM public.user_credits
  WHERE user_id = p_user_id
  FOR UPDATE; -- Lock row
  
  -- Check if user has enough credits
  IF v_current_balance IS NULL OR v_current_balance < p_amount THEN
    RETURN QUERY SELECT FALSE, COALESCE(v_current_balance, 0);
    RETURN;
  END IF;
  
  -- Deduct credits
  UPDATE public.user_credits
  SET 
    balance = balance - p_amount,
    total_used = total_used + p_amount,
    last_updated = now()
  WHERE user_id = p_user_id
  RETURNING balance INTO v_new_balance;
  
  RETURN QUERY SELECT TRUE, v_new_balance;
END;
$function$
;

-- Add purchased credits (legacy version with fewer parameters)
-- SECURITY: Requires service_role (webhook/server-side only)
CREATE OR REPLACE FUNCTION public.add_purchased_credits(p_user_id uuid, p_credits integer, p_amount_cents integer, p_stripe_event_id text DEFAULT NULL::text, p_stripe_session_id text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- SECURITY: This function should only be called from server-side (webhooks)
  IF NOT public.is_service_role() THEN
    RAISE EXCEPTION 'Unauthorized: service role required for credit purchases';
  END IF;

  -- Insert purchase record (will fail if event_id or session_id already exists)
  INSERT INTO public.credit_purchases (
    user_id, 
    credits_amount, 
    price_cents, 
    stripe_event_id, 
    stripe_checkout_session_id
  )
  VALUES (
    p_user_id, 
    p_credits, 
    p_amount_cents, 
    p_stripe_event_id, 
    p_stripe_session_id
  );

  -- Add credits to user balance
  UPDATE public.user_credits
  SET 
    balance = balance + p_credits,
    total_purchased = total_purchased + p_credits
  WHERE user_id = p_user_id;

  -- Create user_credits row if it doesn't exist
  IF NOT FOUND THEN
    INSERT INTO public.user_credits (user_id, balance, total_purchased)
    VALUES (p_user_id, p_credits, p_credits);
  END IF;
END;
$function$
;

-- Add purchased credits (full version with idempotency and proper error handling)
-- SECURITY: Requires service_role (webhook/server-side only)
CREATE OR REPLACE FUNCTION public.add_purchased_credits(p_user_id uuid, p_credits_amount integer, p_payment_intent_id text, p_stripe_event_id text, p_session_id text, p_amount_cents integer, p_currency text)
 RETURNS TABLE(success boolean, new_balance integer, error_message text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_new_balance INTEGER;
  v_purchase_id UUID;
BEGIN
  -- SECURITY: This function should only be called from server-side (webhooks)
  IF NOT public.is_service_role() THEN
    RAISE EXCEPTION 'Unauthorized: service role required for credit purchases';
  END IF;

  -- SECURITY: Check if this event was already processed (idempotency)
  -- This check happens INSIDE the transaction with row lock
  SELECT id INTO v_purchase_id
  FROM public.credit_purchases
  WHERE stripe_event_id = p_stripe_event_id
  FOR UPDATE NOWAIT; -- Lock immediately or fail
  
  IF v_purchase_id IS NOT NULL THEN
    -- Event already processed
    SELECT balance INTO v_new_balance
    FROM public.user_credits
    WHERE user_id = p_user_id;
    
    RETURN QUERY SELECT TRUE, COALESCE(v_new_balance, 0), 'Already processed'::TEXT;
    RETURN;
  END IF;

  -- Check by session ID as backup
  SELECT id INTO v_purchase_id
  FROM public.credit_purchases
  WHERE stripe_checkout_session_id = p_session_id
    AND status = 'completed'
  FOR UPDATE NOWAIT;
  
  IF v_purchase_id IS NOT NULL THEN
    -- Session already completed
    SELECT balance INTO v_new_balance
    FROM public.user_credits
    WHERE user_id = p_user_id;
    
    RETURN QUERY SELECT TRUE, COALESCE(v_new_balance, 0), 'Session already completed'::TEXT;
    RETURN;
  END IF;

  -- ATOMIC OPERATION: Update purchase record AND add credits in same transaction
  
  -- Step 1: Update purchase record to completed
  UPDATE public.credit_purchases
  SET 
    stripe_payment_intent_id = p_payment_intent_id,
    stripe_event_id = p_stripe_event_id,
    price_cents = p_amount_cents,
    currency = p_currency,
    status = 'completed',
    completed_at = now()
  WHERE stripe_checkout_session_id = p_session_id
    AND status = 'pending'
  RETURNING id INTO v_purchase_id;
  
  IF v_purchase_id IS NULL THEN
    -- Purchase not found or already processed
    RETURN QUERY SELECT FALSE, 0, 'Purchase not found or already completed'::TEXT;
    RETURN;
  END IF;

  -- Step 2: Add credits to user balance
  INSERT INTO public.user_credits (user_id, balance, total_purchased, last_updated)
  VALUES (p_user_id, p_credits_amount, p_credits_amount, now())
  ON CONFLICT (user_id) DO UPDATE SET
    balance = user_credits.balance + p_credits_amount,
    total_purchased = user_credits.total_purchased + p_credits_amount,
    last_updated = now()
  RETURNING user_credits.balance INTO v_new_balance;
  
  -- Success
  RETURN QUERY SELECT TRUE, v_new_balance, 'Credits added successfully'::TEXT;
  
EXCEPTION
  WHEN lock_not_available THEN
    -- Another process is currently processing this event
    RETURN QUERY SELECT FALSE, 0, 'Event is being processed by another request'::TEXT;
  WHEN unique_violation THEN
    -- Event ID already exists (race condition caught)
    SELECT balance INTO v_new_balance
    FROM public.user_credits
    WHERE user_id = p_user_id;
    RETURN QUERY SELECT TRUE, COALESCE(v_new_balance, 0), 'Event already processed (caught by constraint)'::TEXT;
END;
$function$
;

-- Trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_feedback_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

-- =============================================================================
-- GRANTS
-- =============================================================================

grant delete on table "public"."user_credits" to "anon";
grant insert on table "public"."user_credits" to "anon";
grant references on table "public"."user_credits" to "anon";
grant select on table "public"."user_credits" to "anon";
grant trigger on table "public"."user_credits" to "anon";
grant truncate on table "public"."user_credits" to "anon";
grant update on table "public"."user_credits" to "anon";

grant delete on table "public"."user_credits" to "authenticated";
grant insert on table "public"."user_credits" to "authenticated";
grant references on table "public"."user_credits" to "authenticated";
grant select on table "public"."user_credits" to "authenticated";
grant trigger on table "public"."user_credits" to "authenticated";
grant truncate on table "public"."user_credits" to "authenticated";
grant update on table "public"."user_credits" to "authenticated";

grant delete on table "public"."user_credits" to "service_role";
grant insert on table "public"."user_credits" to "service_role";
grant references on table "public"."user_credits" to "service_role";
grant select on table "public"."user_credits" to "service_role";
grant trigger on table "public"."user_credits" to "service_role";
grant truncate on table "public"."user_credits" to "service_role";
grant update on table "public"."user_credits" to "service_role";

grant delete on table "public"."daily_credit_grants" to "anon";
grant insert on table "public"."daily_credit_grants" to "anon";
grant references on table "public"."daily_credit_grants" to "anon";
grant select on table "public"."daily_credit_grants" to "anon";
grant trigger on table "public"."daily_credit_grants" to "anon";
grant truncate on table "public"."daily_credit_grants" to "anon";
grant update on table "public"."daily_credit_grants" to "anon";

grant delete on table "public"."daily_credit_grants" to "authenticated";
grant insert on table "public"."daily_credit_grants" to "authenticated";
grant references on table "public"."daily_credit_grants" to "authenticated";
grant select on table "public"."daily_credit_grants" to "authenticated";
grant trigger on table "public"."daily_credit_grants" to "authenticated";
grant truncate on table "public"."daily_credit_grants" to "authenticated";
grant update on table "public"."daily_credit_grants" to "authenticated";

grant delete on table "public"."daily_credit_grants" to "service_role";
grant insert on table "public"."daily_credit_grants" to "service_role";
grant references on table "public"."daily_credit_grants" to "service_role";
grant select on table "public"."daily_credit_grants" to "service_role";
grant trigger on table "public"."daily_credit_grants" to "service_role";
grant truncate on table "public"."daily_credit_grants" to "service_role";
grant update on table "public"."daily_credit_grants" to "service_role";

grant delete on table "public"."credit_purchases" to "anon";
grant insert on table "public"."credit_purchases" to "anon";
grant references on table "public"."credit_purchases" to "anon";
grant select on table "public"."credit_purchases" to "anon";
grant trigger on table "public"."credit_purchases" to "anon";
grant truncate on table "public"."credit_purchases" to "anon";
grant update on table "public"."credit_purchases" to "anon";

grant delete on table "public"."credit_purchases" to "authenticated";
grant insert on table "public"."credit_purchases" to "authenticated";
grant references on table "public"."credit_purchases" to "authenticated";
grant select on table "public"."credit_purchases" to "authenticated";
grant trigger on table "public"."credit_purchases" to "authenticated";
grant truncate on table "public"."credit_purchases" to "authenticated";
grant update on table "public"."credit_purchases" to "authenticated";

grant delete on table "public"."credit_purchases" to "service_role";
grant insert on table "public"."credit_purchases" to "service_role";
grant references on table "public"."credit_purchases" to "service_role";
grant select on table "public"."credit_purchases" to "service_role";
grant trigger on table "public"."credit_purchases" to "service_role";
grant truncate on table "public"."credit_purchases" to "service_role";
grant update on table "public"."credit_purchases" to "service_role";

grant delete on table "public"."user_feedback" to "anon";
grant insert on table "public"."user_feedback" to "anon";
grant references on table "public"."user_feedback" to "anon";
grant select on table "public"."user_feedback" to "anon";
grant trigger on table "public"."user_feedback" to "anon";
grant truncate on table "public"."user_feedback" to "anon";
grant update on table "public"."user_feedback" to "anon";

grant delete on table "public"."user_feedback" to "authenticated";
grant insert on table "public"."user_feedback" to "authenticated";
grant references on table "public"."user_feedback" to "authenticated";
grant select on table "public"."user_feedback" to "authenticated";
grant trigger on table "public"."user_feedback" to "authenticated";
grant truncate on table "public"."user_feedback" to "authenticated";
grant update on table "public"."user_feedback" to "authenticated";

grant delete on table "public"."user_feedback" to "service_role";
grant insert on table "public"."user_feedback" to "service_role";
grant references on table "public"."user_feedback" to "service_role";
grant select on table "public"."user_feedback" to "service_role";
grant trigger on table "public"."user_feedback" to "service_role";
grant truncate on table "public"."user_feedback" to "service_role";
grant update on table "public"."user_feedback" to "service_role";

-- =============================================================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================================================

-- User credits policies
create policy "user_credits_select_own"
on "public"."user_credits"
as permissive
for select
to authenticated
using ((user_id = (SELECT auth.uid())));

-- Daily credit grants policies
create policy "daily_grants_select_own"
on "public"."daily_credit_grants"
as permissive
for select
to authenticated
using ((user_id = (SELECT auth.uid())));

-- Credit purchases policies
create policy "credit_purchases_select_own"
on "public"."credit_purchases"
as permissive
for select
to authenticated
using ((user_id = (SELECT auth.uid())));

-- User feedback policies
create policy "feedback_insert_authenticated"
on "public"."user_feedback"
as permissive
for insert
to authenticated
with check ((user_id = (SELECT auth.uid())));

create policy "feedback_select_own"
on "public"."user_feedback"
as permissive
for select
to authenticated
using ((user_id = (SELECT auth.uid())));

-- =============================================================================
-- TRIGGERS
-- =============================================================================

CREATE TRIGGER set_feedback_updated_at 
  BEFORE UPDATE ON public.user_feedback 
  FOR EACH ROW EXECUTE FUNCTION public.update_feedback_updated_at();
