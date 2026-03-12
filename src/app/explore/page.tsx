import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import Navbar from '@/components/layout/Navbar'
import QuizCard from '@/components/quiz/QuizCard'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Compass, Search } from 'lucide-react'
import type { Profile, Quiz } from '@/types/database'

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profileRaw } = user
    ? await supabase.from('profiles').select('*').eq('id', user.id).single()
    : { data: null }
  const profile = profileRaw as Profile | null

  let query = supabase
    .from('quizzes')
    .select('*')
    .eq('is_public', true)
    .order('updated_at', { ascending: false })
    .limit(50)

  if (q?.trim()) {
    query = query.ilike('title', `%${q.trim()}%`)
  }

  const { data: quizzesRaw } = await query
  const quizzes = quizzesRaw as Quiz[] | null

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {user ? (
        <Navbar profile={profile} />
      ) : (
        <header className="sticky top-0 z-50 border-b bg-white/80 dark:bg-gray-950/80 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 font-bold text-lg">
              <div className="bg-violet-600 text-white p-1.5 rounded-lg">
                <Compass className="h-4 w-4" />
              </div>
              Quizzlet
            </Link>
            <div className="flex gap-3">
              <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">Sign in</Link>
            </div>
          </div>
        </header>
      )}

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Compass className="h-6 w-6 text-violet-600" />
            <h1 className="text-2xl font-bold">Explore</h1>
            <Badge variant="secondary" className="ml-1">{quizzes?.length ?? 0} public decks</Badge>
          </div>
          <p className="text-muted-foreground">Discover flashcard decks created by the community.</p>
        </div>

        {/* Search */}
        <form method="GET" action="/explore" className="max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              name="q"
              defaultValue={q}
              placeholder="Search decks…"
              className="pl-9"
            />
          </div>
        </form>

        {quizzes && quizzes.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {quizzes.map((quiz) => (
              <QuizCard key={quiz.id} quiz={quiz} showActions={false} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 text-muted-foreground">
            <Compass className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <h2 className="text-lg font-semibold mb-1">
              {q ? `No results for "${q}"` : 'No public decks yet'}
            </h2>
            <p className="text-sm">
              {q ? 'Try a different search term.' : 'Be the first to publish a deck!'}
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
