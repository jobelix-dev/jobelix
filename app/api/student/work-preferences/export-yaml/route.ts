/**
 * Export YAML API Route
 * Saves config.yaml to a per-user temporary server path for non-Electron fallback flows.
 * 
 * SECURITY: Requires authentication - only authenticated users can export their config
 * SECURITY: Validates YAML structure and size before writing to filesystem
 * SECURITY: Production access restricted to localhost requests
 */

import "server-only";

import { NextRequest, NextResponse } from 'next/server';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { authenticateRequest } from '@/lib/server/auth';
import { parse as parseYaml } from 'yaml';
import { checkRateLimit, logApiCall, rateLimitExceededResponse } from '@/lib/server/rateLimiting';
import { enforceSameOrigin } from '@/lib/server/csrf';
import { API_RATE_LIMIT_POLICIES } from '@/lib/shared/rateLimitPolicies';

// Maximum allowed YAML content size (100KB should be more than enough for config)
const MAX_YAML_SIZE = 100 * 1024;
const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1']);

function getSafeUserDirSegment(userId: string): string {
  // Supabase user IDs are UUIDs; keep a conservative fallback for safety.
  if (/^[a-z0-9-]{8,64}$/i.test(userId)) return userId;
  return 'unknown-user';
}

export async function POST(request: NextRequest) {
  try {
    const csrfError = enforceSameOrigin(request);
    if (csrfError) return csrfError;

    // SECURITY FIX: Authenticate the request
    const auth = await authenticateRequest();
    if (auth.error) return auth.error;
    const { user } = auth;

    // Desktop/bot config export writes to server filesystem. In production,
    // only allow local-host access to avoid shared-file abuse from web clients.
    if (process.env.NODE_ENV === 'production' && !LOCAL_HOSTNAMES.has(request.nextUrl.hostname)) {
      return NextResponse.json(
        { error: 'This endpoint is only available from the desktop app.' },
        { status: 403 }
      );
    }

    const rateLimitConfig = API_RATE_LIMIT_POLICIES.workPreferencesExportYaml;
    const rateLimitResult = await checkRateLimit(user.id, rateLimitConfig);
    if (rateLimitResult.error) return rateLimitResult.error;
    if (!rateLimitResult.data.allowed) {
      return rateLimitExceededResponse(rateLimitConfig, rateLimitResult.data);
    }

    const { yamlContent } = await request.json();

    if (!yamlContent) {
      return NextResponse.json(
        { error: 'YAML content is required' },
        { status: 400 }
      );
    }

    // SECURITY: Validate content is a string
    if (typeof yamlContent !== 'string') {
      return NextResponse.json(
        { error: 'YAML content must be a string' },
        { status: 400 }
      );
    }

    // SECURITY: Validate content size to prevent DoS
    if (yamlContent.length > MAX_YAML_SIZE) {
      return NextResponse.json(
        { error: 'YAML content exceeds maximum allowed size' },
        { status: 400 }
      );
    }

    // SECURITY: Validate YAML is parseable (prevents malformed content)
    try {
      const parsed = parseYaml(yamlContent);
      
      // SECURITY: Ensure parsed content is an object (valid config structure)
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        return NextResponse.json(
          { error: 'YAML content must be a valid configuration object' },
          { status: 400 }
        );
      }
    } catch (parseError) {
      console.error('YAML parse error:', parseError);
      return NextResponse.json(
        { error: 'Invalid YAML format' },
        { status: 400 }
      );
    }

    // Save to an isolated per-user path to avoid shared-file overwrite risks.
    const repoRoot = process.cwd();
    const userSegment = getSafeUserDirSegment(user.id);
    const configDir = join(repoRoot, 'tmp', 'config_exports', userSegment);
    const configPath = join(configDir, 'config.yaml');

    await mkdir(configDir, { recursive: true });

    // Write YAML file
    await writeFile(configPath, yamlContent, 'utf-8');

    await logApiCall(user.id, rateLimitConfig.endpoint);

    return NextResponse.json({
      success: true,
      message: 'Configuration file saved successfully.',
    });
  } catch (error) {
    console.error('Error saving config.yaml:', error);
    return NextResponse.json(
      { error: 'Failed to save config.yaml' },
      { status: 500 }
    );
  }
}
