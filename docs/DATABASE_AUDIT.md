# Company Offer Database Audit

## Executive Summary

This audit reviews the complete company_offer database schema to ensure it's coherent, complete, and ready for the publish functionality.

## Database Architecture

### Draft System
- **Table**: `company_offer_draft`
- **Purpose**: Temporary storage during offer creation/editing
- **Storage Strategy**: JSONB for flexibility, no validation until publish
- **Workflow**: company → draft → publish → normalized tables

### Published Offer System
- **Main Table**: `company_offer`
- **Child Tables**: 
  - `offer_skills` (technical requirements)
  - `offer_locations` (work locations)
  - `offer_responsibilities` (job tasks)
  - `offer_capabilities` (outcome-based requirements)
  - `offer_questions` (screening questions)
  - `offer_perks` (benefits)

## Current Schema Analysis

### company_offer Table (Main)

**Fields Currently in Use** (based on UI and migrations):
```sql
id                  uuid PRIMARY KEY
company_id          uuid REFERENCES company(id)
created_at          timestamptz
status              text ('draft', 'published', 'closed')
published_at        timestamptz

-- Basic Info
position_name       text NOT NULL
description         text

-- Compensation
salary_min          integer
salary_max          integer
salary_currency     text (3 chars, default 'EUR')
salary_period       text ('hour', 'day', 'month', 'year')
equity              boolean (default false)
equity_range        text

-- Work Configuration
remote_mode         text ('onsite', 'hybrid', 'remote')
employment_type     text ('full_time', 'part_time', 'contract', 'intern')
availability        text

-- Seniority Level
seniority           text ('junior', 'mid', 'senior', 'lead', 'executive')
```

**Fields Removed** (via cleanup migrations):
- ❌ `wage` - replaced by salary_min/salary_max
- ❌ `starting_date` - replaced by availability field
- ❌ `start_date` - duplicate removal (migration 20260108000004)
- ❌ `problem_to_solve` - not used in UI
- ❌ `product_area` - not used in UI
- ❌ `priority` - not used in UI
- ❌ `urgency` - not used in UI
- ❌ `timezone_min` - not used (migration 20260108000000)
- ❌ `timezone_max` - not used (migration 20260108000000)
- ❌ `startup_signals` - refactored to seniority column (migration 20260108000005)
- ❌ `mission` - not used in UI (migration 20260108000007)
- ❌ `stage` - not used in UI (migration 20260108000007)
- ❌ `team_size` - not used in UI (migration 20260108000007)
- ❌ `updated_at` - not needed (no trigger exists)

### Child Tables

#### offer_skills
```sql
id            uuid PRIMARY KEY
offer_id      uuid REFERENCES company_offer(id) ON DELETE CASCADE
skill_slug    text NOT NULL
skill_text    text NOT NULL
importance    text ('must', 'nice')
level         text
years         integer
created_at    timestamptz
```
✅ **Complete** - All fields mapped from UI

#### offer_locations
```sql
id            uuid PRIMARY KEY
offer_id      uuid REFERENCES company_offer(id) ON DELETE CASCADE
city          text
country       text
created_at    timestamptz
```
✅ **Complete** - Simplified schema (removed region, is_primary via migrations)

#### offer_responsibilities
```sql
id            uuid PRIMARY KEY
offer_id      uuid REFERENCES company_offer(id) ON DELETE CASCADE
text          text NOT NULL
created_at    timestamptz
```
✅ **Complete** - Removed order_index (migration 20260106000000)

#### offer_capabilities
```sql
id            uuid PRIMARY KEY
offer_id      uuid REFERENCES company_offer(id) ON DELETE CASCADE
text          text NOT NULL
importance    text ('must', 'nice')
created_at    timestamptz
```
✅ **Complete** - Removed order_index (migration 20260106000000)

#### offer_questions
```sql
id            uuid PRIMARY KEY
offer_id      uuid REFERENCES company_offer(id) ON DELETE CASCADE
question      text NOT NULL
created_at    timestamptz
```
✅ **Complete** - Simplified (removed type, is_required, order_index via migrations)

#### offer_perks
```sql
id            uuid PRIMARY KEY
offer_id      uuid REFERENCES company_offer(id) ON DELETE CASCADE
text          text NOT NULL
created_at    timestamptz
```
✅ **Complete** - Removed order_index (migration 20260106000000)

## UI to Database Field Mapping

### OfferEditor Data Structure → Database Tables

**basic_info** → `company_offer`:
- ✅ `position_name` → `position_name`
- ✅ `description` → `description`

**compensation** → `company_offer`:
- ✅ `salary_min` → `salary_min`
- ✅ `salary_max` → `salary_max`
- ✅ `salary_currency` → `salary_currency`
- ✅ `salary_period` → `salary_period`
- ✅ `equity` → `equity`
- ✅ `equity_range` → `equity_range`

**work_config** → `company_offer`:
- ✅ `remote_mode` → `remote_mode`
- ✅ `employment_type` → `employment_type`
- ✅ `availability` → `availability`

**Top-level** → `company_offer`:
- ✅ `seniority` → `seniority`

**Arrays** → Child Tables:
- ✅ `skills[]` → `offer_skills` (DELETE + INSERT pattern)
- ✅ `locations[]` → `offer_locations` (DELETE + INSERT pattern)
- ✅ `responsibilities[]` → `offer_responsibilities` (DELETE + INSERT pattern)
- ✅ `capabilities[]` → `offer_capabilities` (DELETE + INSERT pattern)
- ✅ `questions[]` → `offer_questions` (DELETE + INSERT pattern)
- ✅ `perks[]` → `offer_perks` (DELETE + INSERT pattern)

## Missing Fields Analysis

### All Unused Fields Removed ✅

**Previous Status**:
- ❌ `mission` - Company/team mission text field
- ❌ `stage` - Startup funding stage
- ❌ `team_size` - Team size integer

**Current Status**:
- ✅ All removed via migration 20260108000007
- ✅ No fields in database that aren't in UI
- ✅ Clean schema with only actively used columns

### Fields in UI but MIGHT NOT be in Database

All UI fields have been verified to exist in database schema. ✅

## RLS (Row Level Security) Status

All tables have proper RLS policies:

**company_offer**:
- ✅ Companies can manage own offers
- ✅ Students can view published offers

**All child tables** (skills, locations, responsibilities, capabilities, questions, perks):
- ✅ Companies can manage via offer_id ownership
- ✅ Students can view published via JOIN to company_offer.status

## Conclusions

### Schema Completeness: ✅ READY FOR PUBLISH

1. **Core Structure**: Complete and coherent
2. **UI Mapping**: All UI fields have corresponding DB columns
3. **Child Tables**: All properly normalized with cascading deletes
4. **RLS**: Properly secured for multi-tenancy
5. **Cleanup**: Unused fields already removed via migrations

### Recommendations

1. ✅ **Schema Clean**: All unused columns removed
2. ✅ **No Bloat**: Only fields actively used in UI remain
3. ✅ **Ready for Production**: No technical debt

## Next Steps

1. ✅ Create RPC function `publish_offer_draft(draft_id UUID)`
2. ✅ Implement API route `/api/company/offer/publish`
3. ✅ Connect publish button in OfferEditor.tsx
4. ✅ Test full publish workflow

---

**Audit Date**: 2025-01-09 (Updated)
**Auditor**: Database Schema Review
**Status**: APPROVED - CLEAN SCHEMA
**Changes**: Removed mission, stage, team_size, updated_at columns
