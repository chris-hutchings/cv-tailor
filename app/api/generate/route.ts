import { NextRequest, NextResponse } from 'next/server'
import { generateApplication } from '@/lib/claude'

export async function POST(req: NextRequest) {
  try {
    const { jobDescription, cvText, tov, englishVariant, cvPreferences } = await req.json()

    if (!jobDescription?.trim() || !cvText?.trim()) {
      return NextResponse.json(
        { error: 'Job description and CV are required' },
        { status: 400 }
      )
    }

    if (jobDescription.length > 20000 || cvText.length > 15000) {
      return NextResponse.json(
        { error: 'Input too long. Please trim the job description to under 20,000 characters and your CV to under 15,000.' },
        { status: 400 }
      )
    }

    const result = await generateApplication(
      jobDescription,
      cvText,
      tov ?? 'balanced',
      englishVariant ?? 'uk',
      cvPreferences ?? undefined
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
