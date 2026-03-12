'use client'

import { useState, useTransition } from 'react'
import { Bookmark } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface BookmarkButtonProps {
  quizId: string
  initialBookmarked: boolean
  userId: string | null
  size?: 'sm' | 'md'
}

export default function BookmarkButton({
  quizId,
  initialBookmarked,
  userId,
  size = 'sm',
}: BookmarkButtonProps) {
  const [bookmarked, setBookmarked] = useState(initialBookmarked)
  const [isPending, startTransition] = useTransition()

  function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()

    if (!userId) {
      toast.error('Du måste vara inloggad för att spara ett quiz')
      return
    }
    if (isPending) return

    const newBookmarked = !bookmarked
    setBookmarked(newBookmarked)

    startTransition(async () => {
      try {
        const res = await fetch(`/api/quizzes/${quizId}/bookmark`, { method: 'POST' })
        if (!res.ok) throw new Error()
        const data = await res.json()
        setBookmarked(data.bookmarked)
        toast.success(data.bookmarked ? 'Quiz sparat!' : 'Quiz borttaget från sparade')
      } catch {
        setBookmarked(!newBookmarked)
        toast.error('Något gick fel, försök igen')
      }
    })
  }

  const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      title={bookmarked ? 'Ta bort från sparade' : 'Spara quiz'}
      className={cn(
        'flex items-center gap-1.5 rounded-full px-2.5 py-1 transition-all duration-150 select-none border',
        bookmarked
          ? 'border-violet-300 bg-violet-50 text-violet-600 hover:bg-violet-100 dark:border-violet-700 dark:bg-violet-950/40 dark:text-violet-400 dark:hover:bg-violet-950/70'
          : 'border-border bg-transparent text-muted-foreground hover:border-violet-300 hover:bg-violet-50 hover:text-violet-600 dark:hover:border-violet-700 dark:hover:bg-violet-950/30',
        isPending && 'opacity-70 cursor-not-allowed',
        !userId && 'cursor-default'
      )}
    >
      <Bookmark
        className={cn(
          iconSize,
          'transition-all duration-150',
          bookmarked ? 'fill-current scale-110' : 'fill-none'
        )}
      />
    </button>
  )
}
