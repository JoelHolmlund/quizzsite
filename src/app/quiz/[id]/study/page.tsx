import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import FlashcardMode from '@/components/study/FlashcardMode'
import QuizMode from '@/components/study/QuizMode'
import { ArrowLeft, BookOpen, GraduationCap, Layers } from 'lucide-react'
import type { Quiz, Card } from '@/types/database'

interface StudyPageProps {
  params: Promise<{ id: string }>
}

export default async function StudyPage({ params }: StudyPageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: quizRaw, error: quizError } = await supabase
    .from('quizzes')
    .select('*')
    .eq('id', id)
    .single()

  if (quizError || !quizRaw) notFound()
  const quiz = quizRaw as Quiz

  const { data: cardsRaw } = await supabase
    .from('cards')
    .select('*')
    .eq('quiz_id', id)
    .order('position', { ascending: true })

  const cardList = (cardsRaw ?? []) as Card[]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b bg-white/80 dark:bg-gray-950/80 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-4">
          <Link href={`/quiz/${quiz.id}`}>
            <Button variant="ghost" size="sm" className="gap-1.5 -ml-2">
              <ArrowLeft className="h-4 w-4" />
              Back to quiz
            </Button>
          </Link>
          <Separator orientation="vertical" className="h-5" />
          <span className="font-semibold truncate flex-1">{quiz.title}</span>
          <Badge variant="outline" className="text-xs gap-1 shrink-0">
            <BookOpen className="h-3 w-3" />
            {cardList.length} cards
          </Badge>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {cardList.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <h2 className="text-lg font-semibold mb-2">No cards to study</h2>
            <p className="text-sm mb-6">Add some cards to this quiz before studying.</p>
            <Link href={`/quiz/${quiz.id}`}>
              <Button className="bg-violet-600 hover:bg-violet-700">Add cards</Button>
            </Link>
          </div>
        ) : (
          <Tabs defaultValue="flashcard" className="space-y-6">
            <div className="flex items-center justify-center">
              <TabsList className="grid w-full max-w-xs grid-cols-2">
                <TabsTrigger value="flashcard" className="gap-2">
                  <Layers className="h-4 w-4" />
                  Flashcards
                </TabsTrigger>
                <TabsTrigger value="quiz" className="gap-2">
                  <GraduationCap className="h-4 w-4" />
                  Quiz
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="flashcard">
              <FlashcardMode cards={cardList} />
            </TabsContent>

            <TabsContent value="quiz">
              {cardList.length < 2 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p className="text-sm">Quiz mode requires at least 2 cards.</p>
                </div>
              ) : (
                <QuizMode cards={cardList} />
              )}
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  )
}
