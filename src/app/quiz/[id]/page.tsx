'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import CardForm from '@/components/quiz/CardForm'
import AIChatDialog from '@/components/ai/AIChatDialog'
import {
  ArrowLeft,
  BookOpen,
  GraduationCap,
  Loader2,
  Pencil,
  Share2,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import type { Quiz, Card, CardInsert } from '@/types/database'

// Force supabase to use our explicit types
type QuizRow = Quiz
type CardRow = Card

export default function QuizDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [quiz, setQuiz] = useState<QuizRow | null>(null)
  const [cards, setCards] = useState<CardRow[]>([])
  const [loading, setLoading] = useState(true)
  const [isOwner, setIsOwner] = useState(false)

  // Edit quiz state
  const [editingQuiz, setEditingQuiz] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editIsPublic, setEditIsPublic] = useState(false)
  const [savingQuiz, setSavingQuiz] = useState(false)

  // Edit card state
  const [editingCard, setEditingCard] = useState<CardRow | null>(null)
  const [deletingCardId, setDeletingCardId] = useState<string | null>(null)

  // Delete quiz state
  const [deletingQuiz, setDeletingQuiz] = useState(false)
  const [deleteQuizDialogOpen, setDeleteQuizDialogOpen] = useState(false)

  const fetchData = useCallback(async () => {
    const { data: quizRaw, error: quizError } = await supabase
      .from('quizzes')
      .select('*')
      .eq('id', id)
      .single()

    if (quizError || !quizRaw) {
      router.push('/dashboard')
      return
    }
    const quizData = quizRaw as QuizRow

    const { data: { user } } = await supabase.auth.getUser()
    setIsOwner(user?.id === quizData.user_id)

    const { data: cardsRaw } = await supabase
      .from('cards')
      .select('*')
      .eq('quiz_id', id)
      .order('position', { ascending: true })

    setQuiz(quizData)
    setCards((cardsRaw ?? []) as CardRow[])
    setLoading(false)
  }, [id, router, supabase])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  async function handleSaveQuiz() {
    if (!quiz) return
    setSavingQuiz(true)
    const { data: updatedRaw, error } = await supabase
      .from('quizzes')
      .update({
        title: editTitle.trim(),
        description: editDescription.trim() || null,
        is_public: editIsPublic,
      })
      .eq('id', quiz.id)
      .select()
      .single()

    if (error) {
      toast.error('Failed to save: ' + error.message)
    } else {
      setQuiz(updatedRaw as QuizRow)
      setEditingQuiz(false)
      toast.success('Quiz updated!')
    }
    setSavingQuiz(false)
  }

  async function handleAddCard(values: { question: string; answer: string }) {
    if (!quiz) return
    const position = cards.length
    const { data: newCardRaw, error } = await supabase
      .from('cards')
      .insert({ quiz_id: quiz.id, question: values.question, answer: values.answer, position })
      .select()
      .single()

    if (error) {
      toast.error('Failed to add card')
    } else {
      setCards((prev) => [...prev, newCardRaw as CardRow])
      toast.success('Card added!')
    }
  }

  async function handleUpdateCard(values: { question: string; answer: string }) {
    if (!editingCard) return
    const { data: updatedCardRaw, error } = await supabase
      .from('cards')
      .update({ question: values.question, answer: values.answer })
      .eq('id', editingCard.id)
      .select()
      .single()

    if (error) {
      toast.error('Failed to update card')
    } else {
      const updatedCard = updatedCardRaw as CardRow
      setCards((prev) => prev.map((c) => (c.id === updatedCard.id ? updatedCard : c)))
      setEditingCard(null)
      toast.success('Card updated!')
    }
  }

  async function handleDeleteCard(cardId: string) {
    const { error } = await supabase.from('cards').delete().eq('id', cardId)
    if (error) {
      toast.error('Failed to delete card')
    } else {
      setCards((prev) => prev.filter((c) => c.id !== cardId))
      toast.success('Card deleted')
    }
    setDeletingCardId(null)
  }

  async function handleAICards(
    newCards: Omit<Card, 'id' | 'created_at' | 'updated_at'>[]
  ) {
    if (!quiz) return
    const startPosition = cards.length
    const inserts: CardInsert[] = newCards.map((c, i) => ({
      quiz_id: quiz.id,
      question: c.question,
      answer: c.answer,
      options: c.options ?? null,
      position: startPosition + i,
    }))

    const { data: newCardsRaw, error } = await supabase.from('cards').insert(inserts).select()
    if (error) {
      toast.error('Failed to save AI cards: ' + error.message)
    } else {
      setCards((prev) => [...prev, ...((newCardsRaw ?? []) as CardRow[])])
    }
  }

  function handleShare() {
    navigator.clipboard.writeText(window.location.href)
    toast.success('Länk kopierad!')
  }

  async function handleDeleteQuiz() {
    if (!quiz) return
    setDeletingQuiz(true)
    const { error } = await supabase.from('quizzes').delete().eq('id', quiz.id)
    if (error) {
      toast.error('Kunde inte radera quizet')
      setDeletingQuiz(false)
    } else {
      toast.success('Quiz raderat')
      router.push('/dashboard')
      router.refresh()
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
      </div>
    )
  }

  if (!quiz) return null

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Simple top bar */}
      <header className="sticky top-0 z-40 border-b bg-white/80 dark:bg-gray-950/80 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="gap-1.5 -ml-2">
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </Button>
          </Link>
          <Separator orientation="vertical" className="h-5" />
          <span className="font-semibold truncate flex-1">{quiz.title}</span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleShare} className="gap-1.5">
              <Share2 className="h-4 w-4" />
              <span className="hidden sm:inline">Dela</span>
            </Button>
            {isOwner && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDeleteQuizDialogOpen(true)}
                className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" />
                <span className="hidden sm:inline">Radera quiz</span>
              </Button>
            )}
            <Link href={`/quiz/${quiz.id}/study`}>
              <Button size="sm" className="bg-violet-600 hover:bg-violet-700 gap-1.5">
                <GraduationCap className="h-4 w-4" />
                Studera
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Quiz header */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border p-6 shadow-sm">
          {editingQuiz ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} autoFocus />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={2} />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/30">
                <div>
                  <p className="text-sm font-medium">Public</p>
                  <p className="text-xs text-muted-foreground">Visible in Explore feed</p>
                </div>
                <Switch checked={editIsPublic} onCheckedChange={setEditIsPublic} />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setEditingQuiz(false)}>Cancel</Button>
                <Button
                  className="bg-violet-600 hover:bg-violet-700"
                  onClick={handleSaveQuiz}
                  disabled={savingQuiz}
                >
                  {savingQuiz ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Save changes
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl font-bold">{quiz.title}</h1>
                  <Badge variant={quiz.is_public ? 'default' : 'secondary'} className="shrink-0">
                    {quiz.is_public ? 'Public' : 'Private'}
                  </Badge>
                </div>
                {quiz.description && (
                  <p className="text-muted-foreground">{quiz.description}</p>
                )}
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <BookOpen className="h-4 w-4" />
                  {cards.length} {cards.length === 1 ? 'card' : 'cards'}
                </p>
              </div>
              {isOwner && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 shrink-0"
                  onClick={() => {
                    setEditTitle(quiz.title)
                    setEditDescription(quiz.description ?? '')
                    setEditIsPublic(quiz.is_public)
                    setEditingQuiz(true)
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Cards section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Cards ({cards.length})</h2>
            {isOwner && (
              <AIChatDialog quizId={quiz.id} onCardsGenerated={handleAICards}>
                <Button variant="outline" className="gap-2">
                  <Sparkles className="h-4 w-4 text-violet-500" />
                  Generera med AI
                </Button>
              </AIChatDialog>
            )}
          </div>

          {/* Add card form */}
          {isOwner && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border p-6 shadow-sm">
              <h3 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wide">Add a new card</h3>
              <CardForm onSubmit={handleAddCard} />
            </div>
          )}

          {/* Card list */}
          {cards.length === 0 ? (
            <div className="text-center py-12 rounded-2xl border-2 border-dashed bg-white dark:bg-gray-900 text-muted-foreground">
              <BookOpen className="h-8 w-8 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No cards yet</p>
              <p className="text-sm mt-1">Add cards manually or use AI generation above.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cards.map((card, i) => (
                <div
                  key={card.id}
                  className="bg-white dark:bg-gray-900 rounded-xl border p-4 shadow-sm group"
                >
                  {editingCard?.id === card.id ? (
                    <CardForm
                      initialValues={{ question: card.question, answer: card.answer }}
                      onSubmit={handleUpdateCard}
                      onCancel={() => setEditingCard(null)}
                      submitLabel="Save card"
                    />
                  ) : (
                    <div className="flex gap-4">
                      <span className="flex-shrink-0 w-7 h-7 rounded-full bg-violet-100 dark:bg-violet-950/50 text-violet-600 text-xs font-bold flex items-center justify-center">
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0 grid sm:grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Question</p>
                          <p className="text-sm font-medium leading-relaxed">{card.question}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Answer</p>
                          <p className="text-sm text-muted-foreground leading-relaxed">{card.answer}</p>
                        </div>
                      </div>
                      {isOwner && (
                        <div className="flex gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => setEditingCard(card)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => setDeletingCardId(card.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Delete card dialog */}
      <Dialog open={!!deletingCardId} onOpenChange={(v) => !v && setDeletingCardId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Radera kort?</DialogTitle>
            <DialogDescription>Kortet tas bort permanent från quizet.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingCardId(null)}>Avbryt</Button>
            <Button
              variant="destructive"
              onClick={() => deletingCardId && handleDeleteCard(deletingCardId)}
            >
              Radera kort
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete quiz dialog */}
      <Dialog open={deleteQuizDialogOpen} onOpenChange={setDeleteQuizDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Radera hela quizet?</DialogTitle>
            <DialogDescription>
              Detta raderar &quot;{quiz.title}&quot; och alla {cards.length} kort permanent.
              Åtgärden kan inte ångras.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteQuizDialogOpen(false)}
              disabled={deletingQuiz}
            >
              Avbryt
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteQuiz}
              disabled={deletingQuiz}
            >
              {deletingQuiz ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" />Raderar…</>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Radera quiz
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
