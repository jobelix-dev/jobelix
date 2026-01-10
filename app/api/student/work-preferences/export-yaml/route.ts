/**
 * Export YAML API Route
 * Saves config.yaml to repository root for Electron app usage
 */

import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';

export async function POST(request: NextRequest) {
  try {
    const { yamlContent } = await request.json();

    if (!yamlContent) {
      return NextResponse.json(
        { error: 'YAML content is required' },
        { status: 400 }
      );
    }

    // Get repository root (parent of app directory)
    const repoRoot = join(process.cwd());
    const configPath = join(repoRoot, 'config.yaml');

    console.log('Writing config.yaml to:', configPath);

    // Write YAML file to repository root
    await writeFile(configPath, yamlContent, 'utf-8');

    console.log('config.yaml written successfully');

    return NextResponse.json({
      success: true,
      message: 'config.yaml saved to repository root',
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
