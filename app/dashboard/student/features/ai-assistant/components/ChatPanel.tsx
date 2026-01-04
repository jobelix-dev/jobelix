/**
 * ChatPanel Component
 * Right panel with AI chat interface
 */

import React from 'react';
import { Send, Loader2 } from 'lucide-react';
import ChatMessage from './ChatMessage';
import { ChatMessage as ChatMessageType } from '@/lib/types';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  parts: Array<{ type: string; text?: string }>;
}

interface ChatPanelProps {
  messages: Message[];
  input: string;
  status: string;
  error: Error | undefined;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  onInputChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export default function ChatPanel({ 
  messages, 
  input, 
  status, 
  error, 
  messagesEndRef,
  onInputChange,
  onSubmit 
}: ChatPanelProps) {
  return (
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

        {messages
          .filter(msg => {
            // Filter out the "start" trigger message and system messages
            const text = msg.parts.find(p => p.type === 'text')?.text || '';
            return !(msg.role === 'user' && text === 'start') && msg.role !== 'system';
          })
          .map((message, index) => {
            const content = message.parts
              .map(part => (part.type === 'text' ? part.text || '' : ''))
              .join('')
              .replace(/PROFILE_UPDATE:.*$/gm, '')
              .trim();

            return (
              <ChatMessage
                key={`${message.id}-${index}`}
                role={message.role as 'user' | 'assistant'}
                content={content}
              />
            );
          })}

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
        <form onSubmit={onSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
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
  );
}
