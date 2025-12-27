/**
 * Resume Chat Component
 * 
 * Interactive chat interface for validating and completing resume data.
 * Used by: app/dashboard/StudentDashboard.tsx after PDF upload.
 * Guides students through fixing invalid/missing/uncertain fields.
 * Uses Vercel AI SDK for streaming chat with validation feedback.
 * Communicates with: app/api/resume/chat/route.ts
 */

'use client'

import { useChat } from '@ai-sdk/react'
import { TextStreamChatTransport } from 'ai'
import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

interface ResumeChatProps {
  draftId: string
  extractedData: {
    student_name: string | null
    phone_number: string | null
    email: string | null
    address: string | null
    education: Array<{
      school_name: string
      degree: string
      description: string | null
      starting_date: string | null
      ending_date: string | null
      confidence: 'high' | 'medium' | 'low'
    }>
    experience: Array<{
      organisation_name: string
      position_name: string
      description: string | null
      starting_date: string | null
      ending_date: string | null
      confidence: 'high' | 'medium' | 'low'
    }>
    invalid_fields: Array<{field_path: string, display_name: string, context?: string, error?: string}>
    missing_fields: Array<{field_path: string, display_name: string, context?: string}>
    uncertain_fields: Array<{field_path: string, display_name: string, context?: string}>
  }
  onFinalize: () => void
}

export default function ResumeChat({ draftId, extractedData, onFinalize }: ResumeChatProps) {
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const hasStarted = useRef(false)
  const processedMessageIds = useRef(new Set<string>())
  
  // Initialize contact info from extracted data
  const [contactInfo, setContactInfo] = useState<{ phone_number?: string; email?: string }>({
    phone_number: extractedData.phone_number || undefined,
    email: extractedData.email || undefined,
  })
  
  // Use missing fields directly from GPT extraction - don't add anything
  // GPT-4o is responsible for identifying ALL missing fields during extraction
  const [currentData, setCurrentData] = useState({
    ...extractedData,
    invalid_fields: extractedData.invalid_fields || [],
    missing_fields: extractedData.missing_fields,
    uncertain_fields: extractedData.uncertain_fields,
  })
  
  // Debug: Log initial extracted data
  useEffect(() => {
    console.log('ResumeChat initialized with data:', {
      phone_number: extractedData.phone_number,
      email: extractedData.email,
      missing_fields: extractedData.missing_fields,
      uncertain_fields: extractedData.uncertain_fields,
    })
  }, [extractedData])
  
  const { messages, sendMessage, status, error } = useChat({
    transport: new TextStreamChatTransport({
      api: '/api/resume/chat',
      body: { draftId },
    }),
    async onFinish() {
      // After AI responds, fetch the updated draft from database
      console.log('Chat message finished, fetching updated draft...')
      try {
        const response = await fetch(`/api/resume/get-draft/${draftId}`)
        if (response.ok) {
          const data = await response.json()
          if (data.draft) {
            console.log('Updated draft received:', data.draft)
            // Update current data with latest from database
            setCurrentData({
              student_name: data.draft.student_name,
              phone_number: data.draft.phone_number,
              email: data.draft.email,
              address: data.draft.address,
              education: data.draft.education || [],
              experience: data.draft.experience || [],
              invalid_fields: data.draft.extraction_confidence?.invalid || [],
              missing_fields: data.draft.extraction_confidence?.missing || [],
              uncertain_fields: data.draft.extraction_confidence?.uncertain || [],
            })
            
            // Update contact info
            if (data.draft.phone_number || data.draft.email) {
              setContactInfo({
                phone_number: data.draft.phone_number || undefined,
                email: data.draft.email || undefined,
              })
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch updated draft:', err)
      }
    },
  })

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Trigger AI greeting automatically when chat is ready - ONLY ONCE
  useEffect(() => {
    if (status === 'ready' && !hasStarted.current) {
      hasStarted.current = true
      console.log('Auto-starting chat conversation')
      // Send "start" to trigger AI's greeting
      setTimeout(() => {
        sendMessage({ text: 'start' })
      }, 500)
    }
  }, [status, sendMessage])

  // Optimistic updates disabled - onFinish callback fetches latest data from database
  // This is more reliable than parsing message text
  /*
  useEffect(() => {
    // ... old complex logic removed ...
  }, [messages])
  */

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim() && status === 'ready') {
      sendMessage({ text: input })
      setInput('')
    }
  }

  const needsReview = currentData.invalid_fields.length > 0 || currentData.missing_fields.length > 0 || currentData.uncertain_fields.length > 0

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
      {/* Left Column: Extracted Data */}
      <div className="bg-white dark:bg-[#0b0b0b] rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Extracted Profile Data</h3>
          {needsReview ? (
            <span className="flex items-center gap-1 text-sm text-amber-600 dark:text-amber-400">
              <AlertCircle className="w-4 h-4" />
              Needs Review
            </span>
          ) : (
            <span className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
              <CheckCircle2 className="w-4 h-4" />
              Complete
            </span>
          )}
        </div>

        <div className="space-y-6">
          {/* Student Name */}
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <p className="text-sm text-zinc-700 dark:text-zinc-300">
              {currentData.student_name || 'Not extracted'}
            </p>
          </div>

          {/* Contact Information */}
          {(contactInfo.phone_number || contactInfo.email || currentData.address) && (
            <div>
              <label className="block text-sm font-medium mb-2">Contact</label>
              <div className="space-y-1">
                {contactInfo.phone_number && (
                  <p className="text-sm text-zinc-700 dark:text-zinc-300">
                    📞 {contactInfo.phone_number}
                  </p>
                )}
                {contactInfo.email && (
                  <p className="text-sm text-zinc-700 dark:text-zinc-300">
                    ✉️ {contactInfo.email}
                  </p>
                )}
                {currentData.address && (
                  <p className="text-sm text-zinc-700 dark:text-zinc-300">
                    📍 {currentData.address}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Education */}
          <div>
            <label className="block text-sm font-medium mb-2">Education</label>
            <div className="space-y-3">
              {currentData.education.length > 0 ? (
                currentData.education.map((edu, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/50"
                  >
                    <p className="font-medium text-sm">{edu.school_name}</p>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">{edu.degree}</p>
                    {edu.description && (
                      <p className="text-xs text-zinc-500 mt-1">{edu.description}</p>
                    )}
                    <div className="flex gap-2 mt-2 text-xs text-zinc-500">
                      <span>{edu.starting_date || 'Date N/A'}</span>
                      <span>→</span>
                      <span>{edu.ending_date || 'Present'}</span>
                    </div>
                    {edu.confidence !== 'high' && (
                      <span className="inline-block mt-2 px-2 py-0.5 text-xs rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                        Confidence: {edu.confidence}
                      </span>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-sm text-zinc-500">No education data extracted</p>
              )}
            </div>
          </div>

          {/* Experience */}
          <div>
            <label className="block text-sm font-medium mb-2">Experience</label>
            <div className="space-y-3">
              {currentData.experience.length > 0 ? (
                currentData.experience.map((exp, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/50"
                  >
                    <p className="font-medium text-sm">{exp.organisation_name}</p>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">{exp.position_name}</p>
                    {exp.description && (
                      <p className="text-xs text-zinc-500 mt-1">{exp.description}</p>
                    )}
                    <div className="flex gap-2 mt-2 text-xs text-zinc-500">
                      <span>{exp.starting_date || 'Date N/A'}</span>
                      <span>→</span>
                      <span>{exp.ending_date || 'Present'}</span>
                    </div>
                    {exp.confidence !== 'high' && (
                      <span className="inline-block mt-2 px-2 py-0.5 text-xs rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                        Confidence: {exp.confidence}
                      </span>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-sm text-zinc-500">No experience data extracted</p>
              )}
            </div>
          </div>

          {/* Missing/Uncertain/Invalid Fields */}
          {(currentData.invalid_fields.length > 0 || currentData.missing_fields.length > 0 || currentData.uncertain_fields.length > 0) && (
            <div className="p-3 rounded bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/50">
              {currentData.invalid_fields.length > 0 && (
                <div className="mb-2">
                  <p className="text-xs font-medium text-red-900 dark:text-red-200 mb-1">
                    Invalid fields:
                  </p>
                  <p className="text-xs text-red-700 dark:text-red-300">
                    {currentData.invalid_fields.map(f => f.display_name).join(', ')}
                  </p>
                </div>
              )}
              {currentData.missing_fields.length > 0 && (
                <div className="mb-2">
                  <p className="text-xs font-medium text-amber-900 dark:text-amber-200 mb-1">
                    Missing fields:
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    {currentData.missing_fields.map(f => f.display_name).join(', ')}
                  </p>
                </div>
              )}
              {currentData.uncertain_fields.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-amber-900 dark:text-amber-200 mb-1">
                    Uncertain fields:
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    {currentData.uncertain_fields.map(uf => uf.display_name).join(', ')}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Finalize Button */}
          <button
            onClick={onFinalize}
            disabled={needsReview}
            className="w-full mt-4 px-4 py-2 text-sm font-medium rounded bg-foreground text-background hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
          >
            {needsReview ? 'Complete chat to finalize' : 'Save to Profile'}
          </button>
        </div>
      </div>

      {/* Right Column: Chat Interface */}
      <div className="bg-white dark:bg-[#0b0b0b] rounded-lg border border-zinc-200 dark:border-zinc-800 flex flex-col h-[600px]">
        {/* Chat Header */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
          <h3 className="text-lg font-semibold">AI Assistant</h3>
          <p className="text-sm text-zinc-500">
            Review and complete your profile information
          </p>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 mb-3">
                <Send className="w-6 h-6 text-zinc-400" />
              </div>
              <p className="text-sm text-zinc-500">
                Start chatting to review your profile data
              </p>
              <p className="text-xs text-zinc-400 mt-1">
                The AI will help you fill in missing information
              </p>
            </div>
          )}

          {messages.filter(msg => {
            // Filter out the "start" trigger message
            const text = msg.parts.find(p => p.type === 'text')?.text || ''
            return !(msg.role === 'user' && text === 'start')
          }).map((message, index) => (
            <div
              key={`${message.id}-${index}`}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  message.role === 'user'
                    ? 'bg-foreground text-background'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">
                  {message.parts.map((part, index) =>
                    part.type === 'text' ? (
                      <span key={index}>{part.text.replace(/PROFILE_UPDATE:.*$/gm, '').trim()}</span>
                    ) : null
                  )}
                </p>
              </div>
            </div>
          ))}

          {status === 'streaming' && (
            <div className="flex justify-start">
              <div className="bg-zinc-100 dark:bg-zinc-800 rounded-lg px-4 py-2">
                <Loader2 className="w-4 h-4 animate-spin text-zinc-500" />
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 rounded bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50">
              <p className="text-sm text-red-600 dark:text-red-400">
                An error occurred. Please try again.
              </p>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              disabled={status !== 'ready'}
              className="flex-1 px-3 py-2 text-sm rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-foreground/20 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={status !== 'ready' || !input.trim()}
              className="px-4 py-2 text-sm font-medium rounded bg-foreground text-background hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
