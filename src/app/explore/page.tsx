import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import Navbar from '@/components/layout/Navbar'
import QuizCard from '@/components/quiz/QuizCard'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Compass, Flame, Search, Clock } from 'lucide-react'
import type { Profile, Quiz } from '@/types/database'
import type { QuizCreator } from '@/components/quiz/QuizCard'

type SortOption = 'likes' | 'newest'

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string }>
}) {
  const { q, sort: sortParam } = await searchParams
  const sort: SortOption = sortParam === 'newest' ? 'newest' : 'likes'

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profileRaw } = user
    ? await supabase.from('profiles').select('*').eq('id', user.id).single()
    : { data: null }
  const profile = profileRaw as Profile | null

  // Build query
  let query = supabase
    .from('quizzes')
    .select('*')
    .eq('is_public', true)
    .limit(60)

  if (q?.trim()) {
    query = query.ilike('title', `%${q.trim()}%`)
  }

  if (sort === 'newest') {
    query = query.order('created_at', { ascending: false })
  } else {
    // Default: most liked, then by newest within same count
    query = query
      .order('like_count', { ascending: false })
      .order('created_at', { ascending: false })
  }

  const { data: quizzesRaw } = await query
  const quizzes = (quizzesRaw ?? []) as Quiz[]

  // Fetch creator profiles for all quizzes in one query
  const creatorMap = new Map<string, QuizCreator>()
  if (quizzes.length > 0) {
    const uniqueUserIds = [...new Set(quizzes.map((q) => q.user_id))]
    const { data: creatorsRaw } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', uniqueUserIds)
    if (creatorsRaw) {
      for (const p of creatorsRaw as QuizCreator[]) {
        creatorMap.set(p.id, p)
      }
    }
  }

  // Fetch which quizzes the current user has liked (to pre-populate heart state)
  let likedQuizIds = new Set<string>()
  let bookmarkedQuizIds = new Set<string>()
  if (user && quizzes.length > 0) {
    const quizIds = quizzes.map((q) => q.id)
    const [likesRes, bookmarksRes] = await Promise.all([
      supabase.from('quiz_likes').select('quiz_id').eq('user_id', user.id).in('quiz_id', quizIds),
      supabase.from('quiz_bookmarks').select('quiz_id').eq('user_id', user.id).in('quiz_id', quizIds),
    ])
    if (likesRes.data) {
      likedQuizIds = new Set(likesRes.data.map((l: { quiz_id: string }) => l.quiz_id))
    }
    if (bookmarksRes.data) {
      bookmarkedQuizIds = new Set(bookmarksRes.data.map((b: { quiz_id: string }) => b.quiz_id))
    }
  }

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
              TentaKung
            </Link>
            <div className="flex gap-3">
              <Link href="/login">
                <Button variant="ghost" size="sm">Logga in</Button>
              </Link>
              <Link href="/signup">
                <Button size="sm" className="bg-violet-600 hover:bg-violet-700">Skapa konto</Button>
              </Link>
            </div>
          </div>
        </header>
      )}

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {/* Page header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Compass className="h-6 w-6 text-violet-600" />
            <h1 className="text-2xl font-bold">Utforska</h1>
            <Badge variant="secondary" className="ml-1">
              {quizzes.length} publika quiz
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm">
            Upptäck flashcard-quiz skapade av communityn.
          </p>
        </div>

        {/* Search + Sort bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <form method="GET" action="/explore" className="flex-1 relative">
            {/* Preserve sort param across searches */}
            {sort !== 'likes' && (
              <input type="hidden" name="sort" value={sort} />
            )}
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              name="q"
              defaultValue={q}
              placeholder="Sök quiz…"
              className="pl-9"
            />
          </form>

          {/* Sort toggle */}
          <div className="flex rounded-lg border bg-white dark:bg-gray-900 p-1 gap-1 shrink-0">
            <Link
              href={`/explore${q ? `?q=${encodeURIComponent(q)}` : ''}`}
              className="block"
            >
              <Button
                variant={sort === 'likes' ? 'default' : 'ghost'}
                size="sm"
                className={
                  sort === 'likes'
                    ? 'bg-violet-600 hover:bg-violet-700 gap-1.5'
                    : 'gap-1.5 text-muted-foreground'
                }
              >
                <Flame className="h-3.5 w-3.5" />
                Mest gillade
              </Button>
            </Link>
            <Link
              href={`/explore?sort=newest${q ? `&q=${encodeURIComponent(q)}` : ''}`}
              className="block"
            >
              <Button
                variant={sort === 'newest' ? 'default' : 'ghost'}
                size="sm"
                className={
                  sort === 'newest'
                    ? 'bg-violet-600 hover:bg-violet-700 gap-1.5'
                    : 'gap-1.5 text-muted-foreground'
                }
              >
                <Clock className="h-3.5 w-3.5" />
                Senaste
              </Button>
            </Link>
          </div>
        </div>

        {/* Results */}
        {quizzes.length > 0 ? (
          <>
            {sort === 'likes' && !q && (
              <p className="text-xs text-muted-foreground -mt-2">
                Sorterade efter antal gillningar
              </p>
            )}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {quizzes.map((quiz) => (
                <QuizCard
                  key={quiz.id}
                  quiz={quiz}
                  showActions={false}
                  userId={user?.id ?? null}
                  liked={likedQuizIds.has(quiz.id)}
                  bookmarked={bookmarkedQuizIds.has(quiz.id)}
                  creator={creatorMap.get(quiz.user_id) ?? null}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-20 text-muted-foreground">
            <Compass className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <h2 className="text-lg font-semibold mb-1">
              {q ? `Inga resultat för "${q}"` : 'Inga publika quiz ännu'}
            </h2>
            <p className="text-sm">
              {q ? 'Prova ett annat sökord.' : 'Bli den första att publicera ett quiz!'}
            </p>
            {!user && (
              <Link href="/signup" className="mt-4 inline-block">
                <Button className="bg-violet-600 hover:bg-violet-700 mt-4">
                  Skapa konto gratis
                </Button>
              </Link>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
