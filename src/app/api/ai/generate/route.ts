import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const SYSTEM_PROMPT = `You are an expert educator who creates high-quality flashcards from study material.

Given the content provided, extract key concepts and generate flashcards in the following JSON format:
{
  "cards": [
    {
      "question": "Clear, concise question that tests understanding",
      "answer": "Accurate, concise answer (1-3 sentences)",
      "options": ["Correct answer", "Plausible distractor 1", "Plausible distractor 2", "Plausible distractor 3"]
    }
  ]
}

Rules:
- Generate between 5 and 20 cards depending on content length and density
- Questions should test key concepts, definitions, processes, or relationships
- Answers should be factual and concise
- The "options" array must always include the correct answer (matching the "answer" field exactly) plus 3 plausible distractors
- Shuffle the options array so the correct answer is not always first
- Return ONLY valid JSON, no markdown, no extra text

MATH FORMATTING — CRITICAL, NO EXCEPTIONS:
Every single mathematical expression, symbol, variable, or formula MUST be wrapped in LaTeX delimiters.
NEVER write raw math outside of $ or $$ delimiters.

JSON ESCAPING: Since the output is JSON, ALL backslashes in LaTeX MUST be doubled.
Write \\\\frac not \\frac, \\\\neq not \\neq, \\\\begin not \\begin, etc.

Delimiters:
- Inline math (variables, short expressions): $x^2$, $\\\\frac{dy}{dx}$, $\\\\sqrt{x}$, $\\\\neq$, $\\\\alpha$
- Display/block math (full equations, piecewise, alignments): $$y = x^3 \\\\ln(x)$$

Piecewise functions MUST use display math ($$...$$):
  $$f(x) = \\\\begin{cases} x^2, & x < 0 \\\\\\\\ 2x, & x \\\\geq 0 \\\\end{cases}$$

NEVER do this (raw LaTeX without delimiters):
  BAD:  f(x) \\neq 0
  BAD:  \\text{cos}(x)
  BAD:  \\begin{cases} ... \\end{cases}
  GOOD: $f(x) \\\\neq 0$
  GOOD: $\\\\cos(x)$
  GOOD: $$\\\\begin{cases} ... \\\\end{cases}$$

More examples:
- Fractions:   $\\\\frac{a}{b}$
- Integrals:   $\\\\int_a^b f(x)\\\\,dx$
- Limits:      $\\\\lim_{x \\\\to 0} \\\\frac{\\\\sin x}{x} = 1$
- Greek:       $\\\\alpha$, $\\\\beta$, $\\\\pi$, $\\\\theta$, $\\\\Delta$, $\\\\Sigma$
- Operators:   $a \\\\neq b$, $a \\\\leq b$, $a \\\\approx b$, $a \\\\in A$
- Example Q:   "Vad är derivatan av $f(x) = x^3 \\\\ln(x)$?"
- Example A:   "Med produktregeln: $$f'(x) = 3x^2 \\\\ln(x) + x^2$$"`

export async function POST(request: NextRequest) {
  // Auth check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: 'OpenAI API key not configured. Add OPENAI_API_KEY to your .env.local file.' },
      { status: 500 }
    )
  }

  let content = ''

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const text = formData.get('text') as string | null

    if (file) {
      if (file.type === 'text/plain') {
        content = await file.text()
      } else if (file.type === 'application/pdf') {
        try {
          const arrayBuffer = await file.arrayBuffer()
          const { extractText } = await import('unpdf')
          const { text } = await extractText(new Uint8Array(arrayBuffer), { mergePages: true })
          content = text
        } catch {
          return NextResponse.json(
            { error: 'Failed to parse PDF. Please paste the text content instead.' },
            { status: 400 }
          )
        }
      } else {
        return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 })
      }
    } else if (text) {
      content = text
    } else {
      return NextResponse.json({ error: 'No content provided' }, { status: 400 })
    }

    if (!content.trim()) {
      return NextResponse.json({ error: 'Content is empty' }, { status: 400 })
    }

    // Truncate to avoid token limits (~10,000 chars ≈ ~3,000 tokens)
    const truncated = content.slice(0, 10000)

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Generate flashcards from the following content:\n\n${truncated}` },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 4000,
    })

    const rawResponse = completion.choices[0]?.message?.content
    if (!rawResponse) {
      return NextResponse.json({ error: 'No response from AI' }, { status: 500 })
    }

    // Fix single backslashes before letters (e.g. \frac → \\frac) so JSON.parse
    // doesn't eat them as control characters (\f = form feed, \t = tab, etc.)
    const responseText = rawResponse.replace(/(?<!\\)\\([a-zA-Z])/g, '\\\\$1')

    const parsed = JSON.parse(responseText)
    const cards = parsed.cards ?? parsed

    if (!Array.isArray(cards) || cards.length === 0) {
      return NextResponse.json({ error: 'AI did not return valid cards' }, { status: 500 })
    }

    // Validate and sanitize
    const sanitized = cards
      .filter((c: { question?: unknown; answer?: unknown }) => c.question && c.answer)
      .map((c: { question: string; answer: string; options?: string[] }) => ({
        question: String(c.question).trim(),
        answer: String(c.answer).trim(),
        options: Array.isArray(c.options) ? c.options.map(String) : undefined,
      }))

    return NextResponse.json({ cards: sanitized })
  } catch (error) {
    console.error('AI generation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
