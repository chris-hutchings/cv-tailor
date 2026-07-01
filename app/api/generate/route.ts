import { NextRequest, NextResponse } from 'next/server'
import { generateApplication } from '@/lib/claude'

export async function POST(req: NextRequest) {
  try {
    const { jobDescription, cvText, tov, englishVariant } = await req.json()

    if (!jobDescription?.trim() || !cvText?.trim()) {
      return NextResponse.json(
        { error: 'Job description and CV are required' },
        { status: 400 }
      )
    }

    if (jobDescription.length > 10000 || cvText.length > 10000) {
      return NextResponse.json(
        { error: 'Input too long. Please trim to under 10,000 characters each.' },
        { status: 400 }
      )
    }

    const result = await generateApplication(
      jobDescription,
      cvText,
      tov ?? 'balanced',
      englishVariant ?? 'uk'
    )
    return NextResponse.json(result)
  } catch (err) {
    console.error('Generate error:', err)
    return NextResponse.json(
      { error: 'Failed to generate application. Please try again.' },
      { status: 500 }
    )
  }
}
