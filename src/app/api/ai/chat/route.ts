import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const SYSTEM_PROMPT = `You are an expert educator and flashcard creator. You help students study by creating high-quality flashcards from their study materials.

The user may upload a file (PDF, text) as their source material. They will then give you instructions in natural language — for example:
- "Create flashcards from this"
- "Make similar questions but harder"
- "Focus only on integration by parts"
- "Give me 5 multiple choice questions about derivatives"
- "Translate these to Swedish"

Always respond with:
1. A short friendly message explaining what you did (in the same language the user wrote in)
2. A JSON block with the generated flashcards

Your response MUST follow this exact format:
<message>Your friendly explanation here</message>
<cards>
[
  {
    "question": "Clear question here",
    "answer": "Concise answer here",
    "options": ["Correct answer", "Distractor 1", "Distractor 2", "Distractor 3"]
  }
]
</cards>

Rules for cards:
- Generate between 3 and 20 cards depending on the instruction
- The "options" array is for MCQ — always include the correct answer (same text as "answer") plus 3 plausible distractors, shuffled randomly
- If the user asks for harder questions, make them more conceptual or multi-step
- If the user asks to focus on a topic, only generate cards about that topic
- Keep answers concise (1-3 sentences max)
- ALWAYS include both <message> and <cards> tags in your response`

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

    // If a file was uploaded, prepend its content to the first user message
    let fileContent = ''
    if (file) {
      if (file.type === 'text/plain') {
        fileContent = await file.text()
      } else if (file.type === 'application/pdf') {
        try {
          const arrayBuffer = await file.arrayBuffer()
          const buffer = Buffer.from(arrayBuffer)
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string }>
          const parsed = await pdfParse(buffer)
          fileContent = parsed.text
        } catch (pdfErr) {
          console.error('PDF parse error:', pdfErr)
          return NextResponse.json(
            { error: 'Kunde inte läsa PDF-filen. Prova att kopiera och klistra in texten istället.' },
            { status: 400 }
          )
        }
      }
      // Truncate large files
      fileContent = fileContent.slice(0, 12000)
    }

    // Build OpenAI messages array
    const openaiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = []

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i]
      if (i === 0 && fileContent && msg.role === 'user') {
        // Attach file content to first user message
        openaiMessages.push({
          role: 'user',
          content: `Here is the source material:\n\n---\n${fileContent}\n---\n\n${msg.content}`,
        })
      } else {
        openaiMessages.push({
          role: msg.role,
          content: msg.content,
        })
      }
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...openaiMessages,
      ],
      temperature: 0.7,
      max_tokens: 4000,
    })

    const responseText = completion.choices[0]?.message?.content ?? ''

    // Parse message and cards from response
    const messageMatch = responseText.match(/<message>([\s\S]*?)<\/message>/)
    const cardsMatch = responseText.match(/<cards>([\s\S]*?)<\/cards>/)

    const aiMessage = messageMatch?.[1]?.trim() ?? 'Here are your flashcards!'

    let cards: GeneratedCard[] = []
    if (cardsMatch?.[1]) {
      try {
        const parsed = JSON.parse(cardsMatch[1].trim())
        cards = Array.isArray(parsed)
          ? parsed
              .filter((c: { question?: unknown; answer?: unknown }) => c.question && c.answer)
              .map((c: { question: string; answer: string; options?: string[] }) => ({
                question: String(c.question).trim(),
                answer: String(c.answer).trim(),
                options: Array.isArray(c.options) ? c.options.map(String) : undefined,
              }))
          : []
      } catch {
        // Could not parse cards JSON — return empty
      }
    }

    return NextResponse.json({ message: aiMessage, cards })
  } catch (error) {
    console.error('AI chat error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
