'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, Plus, X, ListChecks, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface CardFormValues {
  question: string
  answer: string
  options: string[]
  correct_answers: string[]
}

interface OptionEntry {
  text: string
  isCorrect: boolean
}

interface CardFormProps {
  initialValues?: Partial<CardFormValues>
  onSubmit: (values: CardFormValues) => Promise<void>
  onCancel?: () => void
  submitLabel?: string
}

export default function CardForm({
  initialValues = {},
  onSubmit,
  onCancel,
  submitLabel = 'Lägg till kort',
}: CardFormProps) {
  const [question, setQuestion] = useState(initialValues.question ?? '')
  const [answer, setAnswer] = useState(initialValues.answer ?? '')
  const [loading, setLoading] = useState(false)
  const [showOptions, setShowOptions] = useState(
    () => (initialValues.options?.length ?? 0) > 0
  )

  // Build option entries from initialValues
  const [optionEntries, setOptionEntries] = useState<OptionEntry[]>(() => {
    const opts = initialValues.options ?? []
    const corrects = new Set(initialValues.correct_answers ?? [])
    if (opts.length > 0) {
      return opts.map((text) => ({ text, isCorrect: corrects.has(text) }))
    }
    return [
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
    ]
  })

  function addOption() {
    setOptionEntries((prev) => [...prev, { text: '', isCorrect: false }])
  }

  function removeOption(index: number) {
    setOptionEntries((prev) => prev.filter((_, i) => i !== index))
  }

  function updateOptionText(index: number, text: string) {
    setOptionEntries((prev) =>
      prev.map((entry, i) => (i === index ? { ...entry, text } : entry))
    )
  }

  function toggleCorrect(index: number) {
    setOptionEntries((prev) =>
      prev.map((entry, i) =>
        i === index ? { ...entry, isCorrect: !entry.isCorrect } : entry
      )
    )
  }

  function handleToggleOptions() {
    setShowOptions((v) => !v)
    if (!showOptions) {
      setOptionEntries([
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
      ])
    }
  }

  function validate(): string | null {
    if (!question.trim()) return 'Frågan får inte vara tom.'
    if (!answer.trim()) return 'Svaret får inte vara tomt.'
    if (showOptions) {
      const filled = optionEntries.filter((o) => o.text.trim())
      if (filled.length < 2) return 'Ange minst 2 svarsalternativ.'
      if (!filled.some((o) => o.isCorrect)) return 'Markera minst ett rätt svar.'
    }
    return null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const err = validate()
    if (err) return

    setLoading(true)

    const filledOptions = optionEntries.filter((o) => o.text.trim())
    const options = showOptions ? filledOptions.map((o) => o.text.trim()) : []
    const correct_answers = showOptions
      ? filledOptions.filter((o) => o.isCorrect).map((o) => o.text.trim())
      : []

    await onSubmit({
      question: question.trim(),
      answer: answer.trim(),
      options,
      correct_answers,
    })

    setLoading(false)

    if (!initialValues.question) {
      setQuestion('')
      setAnswer('')
      setShowOptions(false)
      setOptionEntries([
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
      ])
    }
  }

  const correctCount = optionEntries.filter((o) => o.isCorrect && o.text.trim()).length

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Question + Answer */}
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="question">Fråga</Label>
          <Textarea
            id="question"
            placeholder="Skriv frågan…"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            required
            rows={3}
            className="resize-none"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="answer">Svar</Label>
          <Textarea
            id="answer"
            placeholder="Skriv svaret…"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            required
            rows={3}
            className="resize-none"
          />
        </div>
      </div>

      {/* Toggle options section */}
      <button
        type="button"
        onClick={handleToggleOptions}
        className={cn(
          'flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-lg border transition-colors w-full',
          showOptions
            ? 'border-violet-300 bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:border-violet-700 dark:text-violet-300'
            : 'border-dashed border-border text-muted-foreground hover:border-violet-300 hover:text-violet-600'
        )}
      >
        <ListChecks className="h-4 w-4 flex-shrink-0" />
        <span className="flex-1 text-left">
          {showOptions ? 'Svarsalternativ (flerval)' : 'Lägg till svarsalternativ'}
        </span>
        {showOptions ? (
          <ChevronUp className="h-4 w-4 flex-shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 flex-shrink-0" />
        )}
      </button>

      {/* Options list */}
      {showOptions && (
        <div className="rounded-xl border bg-muted/20 p-4 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Svarsalternativ
            </p>
            <p className="text-xs text-muted-foreground">
              {correctCount === 0
                ? 'Markera rätt svar med checkboxen'
                : correctCount === 1
                ? '1 rätt svar'
                : `${correctCount} rätta svar`}
            </p>
          </div>

          <div className="space-y-2">
            {optionEntries.map((entry, i) => (
              <div key={i} className="flex items-center gap-2">
                <Checkbox
                  id={`correct-${i}`}
                  checked={entry.isCorrect}
                  onCheckedChange={() => toggleCorrect(i)}
                  className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 flex-shrink-0"
                />
                <Input
                  placeholder={`Alternativ ${i + 1}`}
                  value={entry.text}
                  onChange={(e) => updateOptionText(i, e.target.value)}
                  className={cn(
                    'flex-1 h-8 text-sm',
                    entry.isCorrect && entry.text.trim()
                      ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/20'
                      : ''
                  )}
                />
                {optionEntries.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeOption(i)}
                    className="flex-shrink-0 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={addOption}
            className="gap-1.5 text-muted-foreground hover:text-foreground w-full border border-dashed"
          >
            <Plus className="h-3.5 w-3.5" />
            Lägg till alternativ
          </Button>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" size="sm" onClick={onCancel} className="gap-1.5">
            <X className="h-3.5 w-3.5" />
            Avbryt
          </Button>
        )}
        <Button
          type="submit"
          size="sm"
          className="bg-violet-600 hover:bg-violet-700 gap-1.5"
          disabled={loading || !question.trim() || !answer.trim()}
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Plus className="h-3.5 w-3.5" />
          )}
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
