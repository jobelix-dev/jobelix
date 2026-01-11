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
