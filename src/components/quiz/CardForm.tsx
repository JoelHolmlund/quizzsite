'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Plus, X } from 'lucide-react'

interface CardFormValues {
  question: string
  answer: string
}

interface CardFormProps {
  initialValues?: CardFormValues
  onSubmit: (values: CardFormValues) => Promise<void>
  onCancel?: () => void
  submitLabel?: string
}

export default function CardForm({
  initialValues = { question: '', answer: '' },
  onSubmit,
  onCancel,
  submitLabel = 'Add card',
}: CardFormProps) {
  const [question, setQuestion] = useState(initialValues.question)
  const [answer, setAnswer] = useState(initialValues.answer)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!question.trim() || !answer.trim()) return
    setLoading(true)
    await onSubmit({ question: question.trim(), answer: answer.trim() })
    setLoading(false)
    if (!initialValues.question) {
      setQuestion('')
      setAnswer('')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="question">Question</Label>
          <Textarea
            id="question"
            placeholder="Enter question…"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            required
            rows={3}
            className="resize-none"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="answer">Answer</Label>
          <Textarea
            id="answer"
            placeholder="Enter answer…"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            required
            rows={3}
            className="resize-none"
          />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" size="sm" onClick={onCancel} className="gap-1.5">
            <X className="h-3.5 w-3.5" />
            Cancel
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
