/**
 * SSE endpoint for GitHub import progress.
 * Route: GET /api/student/import-github/progress
 */

import "server-only";

import { NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/server/auth';
import { getGitHubImportProgress, subscribeGitHubImportProgress } from '@/lib/server/githubImportProgress';

export const runtime = 'nodejs';

export async function GET() {
  const auth = await authenticateRequest();
  if (auth.error) return auth.error;

  const { user } = auth;
  const encoder = new TextEncoder();

  let unsubscribe: (() => void) | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      const current = getGitHubImportProgress(user.id);
      if (current) {
        send(current);
      }

      unsubscribe = subscribeGitHubImportProgress(user.id, (state) => {
        send(state);
      });

      heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(`event: ping\ndata: {}\n\n`));
      }, 15000);
    },
    cancel() {
      if (heartbeat) clearInterval(heartbeat);
      if (unsubscribe) unsubscribe();
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
