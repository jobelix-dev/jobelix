# Vague Answer Validation Behavior

## Question: What happens when user gives a vague answer?

### ✅ **Answer: YES, the bot will ask again until it gets valid data!**

## How It Works

### **1. GPT-4o Validates User Input**

When a user provides an answer, GPT-4o checks if it's valid according to these rules:

#### **Phone Number**
```
✅ ACCEPT: "+33612345678", "06 12 34 56 78", "(555) 123-4567"
❌ REJECT: "idk", "none", "n/a", "123", "maybe"
```

#### **Email**
```
✅ ACCEPT: "user@example.com", "john.doe@company.fr"
❌ REJECT: "idk", "none", "no email", "test" (missing @)
```

#### **Address**
```
✅ ACCEPT: "Paris, France", "123 Main St, NYC", "London"
❌ REJECT: "idk", "somewhere", "a", "none"
```

#### **Dates** (starting_date, ending_date)
```
✅ ACCEPT: "2020", "2020-05", "May 2020", "2020-05-15"
❌ REJECT: "idk", "recently", "a while ago", "dunno"
```

#### **Names/Positions/Organizations**
```
✅ ACCEPT: "Software Engineer", "Google", "John Smith"
❌ REJECT: "idk", "some company", "stuff", "a"
```

### **2. Structured Response with Validation**

GPT-4o returns a structured object:

```typescript
// Valid answer example
{
  message: "Great! What's your email address?",
  field_updates: [
    { field_name: "phone_number", field_value: "+33612345678" }
  ],  // ✅ Saved to database
  validation_failed: false,
  is_complete: false
}

// Invalid/vague answer example
{
  message: "I need a valid phone number with at least 10 digits. Could you provide your phone number in a format like +33612345678 or 06 12 34 56 78?",
  field_updates: [],  // ❌ Empty - nothing saved!
  validation_failed: true,  // 🔄 Triggers re-ask
  is_complete: false
}
```

### **3. Backend Behavior**

```typescript
if (object?.validation_failed) {
  console.log('⚠️ Validation failed - AI is asking user to clarify')
  // Only save conversation, NOT field data
  // User must answer again with valid data
  return
}

// Valid data - proceed with database update
const updates = object?.field_updates || {}
console.log('✅ Field updates:', updates)
// Save to database...
```

## User Flow Example

### **Scenario 1: User gives vague phone number**

```
🤖 Bot: "Could you provide your phone number?"
👤 User: "idk"

🤖 Bot: "I need a valid phone number with at least 10 digits. Could you provide your phone number in a format like +33612345678 or 06 12 34 56 78?"
👤 User: "maybe"

🤖 Bot: "I still need a proper phone number to complete your profile. Please provide a valid phone number with digits."
👤 User: "0612345678"

🤖 Bot: "Perfect! Now, what's your email address?"
✅ Database updated: { phone_number: "0612345678" }
```

### **Scenario 2: User gives invalid date**

```
🤖 Bot: "When did you start working at Google?"
👤 User: "recently"

🤖 Bot: "I need a specific date. Could you provide the year (like 2020) or month and year (like May 2020)?"
👤 User: "2020"

🤖 Bot: "Thanks! And when did you finish?"
✅ Database updated: { starting_date: "2020" }
```

### **Scenario 3: User tries to skip a field**

```
🤖 Bot: "What's your email address?"
👤 User: "none"

🤖 Bot: "An email address is required to complete your profile. Please provide a valid email like user@example.com"
👤 User: "n/a"

🤖 Bot: "I understand you might not want to share, but this field is required. Could you provide your actual email address?"
👤 User: "john@example.com"

🤖 Bot: "Great! Your profile is now complete."
✅ Database updated: { email: "john@example.com" }
```

## Key Features

### ✅ **Intelligent Validation**
- GPT-4o understands context and format requirements
- Rejects common vague responses: "idk", "none", "n/a", "maybe"
- Validates format (phone has digits, email has @, dates are years)

### ✅ **Polite Re-asking**
- Explains what format is needed
- Provides examples
- Maintains professional tone
- Doesn't give up until valid data received

### ✅ **Database Protection**
- Invalid data is **NEVER** saved to database
- Only updates when `validation_failed: false`
- Conversation history still saved (for context)

### ✅ **User Message Parsing**
- GPT-4o interprets user input intelligently
- Converts "May 2020" → "2020-05"
- Standardizes phone formats
- Extracts meaningful data from natural language

## Technical Implementation

### **ChatUpdateSchema**
```typescript
{
  message: string,  // Explanation to user
  field_updates: [  // Array of updates - only if valid!
    { field_name: "phone_number", field_value: "+33612345678" },
    { field_name: "email", field_value: "user@example.com" }
  ],
  resolved_uncertain_fields: string[],  // Only if clear answer
  is_complete: boolean,  // Only when ALL fields valid
  validation_failed: boolean  // True = re-ask needed
}
```

### **System Prompt Instructions**
```
VALIDATION RULES - CRITICAL:
When user provides an answer, CHECK if it's valid BEFORE accepting it:

IF USER GIVES VAGUE/INVALID ANSWER:
- Set validation_failed: true
- DO NOT add to field_updates
- In message: Politely explain what format you need and ask again
```

### **Backend Logic**
```typescript
if (validation_failed) {
  // Save conversation only, no field updates
  // User stays on same question
  return
}

// Valid data - update database with new fields
updateDatabase(field_updates)
```

## Conclusion

**YES**, the system handles vague answers gracefully:
1. ✅ GPT-4o validates each answer
2. ✅ Rejects vague/invalid responses
3. ✅ Politely asks user to clarify
4. ✅ Provides format examples
5. ✅ Re-asks until valid data received
6. ✅ Protects database from garbage data
7. ✅ Converts natural language to proper format when valid

The user **cannot skip required fields** by saying "idk" or "none" - they must provide valid data!
