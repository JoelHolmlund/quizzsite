'use client'

import React, { useState, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Bot, CheckCircle2, FileText, Loader2, Sparkles, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import type { Card } from '@/types/database'

interface GeneratedCard {
  question: string
  answer: string
  options?: string[]
}

interface AIGenerateDialogProps {
  quizId: string
  onCardsGenerated: (cards: Omit<Card, 'id' | 'created_at' | 'updated_at'>[]) => void
  children?: React.ReactNode
}

export default function AIGenerateDialog({ quizId, onCardsGenerated, children }: AIGenerateDialogProps) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [generatedCards, setGeneratedCards] = useState<GeneratedCard[]>([])
  const [step, setStep] = useState<'input' | 'review'>('input')
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    const allowed = ['application/pdf', 'text/plain']
    if (!allowed.includes(f.type)) {
      toast.error('Only PDF and .txt files are supported')
      return
    }
    if (f.size > 5 * 1024 * 1024) {
      toast.error('File must be under 5MB')
      return
    }
    setFile(f)
  }

  function removeFile() {
    setFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleGenerate() {
    if (!text.trim() && !file) {
      toast.error('Please provide text or upload a file')
      return
    }
    setLoading(true)
    setProgress(10)

    try {
      const formData = new FormData()
      if (file) {
        formData.append('file', file)
      } else {
        formData.append('text', text)
      }

      setProgress(30)
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        body: formData,
      })

      setProgress(80)

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Generation failed')
      }

      const data = await res.json()
      setProgress(100)
      setGeneratedCards(data.cards)
      setStep('review')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate cards')
    } finally {
      setLoading(false)
      setProgress(0)
    }
  }

  function handleAccept() {
    const cards = generatedCards.map((c, i) => ({
      quiz_id: quizId,
      question: c.question,
      answer: c.answer,
      options: c.options ?? null,
      correct_answers: null,
      position: i,
    }))
    onCardsGenerated(cards)
    handleClose()
    toast.success(`${cards.length} cards added to your quiz!`)
  }

  function handleClose() {
    setOpen(false)
    setText('')
    setFile(null)
    setGeneratedCards([])
    setStep('input')
    setLoading(false)
    setProgress(0)
  }

  const triggerEl = children
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? React.cloneElement(children as React.ReactElement<any>, { onClick: () => setOpen(true) })
    : (
      <Button variant="outline" className="gap-2" onClick={() => setOpen(true)}>
        <Sparkles className="h-4 w-4 text-violet-500" />
        Generate with AI
      </Button>
    )

  return (
    <>
      {triggerEl}
      <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else setOpen(true) }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-violet-600" />
            AI Flashcard Generator
          </DialogTitle>
          <DialogDescription>
            Upload a PDF/text file or paste your content below. AI will extract key concepts and create flashcards.
          </DialogDescription>
        </DialogHeader>

        {step === 'input' && (
          <div className="space-y-4 py-2">
            {/* File upload */}
            <div
              className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-violet-400 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt,text/plain,application/pdf"
                className="hidden"
                onChange={handleFileChange}
              />
              {file ? (
                <div className="flex items-center justify-center gap-3">
                  <FileText className="h-8 w-8 text-violet-600" />
                  <div className="text-left">
                    <p className="font-medium text-sm">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 ml-2"
                    onClick={(e) => { e.stopPropagation(); removeFile() }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                  <p className="text-sm font-medium">Drop a file here or click to upload</p>
                  <p className="text-xs text-muted-foreground">PDF or TXT, up to 5MB</p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">or paste text</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <Textarea
              placeholder="Paste your study material here... lecture notes, chapter summaries, topic definitions, etc."
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={8}
              disabled={!!file}
              className="resize-none"
            />

            {loading && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyzing content and generating flashcards…
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button
                className="bg-violet-600 hover:bg-violet-700 gap-2"
                onClick={handleGenerate}
                disabled={loading || (!text.trim() && !file)}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Generate cards
              </Button>
            </div>
          </div>
        )}

        {step === 'review' && (
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <p className="font-medium">Generated {generatedCards.length} cards</p>
              <Badge variant="secondary" className="ml-auto">{generatedCards.length} cards</Badge>
            </div>

            <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
              {generatedCards.map((card, i) => (
                <div key={i} className="rounded-lg border bg-muted/30 p-4 space-y-2">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Question</p>
                    <p className="text-sm font-medium">{card.question}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Answer</p>
                    <p className="text-sm text-muted-foreground">{card.answer}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setStep('input')}>← Back</Button>
              <Button className="bg-violet-600 hover:bg-violet-700 gap-2" onClick={handleAccept}>
                <CheckCircle2 className="h-4 w-4" />
                Add {generatedCards.length} cards
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
      </Dialog>
    </>
  )
}
