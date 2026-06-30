import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const ext = file.name.split('.').pop()?.toLowerCase()
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    let text = ''

    if (ext === 'txt') {
      text = buffer.toString('utf-8')
    } else if (ext === 'pdf') {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require('pdf-parse')
      const data = await pdfParse(buffer)
      text = data.text
    } else if (ext === 'doc' || ext === 'docx') {
      const mammoth = await import('mammoth')
      const result = await mammoth.extractRawText({ buffer })
      text = result.value
    } else {
      return NextResponse.json(
        { error: 'Unsupported file type. Please upload a Word doc (.docx) or paste your CV as text.' },
        { status: 400 }
      )
    }

    if (!text.trim()) {
      return NextResponse.json(
        { error: 'Could not extract text from file. Try pasting your CV instead.' },
        { status: 400 }
      )
    }

    return NextResponse.json({ text: text.trim() })
  } catch (err) {
    console.error('Parse CV error:', err)
    return NextResponse.json(
      { error: 'Failed to parse file. Try pasting your CV as text instead.' },
      { status: 500 }
    )
  }
}
