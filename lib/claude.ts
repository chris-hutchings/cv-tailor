import Anthropic from '@anthropic-ai/sdk'

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const TOV_DESCRIPTIONS: Record<string, string> = {
  professional: 'formal and polished — precise language, no contractions, structured and authoritative tone',
  balanced: 'confident but approachable — clear and direct without being stiff; occasional contractions are fine',
  conversational: 'warm and natural — write the way a sharp person speaks; contractions throughout, personality showing',
}

export interface CVPreferences {
  includeSummary: boolean
  summaryLength: 'brief' | 'normal'
  includeSkills: boolean
  maxSkills: number
}

export async function generateApplication(
  jobDescription: string,
  cvText: string,
  tov: 'professional' | 'balanced' | 'conversational' = 'balanced',
  englishVariant: 'uk' | 'us' = 'uk',
  cvPreferences: CVPreferences = {
    includeSummary: true,
    summaryLength: 'normal',
    includeSkills: true,
    maxSkills: 10,
  }
) {
  const tovDescription = TOV_DESCRIPTIONS[tov]
  const spellingNote = englishVariant === 'uk'
    ? 'Use British English spelling throughout (e.g. optimise, organisation, colour, programme, centre).'
    : 'Use American English spelling throughout (e.g. optimize, organization, color, program, center).'

  const summaryRule = cvPreferences.includeSummary
    ? `Include a Professional Summary/Profile section near the top. Length: ${
        cvPreferences.summaryLength === 'brief'
          ? '2–3 sentences — punchy, direct, no waffle'
          : '4–6 sentences — covering background, key strengths, and what specifically you bring to this role'
      }.`
    : 'Do NOT include a Professional Summary or Profile section. Remove it if it exists in the original CV.'

  const skillsRule = cvPreferences.includeSkills
    ? `Include a Key Skills section. Cap it at ${cvPreferences.maxSkills} skills maximum — pick only the most relevant to this specific role. Do not pad it out.`
    : 'Do NOT include a Key Skills or Core Competencies section. Remove it if it exists in the original CV.'

  const prompt = `You are an expert CV writer. Tailor the candidate's CV and write a cover letter for the role below.

<job_description>
${jobDescription}
</job_description>

<cv>
${cvText}
</cv>

TONE: ${tovDescription}
SPELLING: ${spellingNote}

RULES — follow every one:

CV:
- Keep all facts accurate. Do NOT invent experience, qualifications, or achievements.
- Reorder and reframe bullet points to highlight the most relevant experience for this role.
- Weave in relevant keywords naturally — do NOT copy phrases wholesale from the job spec or stuff keywords awkwardly.
- Make every bullet punchy and achievement-focused where possible. Cut filler.
- Keep the same overall structure and timeline.
- NEVER use em dashes (—). Use commas, colons, or restructure the sentence instead.
- Do not use hollow filler phrases like "results-driven", "passionate about", "dynamic", "leverage", "synergy", "spearhead", or "proven track record".
- Output must not read like AI wrote it. Vary sentence structure. Be specific, not generic.
- ${summaryRule}
- ${skillsRule}

Cover letter (3–4 short paragraphs):
- Do NOT open with "I am writing to apply for..." or any variant of it.
- Open with a specific, confident hook that connects the candidate's background to this role.
- Refer to real details from the job description — show you've read it properly.
- Close with a clear, confident call to action.
- NEVER use em dashes (—).
- Must sound like a real human wrote it — not polished-to-death corporate filler.

Format your entire response as valid JSON with exactly these two keys:
{
  "cv": "the full tailored CV text here",
  "coverLetter": "the full cover letter text here"
}

Return only the JSON object, nothing else.`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  })

  const content = message.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response type from Claude')

  const text = content.text.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim()

  return JSON.parse(text) as { cv: string; coverLetter: string }
}
