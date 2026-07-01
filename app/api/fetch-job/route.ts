import { NextRequest, NextResponse } from 'next/server'

function stripHtml(html: string): string {
  return html
    // Remove script and style blocks entirely
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    // Replace block-level tags with newlines
    .replace(/<\/(p|div|li|h[1-6]|section|article|tr)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    // Strip remaining tags
    .replace(/<[^>]+>/g, ' ')
    // Decode common HTML entities
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    // Collapse excessive whitespace
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json()

    if (!url?.trim()) {
      return NextResponse.json({ error: 'No URL provided' }, { status: 400 })
    }

    // Basic URL validation
    let parsedUrl: URL
    try {
      parsedUrl = new URL(url)
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
    }

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return NextResponse.json({ error: 'URL must start with http:// or https://' }, { status: 400 })
    }

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-GB,en;q=0.9',
      },
      signal: AbortSignal.timeout(10000),
    })

    if (!res.ok) {
      return NextResponse.json(
        { error: `Could not fetch the page (status ${res.status}). Try pasting the job description instead.` },
        { status: 400 }
      )
    }

    const html = await res.text()
    const text = stripHtml(html)

    // If we got very little content, the page is probably JavaScript-rendered
    if (text.length < 300) {
      return NextResponse.json(
        { error: 'This job site loads content with JavaScript, so we can\'t fetch it automatically. Please paste the job description instead.' },
        { status: 400 }
      )
    }

    // Try to find the job description section by looking for common markers
    // and extracting a focused window of text around it
    const JOB_MARKERS = [
      'about the job', 'about this job', 'job description', 'about the role',
      'the role', 'what you\'ll do', 'responsibilities', 'what we\'re looking for',
      'requirements', 'qualifications', 'about us', 'we are looking',
    ]

    let extracted = text
    const lowerText = text.toLowerCase()
    let earliestIdx = -1

    for (const marker of JOB_MARKERS) {
      const idx = lowerText.indexOf(marker)
      if (idx !== -1 && (earliestIdx === -1 || idx < earliestIdx)) {
        earliestIdx = idx
      }
    }

    if (earliestIdx > 200) {
      // Start from a bit before the marker to catch the job title/company name
      extracted = text.slice(Math.max(0, earliestIdx - 200))
    }

    // Cap at 8,000 chars — enough for any job description, trims leftover footer noise
    return NextResponse.json({ text: extracted.slice(0, 8000) })
  } catch (err) {
    const message = err instanceof Error ? err.message : ''
    if (message.includes('timeout') || message.includes('abort')) {
      return NextResponse.json(
        { error: 'The page took too long to load. Please paste the job description instead.' },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Could not fetch this URL. Please paste the job description instead.' },
      { status: 500 }
    )
  }
}
