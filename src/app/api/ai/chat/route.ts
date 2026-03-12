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
- STRICTLY FORBIDDEN — NEVER generate meta-questions about the document itself. Questions like "Vad erbjuder X enligt dokumentet?", "What does the material say about Y?", "According to the text, what is Z?" are useless for studying and are BANNED. Every question must test knowledge of the actual subject matter, not what text happens to appear in an uploaded file.
- If a document contains a cover page (course code, date, institution, teacher name, instructions): IGNORE IT COMPLETELY. Never generate questions about cover page content.

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
TENTA-LÄGE AKTIVERAT.

DIN UPPGIFT: Hitta sidorna med faktiska tentafrågor och kopiera dem ordagrant.

===== STEG 1 — IGNORERA OMSLAG OCH ADMINISTRATIVA SIDOR =====
En försättssida/omslagssida innehåller: kurskod, kursnamn, datum, tid, institution, lärare, poäng, hjälpmedel, instruktioner.
Generera INGA frågor från sådana sidor. Hoppa över dem helt.

===== STEG 2 — EXTRAHERA FRÅGORNA ORDAGRANT =====
Hitta sidorna med faktiska uppgifter (märkta "Fråga 1", "Uppgift 1", "Question 1" etc.).
Kopiera varje frågetext EXAKT som den är skriven — ord för ord, tecken för tecken.

FÖRBJUDET — generera ALDRIG:
- Frågor om vad tentan handlar om ("Vad är huvudtemat i tentan?")
- Frågor om omslagets innehåll ("Vilket kursnamn visas?", "Vilket datum?")
- Frågor om tentans struktur ("Vilken typ av frågor finns i del 2?")
- Egna påhittade frågor som inte finns i dokumentet

RÄTT exempel — om tentan har: "Fråga 3: Vilka fyra steg ingår i PDCA-cykeln?"
→ question: "Vilka fyra steg ingår i PDCA-cykeln?"  ✓

FEL exempel:
→ question: "Vad handlar fråga 3 om?" ✗
→ question: "Vilken fråga på tentan berör PDCA?" ✗

===== STEG 3 — LÄGG TILL SVAR =====
Tentan har inga svar. Använd din ämneskunskap för att:
- Fylla i "answer" med ett fullständigt svar som verkligen förklarar konceptet.
- Om tentan har svarsalternativ (A/B/C/D), använd dem exakt som distraktorer.
- Annars konstruera 3 rimliga men felaktiga distraktorer.
- Sätt "correct_answers" till en array med alla korrekta alternativ.
- Generera så många frågor du hinner med i detta svar.
- Om det finns fler frågor kvar som du INTE hann med, skriv i "message"-fältet exakt vilken fråga/vilket nummer du stannade vid (t.ex. "Genererade fråga 1–8. Fråga 9 och framåt återstår — skriv 'fortsätt' för nästa batch.").
- Om du hann med ALLA frågor, skriv i "message" hur många du genererade totalt.`

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
    let pdfBase64: string | null = null

    if (file) {
      if (file.type === 'text/plain') {
        fileContent = await file.text()
      } else if (file.type === 'application/pdf') {
        try {
          const arrayBuffer = await file.arrayBuffer()
          // Save base64 BEFORE unpdf consumes the ArrayBuffer (it detaches it)
          const base64Encoded = Buffer.from(arrayBuffer.slice(0)).toString('base64')

          const { extractText } = await import('unpdf')
          const { text } = await extractText(new Uint8Array(arrayBuffer), { mergePages: true })
          fileContent = text

          // If extracted text is too short the PDF is image-based (scanned).
          // Fall back to sending it as base64 so GPT-4o can read it visually.
          if (fileContent.trim().length < 100) {
            pdfBase64 = `data:application/pdf;base64,${base64Encoded}`
            fileContent = ''
          }
        } catch (pdfErr) {
          console.error('PDF parse error:', pdfErr)
          return NextResponse.json(
            { error: 'Kunde inte läsa PDF-filen.' },
            { status: 400 }
          )
        }
      }
      if (fileContent) {
        fileContent = fileContent.slice(0, 40000)
      }
    }

    // Extra reminder injected into the user message when tenta mode is active
    const tentaReminder = tentaMode
      ? '\n\n[SYSTEM REMINDER: This is an exam (tenta). Page 1 is a cover page — SKIP IT. Find the pages with actual numbered questions (Fråga/Uppgift/Question 1, 2, 3…) and extract EVERY question verbatim. Do NOT generate meta-questions about the document. Do NOT ask about dates, course codes, or instructor names.]'
      : ''

    const openaiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = messages.map((msg, i) => {
      if (i === 0 && msg.role === 'user') {
        if (pdfBase64) {
          // Image-based PDF: send as base64 file so GPT-4o reads it visually
          return {
            role: 'user' as const,
            content: [
              {
                type: 'file' as const,
                file: {
                  filename: file?.name ?? 'document.pdf',
                  file_data: pdfBase64,
                },
              },
              { type: 'text' as const, text: msg.content + tentaReminder },
            ],
          }
        }
        if (fileContent) {
          return {
            role: 'user',
            content: `Source material:\n${fileContent}\n\nUser instruction: ${msg.content}${tentaReminder}`,
          }
        }
      }
      return { role: msg.role, content: msg.content }
    })

    // In tenta mode, prepend the tenta instructions so they take highest priority
    const systemContent = tentaMode
      ? TENTA_MODE_PROMPT + '\n\n' + SYSTEM_PROMPT
      : SYSTEM_PROMPT

    // Image-based PDFs require gpt-4o (vision capable); text PDFs use gpt-4o-mini
    const model = pdfBase64 ? 'gpt-4o' : 'gpt-4o-mini'

    const completion = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemContent },
        ...openaiMessages,
      ],
      response_format: { type: 'json_object' },
      temperature: 0.8,
      max_tokens: 16384,
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