import { NextRequest, NextResponse } from 'next/server';
import { generateBackupDescription, generateBackupDescriptionAlternatives } from '@/lib/description-generator';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || 'primary';
    const hoursBack = parseInt(searchParams.get('hoursBack') || '1', 10);
    const count = parseInt(searchParams.get('count') || '3', 10);

    if (type === 'alternatives') {
      const alternatives = await generateBackupDescriptionAlternatives(count);
      return NextResponse.json({
        success: true,
        alternatives,
      });
    } else {
      // Primary description
      const result = await generateBackupDescription(hoursBack);
      return NextResponse.json({
        success: true,
        description: result.description,
        confidence: result.confidence,
        sources: result.sources,
      });
    }
  } catch (error) {
    console.error('Error generating description:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate description',
      },
      { status: 500 }
    );
  }
}
