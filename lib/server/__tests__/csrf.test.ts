import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { enforceSameOrigin } from '@/lib/server/csrf';

describe('enforceSameOrigin', () => {
  it('allows missing request (backward compatibility)', () => {
    expect(enforceSameOrigin(undefined)).toBeNull();
  });

  it('rejects explicit cross-site requests via sec-fetch-site', async () => {
    const req = new NextRequest('https://www.jobelix.fr/api/test', {
      method: 'POST',
      headers: {
        'sec-fetch-site': 'cross-site',
      },
    });

    const res = enforceSameOrigin(req);
    expect(res?.status).toBe(403);
    expect(await res?.json()).toEqual({ error: 'Invalid request origin' });
  });

  it('allows trusted same-origin requests', () => {
    const req = new NextRequest('https://www.jobelix.fr/api/test', {
      method: 'POST',
      headers: {
        origin: 'https://www.jobelix.fr',
        'sec-fetch-site': 'same-origin',
      },
    });

    expect(enforceSameOrigin(req)).toBeNull();
  });
});
