/**
 * AI Assistant Component
 * 
 * Optional AI chat interface for validating and completing profile data.
 * Shows when PDF uploaded or user clicks "Get AI Help".
 * Guides students through fixing invalid/missing/uncertain fields.
 * Uses Vercel AI SDK for streaming chat with validation feedback.
 * Communicates with: app/api/student/ai-assistant/route.ts
 */

'use client';

import { useChat } from '@ai-sdk/react';
import { TextStreamChatTransport } from 'ai';
import { useState, useRef, useEffect } from 'react';
import ChatPanel from './components/ChatPanel';
import { ExtractedResumeData } from '@/lib/types';

interface AIAssistantProps {
  draftId: string;
  currentData: ExtractedResumeData;
  onUpdate: (data: ExtractedResumeData) => void;
  onFinalize: () => void;
}

export default function AIAssistant({ draftId, currentData: initialData, onUpdate, onFinalize }: AIAssistantProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasStarted = useRef(false);

  // Local state for current data - syncs with parent via onUpdate
  const [currentData, setCurrentData] = useState<ExtractedResumeData>({
    ...initialData,
    education: initialData.education || [],
    experience: initialData.experience || [],
  });

  // Chat hook - manages AI conversation
  const { messages, sendMessage, status, error } = useChat({
    // when sendMessage is called, status becomes streaming then ready
    // messages updates live as new data arrives
    transport: new TextStreamChatTransport({
      api: '/api/student/ai-assistant',
      body: { draftId },
    }),
    async onFinish() {
      // Fetch updated draft from database after AI responds
      console.log('Chat message finished, fetching updated draft...');
      try {
        const response = await fetch(`/api/student/profile/draft`);
        if (response.ok) {
          const data = await response.json();
          if (data.draft) {
            console.log('Updated draft received:', data.draft);
            
            const updatedData: ExtractedResumeData = {
              student_name: data.draft.student_name,
              phone_number: data.draft.phone_number,
              email: data.draft.email,
              address: data.draft.address,
              education: data.draft.education || [],
              experience: data.draft.experience || [],
            };
            
            // Update local state
            setCurrentData(updatedData);
            // Notify parent component
            onUpdate(updatedData);
          }
        }
      } catch (err) {
        console.error('Failed to fetch updated draft:', err);
      }
    },
  });

  // Auto-start chat conversation with AI greeting
  useEffect(() => {
    if (status === 'ready' && !hasStarted.current) { // only runs once
      hasStarted.current = true; // will not run again
      console.log('Auto-starting chat conversation');
      setTimeout(() => {
        sendMessage({ text: 'start' });
      }, 500);
    }
  }, [status, sendMessage]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle user input submission in chat
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && status === 'ready') {
      sendMessage({ text: input });
      setInput('');
    }
  };

  return (
    <div className="bg-white dark:bg-[#0b0b0b] rounded-lg border border-zinc-200 dark:border-zinc-800 max-w-md">
      <ChatPanel
        messages={messages}
        input={input}
        status={status}
        error={error}
        messagesEndRef={messagesEndRef}
        onInputChange={setInput}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
