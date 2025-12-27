# Complete Beginner's Guide to Jobelix

Welcome! This guide assumes you have **zero experience** with TypeScript, Next.js, or modern web development. We'll explain everything step by step.

## Table of Contents
1. [What You Need to Know First](#what-you-need-to-know-first)
2. [TypeScript Basics](#typescript-basics)
3. [React Basics](#react-basics)
4. [Next.js Basics](#nextjs-basics)
5. [Understanding the Jobelix Codebase](#understanding-the-jobelix-codebase)
6. [Making Your First Change](#making-your-first-change)
7. [Common Patterns in Jobelix](#common-patterns-in-jobelix)

---

## What You Need to Know First

### What is a Web Application?

A web application has two parts:
- **Frontend (Client)**: What users see and interact with in their browser
- **Backend (Server)**: The logic that processes data, talks to databases, etc.

Jobelix uses **Next.js**, which allows us to write both frontend and backend code in the same project!

### Key Technologies

#### 1. **JavaScript/TypeScript**
- JavaScript is the programming language that runs in web browsers
- TypeScript is JavaScript + type checking (helps catch errors before running code)

#### 2. **React**
- A library for building user interfaces (the visual parts users interact with)
- Think of it as building blocks for web pages

#### 3. **Next.js**
- A framework built on top of React
- Handles routing (different pages), server-side code, and more

#### 4. **Supabase**
- Our database (stores user data, job offers, etc.)
- Also handles user authentication (login/signup)

#### 5. **OpenAI**
- AI service we use to read and extract information from PDF resumes

---

## TypeScript Basics

### What is TypeScript?

TypeScript is like JavaScript with extra safety. It helps you catch mistakes before your code runs.

**JavaScript (no safety):**
```javascript
function greet(name) {
  return "Hello, " + name.toUpperCase()
}

greet(123) // Oops! Numbers don't have .toUpperCase()
```

**TypeScript (with safety):**
```typescript
function greet(name: string) {
  return "Hello, " + name.toUpperCase()
}

greet(123) // ❌ TypeScript error: Expected string, got number!
greet("John") // ✅ Works perfectly!
```

### Common TypeScript Syntax

#### 1. **Type Annotations**
```typescript
// Variable types
let age: number = 25
let name: string = "John"
let isStudent: boolean = true

// Array types
let numbers: number[] = [1, 2, 3]
let names: Array<string> = ["Alice", "Bob"]
```

#### 2. **Interfaces (Defining Object Shapes)**
```typescript
// Define what a Student object should look like
interface Student {
  id: string
  name: string
  email: string
  age: number
  isActive: boolean
}

// Now use it
const student: Student = {
  id: "123",
  name: "Alice",
  email: "alice@example.com",
  age: 20,
  isActive: true
}
```

#### 3. **Optional Properties**
```typescript
interface User {
  name: string
  email: string
  phone?: string  // ← The ? means this is optional
}

// Both are valid
const user1: User = { name: "Bob", email: "bob@example.com" }
const user2: User = { name: "Alice", email: "alice@example.com", phone: "123-456" }
```

#### 4. **Function Types**
```typescript
// Function with typed parameters and return value
function add(a: number, b: number): number {
  return a + b
}

// Arrow function
const multiply = (a: number, b: number): number => {
  return a * b
}

// Function that returns nothing (void)
function logMessage(message: string): void {
  console.log(message)
}
```

### TypeScript in Jobelix

Example from `lib/types.ts`:
```typescript
export interface Student {
  id: string                    // UUID from database
  first_name: string | null     // Can be string OR null
  last_name: string | null
  phone_number: string | null
  mail_adress: string           // Required (no null)
  address: string | null
}
```

This tells TypeScript: "A Student object MUST have these properties with these types."

---

## React Basics

### What is React?

React lets you build user interfaces using **components** - reusable pieces of UI.

### Components

Think of components as custom HTML tags:

```tsx
// A simple component
function WelcomeMessage() {
  return <h1>Welcome to Jobelix!</h1>
}

// Use it like this:
<WelcomeMessage />
```

### JSX/TSX

JSX (or TSX for TypeScript) lets you write HTML-like code in JavaScript:

```tsx
function StudentCard() {
  const studentName = "Alice"
  
  return (
    <div className="card">
      <h2>Student Profile</h2>
      <p>Name: {studentName}</p>  {/* Use {} to insert variables */}
    </div>
  )
}
```

### Props (Passing Data to Components)

```tsx
// Component that receives data
interface ButtonProps {
  text: string
  onClick: () => void  // A function with no parameters that returns nothing
}

function Button({ text, onClick }: ButtonProps) {
  return <button onClick={onClick}>{text}</button>
}

// Use it
<Button text="Click me!" onClick={() => alert("Clicked!")} />
```

### State (Data That Changes)

```tsx
import { useState } from 'react'

function Counter() {
  // useState creates a variable that can change
  const [count, setCount] = useState(0)  // Start at 0
  
  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>
        Increment
      </button>
    </div>
  )
}
```

### Real Example from Jobelix

From `components/ResumeChat.tsx`:
```tsx
export default function ResumeChat({ draftId, extractedData, onFinalize }: ResumeChatProps) {
  // State to track the user's input
  const [input, setInput] = useState('')
  
  // State to track current data
  const [currentData, setCurrentData] = useState({
    ...extractedData,
    invalid_fields: extractedData.invalid_fields || [],
    missing_fields: extractedData.missing_fields,
    uncertain_fields: extractedData.uncertain_fields,
  })
  
  // Function to handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()  // Don't refresh the page
    if (input.trim() && status === 'ready') {
      sendMessage({ text: input })  // Send message to server
      setInput('')  // Clear the input
    }
  }
  
  return (
    <form onSubmit={handleSubmit}>
      <input 
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Type your answer..."
      />
      <button type="submit">Send</button>
    </form>
  )
}
```

---

## Next.js Basics

### File-Based Routing

In Next.js, the file structure determines your URLs:

```
app/
├── page.tsx          → localhost:3000/
├── login/
│   └── page.tsx      → localhost:3000/login
├── dashboard/
│   └── page.tsx      → localhost:3000/dashboard
└── api/
    └── resume/
        └── route.ts  → localhost:3000/api/resume
```

### Server vs Client Components

**Server Components** (default):
- Run on the server
- Can access databases directly
- Can't use browser features (like `useState`)

**Client Components** (marked with `'use client'`):
- Run in the browser
- Can use React hooks (`useState`, `useEffect`)
- Can handle user interactions

```tsx
// Client Component (has interactivity)
'use client'

import { useState } from 'react'

export default function LoginForm() {
  const [email, setEmail] = useState('')
  
  return <input value={email} onChange={(e) => setEmail(e.target.value)} />
}
```

### API Routes

API routes are your backend:

```typescript
// app/api/hello/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  return NextResponse.json({ message: "Hello!" })
}

export async function POST(request: NextRequest) {
  const data = await request.json()
  // Do something with data
  return NextResponse.json({ success: true })
}
```

Call it from the frontend:
```typescript
// Make a GET request
const response = await fetch('/api/hello')
const data = await response.json()
console.log(data.message) // "Hello!"

// Make a POST request
const response = await fetch('/api/hello', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: "Alice" })
})
```

---

## Understanding the Jobelix Codebase

### The Big Picture

```
User uploads PDF → AI extracts info → Backend validates → Chat asks questions → Save to database
```

### Key Files and What They Do

#### 1. **Frontend (User Interface)**

**`app/dashboard/StudentDashboard.tsx`**
- The main student dashboard page
- Handles file upload
- Shows the chat interface

**`components/ResumeChat.tsx`**
- The chat interface where students answer questions
- Displays validation status (invalid/missing/uncertain fields)

#### 2. **Backend (API Routes)**

**`app/api/resume/route.ts`**
- Handles resume file upload
- Saves PDF to Supabase storage

**`app/api/resume/extract-data/route.ts`**
- Downloads the PDF
- Sends it to OpenAI GPT-4o for extraction
- Validates extracted data
- Categorizes fields as invalid/missing/uncertain

**`app/api/resume/chat/route.ts`**
- Handles chat messages
- Validates user answers
- Updates the database
- Asks for next field or confirms completion

**`app/api/resume/finalize/route.ts`**
- Saves validated data to permanent tables
- Handles database transactions

#### 3. **Utilities**

**`lib/fieldValidation.ts`**
- Contains ALL validation rules
- Functions like `validatePhoneNumber()`, `validateEmail()`, etc.
- Rejects vague answers

**`lib/types.ts`**
- TypeScript type definitions
- Defines the shape of all data structures

**`lib/supabaseClient.ts`**
- Supabase client for browser code

**`lib/supabaseServer.ts`**
- Supabase client for server code (API routes)

### Data Flow Example

Let's trace what happens when a student uploads a resume:

1. **Upload** (`StudentDashboard.tsx`)
```tsx
const handleFileUpload = async (event) => {
  const file = event.target.files[0]
  
  // Upload to server
  const formData = new FormData()
  formData.append('file', file)
  
  const response = await fetch('/api/resume', {
    method: 'POST',
    body: formData
  })
}
```

2. **Save File** (`app/api/resume/route.ts`)
```typescript
export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const file = formData.get('file')
  
  // Upload to Supabase storage
  const { data, error } = await supabase.storage
    .from('resumes')
    .upload(`${user.id}/${filename}`, file)
    
  return NextResponse.json({ path: data.path })
}
```

3. **Extract Data** (`app/api/resume/extract-data/route.ts`)
```typescript
export async function POST(request: NextRequest) {
  // Download the PDF
  const pdfBuffer = await downloadPDF(filePath)
  
  // Extract text
  const pdfData = await pdf(pdfBuffer)
  const text = pdfData.text
  
  // Send to OpenAI
  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{
      role: "system",
      content: "Extract information from this resume..."
    }]
  })
  
  // Validate each field
  const invalidFields = []
  const missingFields = []
  
  for (const field of allFields) {
    const validation = validateField(field.name, value)
    if (!validation.isValid) {
      invalidFields.push(field)
    }
  }
  
  // Save to draft table
  await supabase.from('student_profile_draft').insert({
    extraction_confidence: { invalid: invalidFields, missing: missingFields }
  })
}
```

4. **Chat Validation** (`app/api/resume/chat/route.ts`)
```typescript
export async function POST(request: NextRequest) {
  // Get next field to ask about
  const nextField = getNextFieldToAsk(invalidFields, missingFields, uncertainFields)
  
  // If user provided an answer
  if (userAnswer) {
    // Validate it
    const validation = validateField(fieldName, userAnswer)
    
    if (!validation.isValid) {
      // Ask again with error message
      return new Response(validation.errorMessage)
    }
    
    // Save to database
    await updateFieldInDatabase(fieldPath, validatedValue)
  }
}
```

## Common Patterns in Jobelix

### 1. **Async/Await (Handling Asynchronous Operations)**

When you need to wait for something (database query, API call):

```typescript
// ❌ Wrong (doesn't wait)
const data = supabase.from('student').select('*')
console.log(data) // This won't have the data yet!

// ✅ Correct (waits)
const { data, error } = await supabase.from('student').select('*')
console.log(data) // Now we have the data!
```

### 2. **Error Handling**

```typescript
try {
  const result = await someRiskyOperation()
  return NextResponse.json({ success: true, result })
} catch (error: any) {
  console.error('Something went wrong:', error)
  return NextResponse.json(
    { error: error.message },
    { status: 500 }
  )
}
```

### 3. **Destructuring**

```typescript
// Instead of:
const data = response.data
const error = response.error

// We write:
const { data, error } = response

// For arrays:
const [first, second] = ['Alice', 'Bob']
// first = 'Alice', second = 'Bob'
```

### 4. **Template Literals**

```typescript
// Instead of:
const message = "Hello, " + name + "! You have " + count + " messages."

// We write:
const message = `Hello, ${name}! You have ${count} messages.`
```

### 5. **Conditional Rendering in React**

```typescript
// Show content only if condition is true
{isLoggedIn && <WelcomeDashboard />}

// Show different content based on condition
{isLoading ? <Spinner /> : <Content />}

// Show content only if data exists
{user?.name && <p>Hello, {user.name}</p>}
```

### 6. **Array Methods**

```typescript
const students = [
  { name: 'Alice', age: 20 },
  { name: 'Bob', age: 22 },
  { name: 'Charlie', age: 21 }
]

// Map: Transform each item
const names = students.map(student => student.name)
// ['Alice', 'Bob', 'Charlie']

// Filter: Keep only items that match
const adults = students.filter(student => student.age >= 21)
// [{ name: 'Bob', age: 22 }, { name: 'Charlie', age: 21 }]

// Find: Get first item that matches
const alice = students.find(student => student.name === 'Alice')
// { name: 'Alice', age: 20 }
```

---

## Debugging Tips

### 1. **Use console.log()**

```typescript
console.log('Current value:', myVariable)
console.log('Is this running?')
console.log({ data, error }) // Log multiple things as object
```

### 2. **Check the Browser Console**

- Open Developer Tools (F12 or Right-click → Inspect)
- Click "Console" tab
- Look for red error messages

### 3. **Check the Terminal**

- Server-side errors appear in the terminal where you ran `npm run dev`
- Look for red error messages

### 4. **TypeScript Errors**

- Red squiggly lines in VS Code = TypeScript error
- Hover over them to see the error message
- Fix them before running the code

### 5. **Common Errors**

**"Property 'x' does not exist"**
- You're trying to access something that doesn't exist
- Check your types!

**"Cannot read property 'x' of undefined"**
- You're accessing a property on `undefined`
- Use optional chaining: `object?.property`

**"Unexpected token"**
- Syntax error (missing bracket, comma, etc.)
- Check for typos

---

## Next Steps

1. **Read the [Architecture Guide](ARCHITECTURE.md)** to understand the big picture
2. **Try making small changes** to see how things work
3. **Read the [API Reference](API_REFERENCE.md)** to understand each endpoint
4. **Check the [Database Schema](DATABASE.md)** to see how data is stored

## Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [React Documentation](https://react.dev/learn)
- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)

---

**Questions?** Read through the code comments and other documentation files. Most functions in Jobelix have detailed comments explaining what they do!