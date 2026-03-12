'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Bot,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileText,
  Loader2,
  Paperclip,
  Plus,
  Send,
  Sparkles,
  User,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { Card } from '@/types/database'

/* ------------------------------------------------------------------ */
/* Types                                                                 */
/* ------------------------------------------------------------------ */
type GeneratedCard = {
  question: string
  answer: string
  options?: string[]
}

type ChatRole = 'user' | 'assistant'

type ChatMessage = {
  id: string
  role: ChatRole
  content: string
  cards?: GeneratedCard[]
  addedToQuiz?: boolean
}

interface AIChatDialogProps {
  quizId: string
  onCardsGenerated: (cards: Omit<Card, 'id' | 'created_at' | 'updated_at'>[]) => void
  children?: React.ReactNode
}

/* ------------------------------------------------------------------ */
/* Helpers                                                               */
/* ------------------------------------------------------------------ */
function uid() {
  return Math.random().toString(36).slice(2)
}

const SUGGESTIONS = [
  'Gör flashcards från det här materialet',
  'Gör liknande frågor fast svårare',
  'Fokusera bara på [ämne]',
  'Ge mig 5 flervalssfrågor',
  'Förenkla frågorna för nybörjare',
]

/* ------------------------------------------------------------------ */
/* CardPreview with checkbox                                             */
/* ------------------------------------------------------------------ */
function CardPreview({
  card,
  index,
  selected,
  onToggle,
}: {
  card: GeneratedCard
  index: number
  selected: boolean
  onToggle: () => void
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      className={cn(
        'rounded-lg border bg-white dark:bg-gray-900 p-3 transition-colors',
        selected
          ? 'border-violet-400 dark:border-violet-600 bg-violet-50/50 dark:bg-violet-950/20'
          : 'border-border hover:border-violet-200'
      )}
    >
      <div className="flex items-start gap-2.5">
        {/* Checkbox */}
        <button
          onClick={onToggle}
          className={cn(
            'flex-shrink-0 mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors',
            selected
              ? 'border-violet-500 bg-violet-500 text-white'
              : 'border-muted-foreground/40 hover:border-violet-400'
          )}
          aria-label={selected ? 'Avmarkera kort' : 'Markera kort'}
        >
          {selected && (
            <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>

        {/* Number */}
        <span className="flex-shrink-0 mt-0.5 w-5 h-5 rounded-full bg-muted text-muted-foreground text-[10px] font-bold flex items-center justify-center">
          {index + 1}
        </span>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-snug">{card.question}</p>
          {expanded && (
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed border-t pt-2">
              {card.answer}
            </p>
          )}
        </div>

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex-shrink-0 mt-0.5 text-muted-foreground hover:text-foreground transition-colors"
          aria-label={expanded ? 'Dölj svar' : 'Visa svar'}
        >
          {expanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* AssistantMessage                                                      */
/* ------------------------------------------------------------------ */
function AssistantMessage({
  message,
  onAddCards,
}: {
  message: ChatMessage
  onAddCards: (msgId: string, cards: GeneratedCard[]) => void
}) {
  const [selected, setSelected] = useState<Set<number>>(
    () => new Set(message.cards?.map((_, i) => i) ?? [])
  )

  const cards = message.cards ?? []
  const allSelected = selected.size === cards.length
  const noneSelected = selected.size === 0

  function toggleCard(i: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(cards.map((_, i) => i)))
    }
  }

  return (
    <div className="flex gap-3 items-start">
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-violet-100 dark:bg-violet-950/60 flex items-center justify-center">
        <Bot className="h-4 w-4 text-violet-600" />
      </div>
      <div className="flex-1 min-w-0 space-y-3">
        {/* Message bubble */}
        <div className="rounded-2xl rounded-tl-sm bg-muted/60 dark:bg-gray-800/80 px-4 py-3 text-sm leading-relaxed">
          {message.content}
        </div>

        {/* Cards */}
        {cards.length > 0 && (
          <div className="space-y-2">
            {/* Header row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs gap-1">
                  <Sparkles className="h-3 w-3 text-violet-500" />
                  {cards.length} kort genererade
                </Badge>
              </div>
              {!message.addedToQuiz && (
                <button
                  onClick={toggleAll}
                  className="text-xs text-violet-600 hover:underline font-medium"
                >
                  {allSelected ? 'Avmarkera alla' : 'Markera alla'}
                </button>
              )}
            </div>

            {/* Card list */}
            <div className="space-y-1.5 max-h-72 overflow-y-auto pr-0.5">
              {cards.map((card, i) => (
                <CardPreview
                  key={i}
                  card={card}
                  index={i}
                  selected={selected.has(i)}
                  onToggle={() => toggleCard(i)}
                />
              ))}
            </div>

            {/* Action row */}
            {message.addedToQuiz ? (
              <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                <CheckCircle2 className="h-4 w-4" />
                Korten har lagts till i quizet!
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Button
                  size="sm"
                  className="bg-violet-600 hover:bg-violet-700 gap-2"
                  disabled={noneSelected}
                  onClick={() => {
                    const chosenCards = cards.filter((_, i) => selected.has(i))
                    onAddCards(message.id, chosenCards)
                  }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Lägg till {selected.size > 0 ? `${selected.size} valda` : ''} kort
                </Button>
                {!allSelected && selected.size > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {cards.length - selected.size} borttagna
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* UserMessage                                                           */
/* ------------------------------------------------------------------ */
function UserMessage({ message }: { message: ChatMessage }) {
  return (
    <div className="flex gap-3 items-start justify-end">
      <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-violet-600 text-white px-4 py-3 text-sm leading-relaxed">
        {message.content}
      </div>
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
        <User className="h-4 w-4 text-gray-600 dark:text-gray-300" />
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Main component                                                        */
/* ------------------------------------------------------------------ */
export default function AIChatDialog({
  quizId,
  onCardsGenerated,
  children,
}: AIChatDialogProps) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (!['application/pdf', 'text/plain'].includes(f.type)) {
      toast.error('Endast PDF och .txt stöds')
      return
    }
    if (f.size > 5 * 1024 * 1024) {
      toast.error('Filen måste vara under 5MB')
      return
    }
    setFile(f)
    toast.success(`${f.name} bifogad`)
  }

  const removeFile = () => {
    setFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed && !file) return
      if (loading) return

      const userMsg: ChatMessage = {
        id: uid(),
        role: 'user',
        content: trimmed || `Jag har laddat upp filen: ${file?.name}`,
      }

      const newHistory = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }))

      setMessages((prev) => [...prev, userMsg])
      setInput('')
      setLoading(true)

      try {
        const formData = new FormData()
        formData.append('messages', JSON.stringify(newHistory))
        if (file && messages.length === 0) {
          formData.append('file', file)
        }

        const res = await fetch('/api/ai/chat', {
          method: 'POST',
          body: formData,
        })

        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error ?? 'Något gick fel')
        }

        const data = await res.json()

        const assistantMsg: ChatMessage = {
          id: uid(),
          role: 'assistant',
          content: data.message,
          cards: data.cards?.length > 0 ? data.cards : undefined,
          addedToQuiz: false,
        }
        setMessages((prev) => [...prev, assistantMsg])

        if (file && messages.length === 0) {
          setFile(null)
          if (fileInputRef.current) fileInputRef.current.value = ''
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Kunde inte kontakta AI')
        setMessages((prev) => prev.filter((m) => m.id !== userMsg.id))
      } finally {
        setLoading(false)
        setTimeout(() => textareaRef.current?.focus(), 50)
      }
    },
    [loading, messages, file]
  )

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const handleAddCards = (msgId: string, cards: GeneratedCard[]) => {
    const mapped = cards.map((c, i) => ({
      quiz_id: quizId,
      question: c.question,
      answer: c.answer,
      options: c.options ?? null,
      correct_answers: null,
      position: i,
    }))
    onCardsGenerated(mapped)
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, addedToQuiz: true } : m))
    )
    toast.success(`${cards.length} kort tillagda i quizet!`)
  }

  const handleClose = () => setOpen(false)

  const handleClearChat = () => {
    setMessages([])
    setFile(null)
    setInput('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const isEmpty = messages.length === 0

  const triggerEl = children
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? React.cloneElement(children as React.ReactElement<any>, { onClick: () => setOpen(true) })
    : (
      <Button variant="outline" className="gap-2" onClick={() => setOpen(true)}>
        <Sparkles className="h-4 w-4 text-violet-500" />
        Chatta med AI
      </Button>
    )

  return (
    <>
      {triggerEl}
      <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else setOpen(true) }}>
        <DialogContent className="sm:max-w-2xl flex flex-col p-0 gap-0 overflow-hidden h-[85vh] max-h-[700px]">
          {/* Header */}
          <DialogHeader className="px-5 pt-5 pb-3 border-b shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2 text-base">
                <Bot className="h-5 w-5 text-violet-600" />
                AI Flashcard-assistent
              </DialogTitle>
              {messages.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground h-7"
                  onClick={handleClearChat}
                >
                  Rensa chatt
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Ladda upp en fil eller skriv ett meddelande. Välj vilka kort du vill lägga till.
            </p>
          </DialogHeader>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 min-h-0">
            {isEmpty ? (
              <div className="h-full flex flex-col items-center justify-center gap-5 text-center">
                <div className="w-14 h-14 rounded-full bg-violet-100 dark:bg-violet-950/50 flex items-center justify-center">
                  <Bot className="h-7 w-7 text-violet-600" />
                </div>
                <div className="space-y-1">
                  <p className="font-semibold text-base">Hej! Hur kan jag hjälpa dig?</p>
                  <p className="text-sm text-muted-foreground max-w-xs">
                    Ladda upp din tentafil eller klistra in text och berätta vad du vill ha hjälp med.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 justify-center max-w-sm">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => setInput(s)}
                      className="text-xs border rounded-full px-3 py-1.5 hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/30 transition-colors text-muted-foreground hover:text-foreground"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((msg) =>
                  msg.role === 'user' ? (
                    <UserMessage key={msg.id} message={msg} />
                  ) : (
                    <AssistantMessage
                      key={msg.id}
                      message={msg}
                      onAddCards={handleAddCards}
                    />
                  )
                )}
                {loading && (
                  <div className="flex gap-3 items-start">
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-violet-100 dark:bg-violet-950/60 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-violet-600" />
                    </div>
                    <div className="rounded-2xl rounded-tl-sm bg-muted/60 dark:bg-gray-800/80 px-4 py-3">
                      <div className="flex gap-1 items-center h-5">
                        <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce [animation-delay:0ms]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce [animation-delay:150ms]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce [animation-delay:300ms]" />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input area */}
          <div className="shrink-0 border-t bg-white dark:bg-gray-950 px-4 pb-4 pt-3 space-y-2">
            {file && (
              <div className="flex items-center gap-2 text-xs">
                <div className="flex items-center gap-1.5 border rounded-full px-2.5 py-1 bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300">
                  <FileText className="h-3 w-3" />
                  <span className="max-w-[180px] truncate font-medium">{file.name}</span>
                  <button onClick={removeFile} className="ml-0.5 hover:text-red-500 transition-colors">
                    <X className="h-3 w-3" />
                  </button>
                </div>
                <span className="text-muted-foreground">
                  {messages.length === 0 ? 'Bifogad – skickas med nästa meddelande' : 'Redan skickad'}
                </span>
              </div>
            )}

            <div className="flex gap-2 items-end">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt,text/plain,application/pdf"
                className="hidden"
                onChange={handleFileChange}
              />
              <Button
                variant="outline"
                size="icon"
                className={cn('h-10 w-10 shrink-0', file && 'border-violet-400 bg-violet-50 dark:bg-violet-950/30')}
                onClick={() => fileInputRef.current?.click()}
                title="Bifoga fil (PDF eller TXT)"
              >
                <Paperclip className={cn('h-4 w-4', file ? 'text-violet-600' : 'text-muted-foreground')} />
              </Button>

              <div className="flex-1 relative">
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    file
                      ? 'Berätta vad du vill göra med filen… (Enter för att skicka)'
                      : 'Skriv ett meddelande… (Enter för att skicka)'
                  }
                  rows={1}
                  className="resize-none pr-1 min-h-[40px] max-h-32 overflow-y-auto py-2.5 text-sm"
                  disabled={loading}
                />
              </div>

              <Button
                size="icon"
                className="h-10 w-10 shrink-0 bg-violet-600 hover:bg-violet-700"
                onClick={() => sendMessage(input)}
                disabled={loading || (!input.trim() && !file)}
                title="Skicka (Enter)"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground text-center">
              Enter = skicka &nbsp;·&nbsp; Shift+Enter = ny rad &nbsp;·&nbsp; Klicka pil för att se svar
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
