/**
 * Required Versions API Route
 * 
 * Returns minimum required versions for the desktop app and Python engine.
 * Used by: Electron main process to check if updates are required.
 * Route: GET /api/required-versions
 */

import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Define minimum required versions
    const requiredVersions = {
      app: {
        version: '0.1.0', // Minimum app version required
        message: 'Please update your Jobelix desktop application to the latest version.'
      },
      engine: {
        version: '0.0.1', // Minimum Python engine version required
        message: 'Please update your Jobelix application to get the latest engine.'
      },
      downloadUrl: 'https://github.com/jobelix-dev/jobelix-releases/releases/latest',
      lastUpdated: '2026-01-11T00:00:00Z'
    };

    return NextResponse.json({
      success: true,
      required: requiredVersions
    });
  } catch (error: any) {
    console.error('Error fetching required versions:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch required versions' 
      },
      { status: 500 }
    );
  }
}
