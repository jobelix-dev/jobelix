/**
 * Export YAML API Route
 * Saves config.yaml to repository root for Electron app usage
 * 
 * SECURITY: Requires authentication - only authenticated users can export their config
 * SECURITY: Validates YAML structure and size before writing to filesystem
 */

import "server-only";

import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { authenticateRequest } from '@/lib/server/auth';
import { parse as parseYaml } from 'yaml';

// Maximum allowed YAML content size (100KB should be more than enough for config)
const MAX_YAML_SIZE = 100 * 1024;

export async function POST(request: NextRequest) {
  try {
    // SECURITY FIX: Authenticate the request
    const auth = await authenticateRequest();
    if (auth.error) return auth.error;

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

    // Save to resources/linux/main/data_folder/ for the Python bot
    const repoRoot = join(process.cwd());
    const configPath = join(repoRoot, 'resources', 'linux', 'main', 'data_folder', 'config.yaml');

    console.log('Writing config.yaml to:', configPath);

    // Write YAML file to the data_folder
    await writeFile(configPath, yamlContent, 'utf-8');

    console.log('config.yaml written successfully');

    return NextResponse.json({
      success: true,
      message: 'config.yaml saved to data_folder',
      path: configPath,
    });
  } catch (error) {
    console.error('Error saving config.yaml:', error);
    return NextResponse.json(
      { error: 'Failed to save config.yaml' },
      { status: 500 }
    );
  }
}
