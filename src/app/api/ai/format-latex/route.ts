import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const SYSTEM_PROMPT = `You are a LaTeX formatter for educational flashcards.

Your ONLY job is to take a flashcard question and answer, identify any mathematical expressions, and rewrite them using proper LaTeX syntax so they render beautifully with KaTeX.

Rules:
- Keep all non-math text exactly as-is (same language, same wording)
- Wrap inline math in single dollar signs: $x^2$, $\\frac{a}{b}$
- Wrap display/block math (equations on their own) in double dollar signs: $$y = mx + b$$
- Environments like \\begin{cases}, \\begin{align}, \\begin{matrix} MUST be inside $$...$$
- NEVER change the meaning of the question or answer
- If the text already has correct LaTeX (with $ delimiters), keep it as-is
- If there is no math at all, return the text unchanged

CRITICAL JSON ESCAPING: Since the response is JSON, ALL LaTeX backslashes MUST be doubled (\\).
Write \\\\frac, \\\\lim, \\\\sqrt, \\\\int, \\\\sum, \\\\text, \\\\begin, \\\\end, etc.

Examples of conversion:
  "dy/dx"            → "$\\\\frac{dy}{dx}$"
  "x^2 + y^2 = r^2"  → "$x^2 + y^2 = r^2$"
  "sqrt(x)"          → "$\\\\sqrt{x}$"
  "lim x->0 sin(x)/x" → "$\\\\lim_{x \\\\to 0} \\\\frac{\\\\sin(x)}{x}$"
  "integral from 0 to 1 of x^2 dx" → "$\\\\int_0^1 x^2 \\\\, dx$"

Return a JSON object with exactly two fields:
{
  "question": "formatted question text",
  "answer": "formatted answer text"
}`

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: 'OpenAI API key not configured' },
      { status: 500 }
    )
  }

  const { question, answer } = await request.json() as { question?: string; answer?: string }
  if (!question || !answer) {
    return NextResponse.json({ error: 'question and answer are required' }, { status: 400 })
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Format the following flashcard:\n\nQuestion: ${question}\nAnswer: ${answer}`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2, // Low temp — we want precise, consistent formatting
      max_tokens: 800,
    })

    const rawText = completion.choices[0]?.message?.content ?? '{}'

    // Fix single backslashes before letters (same as the chat route)
    const fixedText = rawText.replace(/(?<!\\)\\([a-zA-Z])/g, '\\\\$1')

    const parsed = JSON.parse(fixedText) as { question?: string; answer?: string }

    return NextResponse.json({
      question: typeof parsed.question === 'string' ? parsed.question.trim() : question,
      answer: typeof parsed.answer === 'string' ? parsed.answer.trim() : answer,
    })
  } catch (error) {
    console.error('LaTeX format error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
