import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/quizzes/[id]/bookmark — toggles bookmark for the authenticated user
export async function POST(_request: NextRequest, { params }: RouteParams) {
  const { id: quizId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: existing } = await supabase
    .from('quiz_bookmarks')
    .select('id')
    .eq('quiz_id', quizId)
    .eq('user_id', user.id)
    .single()

  if (existing) {
    await supabase
      .from('quiz_bookmarks')
      .delete()
      .eq('quiz_id', quizId)
      .eq('user_id', user.id)
    return NextResponse.json({ bookmarked: false })
  } else {
    await supabase.from('quiz_bookmarks').insert({ quiz_id: quizId, user_id: user.id })
    return NextResponse.json({ bookmarked: true })
  }
}
