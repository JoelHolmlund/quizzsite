import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

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
- Keep answers concise

MATH FORMATTING — CRITICAL, NO EXCEPTIONS:
Every mathematical symbol, variable, expression, or formula MUST be wrapped in $ or $$.
NEVER output raw LaTeX commands outside of math delimiters.

JSON ESCAPING: Since this is JSON, you MUST double all backslashes. 
Write \\\\frac not \\frac, \\\\neq not \\neq.

CASES/PIECEWISE RULE: 
To create a newline inside a \\\\begin{cases} environment, you MUST use exactly four backslashes (\\\\\\\\).
CORRECT EXAMPLE: 
"$$f(x) = \\\\begin{cases} x^2, & x < 0 \\\\\\\\ 0, & x = 0 \\\\end{cases}$$"

NEVER do this:
- BAD: f(x) \\neq 0 (missing $)
- BAD: \\begin{cases} x \\\\ 0 \\end{cases} (missing second pair of backslashes for newline)

Delimiters:
- Inline: $x^2$, $\\\\frac{dy}{dx}$
- Display: $$y = x^3 \\\\ln(x)$$`

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
      { error: 'OpenAI API key not configured.' },
      { status: 500 }
    )
  }

  try {
    const formData = await request.formData()
    const messagesRaw = formData.get('messages') as string
    const file = formData.get('file') as File | null

    const messages: ChatMessage[] = JSON.parse(messagesRaw || '[]')

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
            { error: 'Kunde inte läsa PDF-filen.' },
            { status: 400 }
          )
        }
      }
      fileContent = fileContent.slice(0, 12000)
    }

    const openaiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = messages.map((msg, i) => {
      if (i === 0 && fileContent && msg.role === 'user') {
        return {
          role: 'user',
          content: `Source material:\n${fileContent}\n\nUser instruction: ${msg.content}`,
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
      response_format: { type: 'json_object' },
      temperature: 0.5,
    })

    const rawText = completion.choices[0]?.message?.content ?? '{}'

    /**
     * FIX: Double every single backslash that isn't already doubled.
     * This handles cases like "\\ 0" which the previous regex missed.
     */
    const responseText = rawText.replace(/(?<!\\)\\(?!\\)/g, '\\\\')

    let parsed: { message?: string; cards?: any[] }
    try {
      parsed = JSON.parse(responseText)
    } catch (e) {
      // Fallback: try parsing original if manual fix failed
      parsed = JSON.parse(rawText)
    }

    const aiMessage = parsed.message || 'Här är dina flashcards!'
    const cards: GeneratedCard[] = Array.isArray(parsed.cards)
      ? parsed.cards
          .filter((c: any) => c.question && c.answer)
          .map((c: any) => ({
            question: String(c.question).trim(),
            answer: String(c.answer).trim(),
            options: Array.isArray(c.options) ? c.options.map(String) : undefined,
          }))
      : []

    return NextResponse.json({ message: aiMessage, cards })
  } catch (error) {
    console.error('AI error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}