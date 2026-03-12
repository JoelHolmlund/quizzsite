import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const SYSTEM_PROMPT = `You are an adaptive expert educator.

Your goal is to follow the user's instructions regarding the source material:
1. If the user wants to study the material as-is, create accurate flashcards from it.
2. If the user asks for HARDER or SIMILAR questions, use the source material as a foundation to create NEW, more challenging problems that test deeper conceptual understanding (e.g., multi-step problems or advanced applications of the same topics).

The user may upload a file (PDF, text) as their source material. They will then give you instructions in natural language.

You MUST respond with a valid JSON object in exactly this shape — nothing else, no extra text:
{
  "message": "Short friendly explanation in the same language the user wrote in",
  "cards": [
    {
      "question": "Clear question that tests understanding",
      "answer": "Full explanation of the correct answer(s)",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answers": ["Option A"]
    }
  ]
}

Rules:
- Generate between 3 and 50 cards depending on the instruction
- Always populate "options" with 4 alternatives including all correct answers + plausible distractors, shuffled randomly
- "correct_answers" must be an array of the correct option string(s) — the text must match exactly what appears in "options"
- For single-correct questions: "correct_answers" has one item (same text as the correct option)
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

const TENTA_MODE_PROMPT = `
TENTA-LÄGE AKTIVERAT — Extrahera frågorna exakt som de står i tentan:
- Kopiera varje fråga ORDAGRANT från källmaterialet. Ändra INTE formuleringen, lägg INTE till egna frågor.
- Om tentan har svarsalternativ (A/B/C/D), använd dem exakt. Annars hittar du på 3 rimliga distraktorer.
- Tentan innehåller INGA svar — det är ditt jobb att ta fram korrekta svar med din ämneskunskap.
- Fyll i "answer" med en tydlig förklaring av vad som är rätt och varför.
- Om flera alternativ är korrekta enligt din kunskap, lista dem i "correct_answers".
- Om bara ett alternativ är korrekt, sätt "correct_answers" till en array med enbart det alternativet.
- Extrahera ALLA frågor från tentan, hoppa inte över några.`

export type GeneratedCard = {
  question: string
  answer: string
  options?: string[]
  correct_answers?: string[]
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
    const tentaMode = formData.get('tentaMode') === '1'

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
      fileContent = fileContent.slice(0, 30000)
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

    const systemContent = tentaMode
      ? SYSTEM_PROMPT + TENTA_MODE_PROMPT
      : SYSTEM_PROMPT

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemContent },
        ...openaiMessages,
      ],
      response_format: { type: 'json_object' },
      temperature: 0.8,
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
            correct_answers: Array.isArray(c.correct_answers) && c.correct_answers.length > 0
              ? c.correct_answers.map(String)
              : undefined,
          }))
      : []

    return NextResponse.json({ message: aiMessage, cards })
  } catch (error) {
    console.error('AI error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}