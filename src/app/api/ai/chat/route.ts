import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// Use json_object response format — the model MUST return valid JSON.
// The entire response is a single JSON object with "message" and "cards".
const SYSTEM_PROMPT = `You are an expert educator and flashcard creator. You help students study by creating high-quality flashcards from their study materials.

The user may upload a file (PDF, text) as their source material. They will then give you instructions in natural language.

You MUST respond with a valid JSON object in exactly this shape — nothing else, no extra text:
{
  "message": "Short friendly explanation in the same language the user wrote in",
  "cards": [
    {
      "question": "Clear question that tests understanding",
      "answer": "Concise answer (1-3 sentences)",
      "options": ["Correct answer", "Plausible distractor 1", "Plausible distractor 2", "Plausible distractor 3"]
    }
  ]
}

Rules:
- Generate between 3 and 20 cards depending on the instruction
- "options" is for MCQ: always include the correct answer (same text as "answer") + 3 plausible distractors, shuffled randomly
- If the user asks for harder questions, make them more conceptual or multi-step
- If the user asks to focus on a topic, only generate cards about that topic
- Keep answers concise

MATH FORMATTING — CRITICAL RULES:
Since your output is a JSON string, ALL LaTeX backslashes MUST be doubled (\\).
A single backslash like \frac is INVALID in JSON and will break rendering.
You MUST write \\frac, \\lim, \\to, \\tan, \\sin, \\cos, \\int, \\sum, \\sqrt, \\text, \\frac, \\alpha, \\beta, \\pi etc.

Correct examples (double backslash):
- Fraction: $\\frac{dy}{dx}$
- Limit: $\\lim_{x \\to 0}$
- Integral: $\\int_a^b f(x)\\,dx$
- Square root: $\\sqrt{x}$
- Trig: $\\tan(x)$, $\\sin(x)$, $\\cos(x)$
- Greek: $\\alpha$, $\\beta$, $\\pi$, $\\theta$, $\\Delta$, $\\Sigma$
- Display math block: $$y = x^3 \\ln(x)$$

WRONG (will break): $\frac{dy}{dx}$, $\lim_{x \to 0}$, $\sqrt{x}$
CORRECT: $\\frac{dy}{dx}$, $\\lim_{x \\to 0}$, $\\sqrt{x}$

NEVER use plain text for math: write $x^2$ not x^2, $\\frac{a}{b}$ not a/b`

export type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

export type GeneratedCard = {
  question: string
  answer: string
  options?: string[]
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: 'OpenAI API key not configured. Add OPENAI_API_KEY to .env.local' },
      { status: 500 }
    )
  }

  try {
    const formData = await request.formData()
    const messagesRaw = formData.get('messages') as string
    const file = formData.get('file') as File | null

    const messages: ChatMessage[] = JSON.parse(messagesRaw || '[]')

    // Extract file content if provided
    let fileContent = ''
    if (file) {
      if (file.type === 'text/plain') {
        fileContent = await file.text()
      } else if (file.type === 'application/pdf') {
        try {
          const arrayBuffer = await file.arrayBuffer()
          const { extractText } = await import('unpdf')
          const { text } = await extractText(new Uint8Array(arrayBuffer), { mergePages: true })
          fileContent = text
        } catch (pdfErr) {
          console.error('PDF parse error:', pdfErr)
          return NextResponse.json(
            { error: 'Kunde inte läsa PDF-filen. Prova att kopiera och klistra in texten istället.' },
            { status: 400 }
          )
        }
      }
      fileContent = fileContent.slice(0, 12000)
    }

    // Build OpenAI messages — attach file content to first user message
    const openaiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = messages.map((msg, i) => {
      if (i === 0 && fileContent && msg.role === 'user') {
        return {
          role: 'user',
          content: `Here is the source material:\n\n---\n${fileContent}\n---\n\n${msg.content}`,
        }
      }
      return { role: msg.role, content: msg.content }
    })

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...openaiMessages,
      ],
      // Force valid JSON output — eliminates all parsing ambiguity
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 4000,
    })

    const rawText = completion.choices[0]?.message?.content ?? '{}'

    // Fix LaTeX backslash escaping: OpenAI sometimes outputs \frac instead of \\frac
    // in JSON strings. JSON interprets \f as form feed (U+000C), \t as tab, etc.,
    // which strips the backslash. We fix single backslashes before letters before parsing.
    // The negative lookbehind (?<!\\) ensures already-doubled \\ are left alone.
    const responseText = rawText.replace(/(?<!\\)\\([a-zA-Z])/g, '\\\\$1')

    // Parse the JSON response — should always succeed with json_object mode
    let parsed: { message?: string; cards?: unknown[] }
    try {
      parsed = JSON.parse(responseText)
    } catch {
      console.error('Failed to parse AI JSON response:', rawText.slice(0, 500))
      return NextResponse.json(
        { error: 'AI returnerade ett ogiltigt svar. Försök igen.' },
        { status: 500 }
      )
    }

    const aiMessage = typeof parsed.message === 'string' && parsed.message.trim()
      ? parsed.message.trim()
      : 'Här är dina flashcards!'

    type RawCard = { question?: unknown; answer?: unknown; options?: unknown }
    const cards: GeneratedCard[] = Array.isArray(parsed.cards)
      ? (parsed.cards as RawCard[])
          .filter((c) => c.question && c.answer)
          .map((c) => ({
            question: String(c.question).trim(),
            answer: String(c.answer).trim(),
            options: Array.isArray(c.options)
              ? (c.options as unknown[]).map(String)
              : undefined,
          }))
      : []

    return NextResponse.json({ message: aiMessage, cards })
  } catch (error) {
    console.error('AI chat error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
