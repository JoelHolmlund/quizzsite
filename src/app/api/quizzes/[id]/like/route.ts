import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/quizzes/[id]/like  — toggles like for the authenticated user
export async function POST(_request: NextRequest, { params }: RouteParams) {
  const { id: quizId } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check if the quiz exists and is accessible
  const { data: quiz } = await supabase
    .from('quizzes')
    .select('id, like_count')
    .eq('id', quizId)
    .single()

  if (!quiz) {
    return NextResponse.json({ error: 'Quiz not found' }, { status: 404 })
  }

  // Check current like status
  const { data: existingLike } = await supabase
    .from('quiz_likes')
    .select('id')
    .eq('quiz_id', quizId)
    .eq('user_id', user.id)
    .single()

  if (existingLike) {
    // Already liked — remove the like
    await supabase
      .from('quiz_likes')
      .delete()
      .eq('quiz_id', quizId)
      .eq('user_id', user.id)

    return NextResponse.json({
      liked: false,
      // Optimistic count (trigger handles actual DB count)
      like_count: Math.max((quiz.like_count as number) - 1, 0),
    })
  } else {
    // Not liked — add the like
    await supabase.from('quiz_likes').insert({
      quiz_id: quizId,
      user_id: user.id,
    })

    return NextResponse.json({
      liked: true,
      like_count: (quiz.like_count as number) + 1,
    })
  }
}

// GET /api/quizzes/[id]/like  — returns like status for the current user
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id: quizId } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ liked: false })
  }

  const { data } = await supabase
    .from('quiz_likes')
    .select('id')
    .eq('quiz_id', quizId)
    .eq('user_id', user.id)
    .single()

  return NextResponse.json({ liked: !!data })
}
