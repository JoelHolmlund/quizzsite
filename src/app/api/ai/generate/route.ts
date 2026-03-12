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
- Return ONLY valid JSON, no markdown, no extra text`

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
        // For PDFs we pass a simplified extraction note
        // In production, use pdf-parse or a dedicated PDF extraction service
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        try {
          // Dynamic import to avoid issues with pdf-parse in edge runtime
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const pdfParse = require('pdf-parse')
          const parsed = await pdfParse(buffer)
          content = parsed.text
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

    const responseText = completion.choices[0]?.message?.content
    if (!responseText) {
      return NextResponse.json({ error: 'No response from AI' }, { status: 500 })
    }

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
