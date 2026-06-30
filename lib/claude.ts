import Anthropic from '@anthropic-ai/sdk'

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function generateApplication(jobDescription: string, cvText: string) {
  const prompt = `You are an expert CV writer and career coach. Your job is to tailor a candidate's CV and write a compelling cover letter for a specific role.

Here is the job description:
<job_description>
${jobDescription}
</job_description>

Here is the candidate's existing CV:
<cv>
${cvText}
</cv>

Your task:

1. Rewrite the CV to be optimised for this specific role. Rules:
   - Keep all factual information accurate — do NOT invent experience, qualifications, or achievements
   - Reorder and reframe bullet points to emphasise the most relevant experience
   - Mirror the language and keywords from the job description naturally (for ATS optimisation)
   - Tighten wording — make every bullet punchy and achievement-focused where possible
   - Adjust the professional summary/profile to speak directly to this role
   - Keep the same overall structure and timeline

2. Write a cover letter (3–4 short paragraphs) that:
   - Opens with a strong, specific hook — not "I am writing to apply for..."
   - Connects the candidate's specific experience to the role's key requirements
   - Shows genuine enthusiasm for this company/team (based on clues in the job description)
   - Closes with a clear, confident call to action
   - Sounds human and natural — not generic AI output

Format your response as valid JSON with exactly these two keys:
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

  // Strip markdown code fences if present
  const text = content.text.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim()

  return JSON.parse(text) as { cv: string; coverLetter: string }
}
