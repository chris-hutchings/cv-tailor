import { NextRequest, NextResponse } from 'next/server'
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
} from 'docx'

function parseTextToDocx(text: string): Paragraph[] {
  const lines = text.split('\n')
  const paragraphs: Paragraph[] = []

  for (const line of lines) {
    const trimmed = line.trim()

    if (!trimmed) {
      // Empty line — add a small spacer
      paragraphs.push(new Paragraph({ text: '', spacing: { after: 80 } }))
      continue
    }

    // Detect headings: all-caps lines (allowing spaces, hyphens, pipes, and common punctuation)
    const isHeading = /^[A-Z][A-Z\s\-|&/,.']{2,}$/.test(trimmed)

    // Detect bullet points
    const isBullet = /^[-•*]\s+/.test(trimmed)

    if (isHeading) {
      paragraphs.push(
        new Paragraph({
          text: trimmed,
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 240, after: 80 },
        })
      )
    } else if (isBullet) {
      const bulletText = trimmed.replace(/^[-•*]\s+/, '')
      paragraphs.push(
        new Paragraph({
          bullet: { level: 0 },
          children: [new TextRun({ text: bulletText, size: 22 })],
          spacing: { after: 60 },
        })
      )
    } else {
      // Check if it looks like a name/contact line at the very top (first non-empty paragraph)
      // We detect this heuristically: short, no verb, likely top of CV
      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text: trimmed, size: 22 })],
          spacing: { after: 60 },
        })
      )
    }
  }

  return paragraphs
}

export async function POST(req: NextRequest) {
  try {
    const { text, filename } = await req.json()

    if (!text?.trim()) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 })
    }

    const paragraphs = parseTextToDocx(text)

    const doc = new Document({
      styles: {
        default: {
          document: {
            run: {
              font: 'Calibri',
              size: 22, // 11pt
            },
          },
        },
        paragraphStyles: [
          {
            id: 'Heading2',
            name: 'Heading 2',
            basedOn: 'Normal',
            run: {
              font: 'Calibri',
              size: 24, // 12pt
              bold: true,
              color: '1a1a1a',
            },
            paragraph: {
              spacing: { before: 240, after: 80 },
            },
          },
        ],
      },
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: 720,    // 0.5 inch
                bottom: 720,
                left: 1080,  // 0.75 inch
                right: 1080,
              },
            },
          },
          children: paragraphs,
        },
      ],
    })

    const buffer = await Packer.toBuffer(doc)

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename || 'document'}.docx"`,
      },
    })
  } catch (err) {
    console.error('DOCX generation error:', err)
    return NextResponse.json({ error: 'Failed to generate document' }, { status: 500 })
  }
}
