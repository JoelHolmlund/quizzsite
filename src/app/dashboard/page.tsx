import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Navbar from '@/components/layout/Navbar'
import QuizCard from '@/components/quiz/QuizCard'
import CreateQuizDialog from '@/components/quiz/CreateQuizDialog'
import { Button } from '@/components/ui/button'
import { BookOpen, Plus } from 'lucide-react'
import type { Profile, Quiz } from '@/types/database'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profileData } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()
  const profile = profileData as Profile | null

  const { data: quizzesData } = await supabase
    .from('quizzes')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
  const quizzes = quizzesData as Quiz[] | null

  const firstName = profile?.full_name?.split(' ')[0] ?? 'there'

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar profile={profile} />

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Welcome back, {firstName}! 👋
            </h1>
            <p className="text-muted-foreground mt-1">
              {quizzes?.length
                ? `You have ${quizzes.length} quiz${quizzes.length === 1 ? '' : 'zes'}`
                : 'Create your first quiz to get started'}
            </p>
          </div>
          <CreateQuizDialog userId={user.id} />
        </div>

        {/* Stats row */}
        {quizzes && quizzes.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {
                label: 'Total Quizzes',
                value: quizzes.length,
                color: 'text-violet-600',
                bg: 'bg-violet-50 dark:bg-violet-950/30',
              },
              {
                label: 'Total Cards',
                value: quizzes.reduce((sum, q) => sum + q.card_count, 0),
                color: 'text-blue-600',
                bg: 'bg-blue-50 dark:bg-blue-950/30',
              },
              {
                label: 'Public',
                value: quizzes.filter((q) => q.is_public).length,
                color: 'text-emerald-600',
                bg: 'bg-emerald-50 dark:bg-emerald-950/30',
              },
              {
                label: 'Private',
                value: quizzes.filter((q) => !q.is_public).length,
                color: 'text-orange-600',
                bg: 'bg-orange-50 dark:bg-orange-950/30',
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className={`rounded-xl ${stat.bg} p-4 border border-transparent`}
              >
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Quiz grid */}
        {quizzes && quizzes.length > 0 ? (
          <div>
            <h2 className="text-lg font-semibold mb-4">Your quizzes</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {quizzes.map((quiz) => (
                <QuizCard key={quiz.id} quiz={quiz} showActions />
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 rounded-2xl border-2 border-dashed border-border bg-white dark:bg-gray-900 text-center px-4">
            <div className="w-16 h-16 rounded-full bg-violet-50 dark:bg-violet-950/50 flex items-center justify-center mb-4">
              <BookOpen className="h-8 w-8 text-violet-400" />
            </div>
            <h3 className="text-lg font-semibold mb-1">No quizzes yet</h3>
            <p className="text-muted-foreground text-sm mb-6 max-w-xs">
              Create your first quiz manually or let AI generate flashcards from your study material.
            </p>
            <CreateQuizDialog userId={user.id}>
              <Button className="bg-violet-600 hover:bg-violet-700 gap-2">
                <Plus className="h-4 w-4" />
                Create your first quiz
              </Button>
            </CreateQuizDialog>
          </div>
        )}
      </main>
    </div>
  )
}
