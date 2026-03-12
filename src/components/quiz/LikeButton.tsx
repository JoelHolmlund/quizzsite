'use client'

import { useState, useTransition } from 'react'
import { Heart } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface LikeButtonProps {
  quizId: string
  initialLiked: boolean
  initialCount: number
  // If null, user is not logged in
  userId: string | null
  size?: 'sm' | 'md'
}

export default function LikeButton({
  quizId,
  initialLiked,
  initialCount,
  userId,
  size = 'sm',
}: LikeButtonProps) {
  const [liked, setLiked] = useState(initialLiked)
  const [count, setCount] = useState(initialCount)
  const [isPending, startTransition] = useTransition()

  function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()

    if (!userId) {
      toast.error('Du måste vara inloggad för att gilla ett quiz')
      return
    }
    if (isPending) return

    // Optimistic update
    const newLiked = !liked
    const newCount = newLiked ? count + 1 : Math.max(count - 1, 0)
    setLiked(newLiked)
    setCount(newCount)

    startTransition(async () => {
      try {
        const res = await fetch(`/api/quizzes/${quizId}/like`, { method: 'POST' })
        if (!res.ok) throw new Error()
        const data = await res.json()
        // Sync with server truth
        setLiked(data.liked)
        setCount(data.like_count)
      } catch {
        // Revert optimistic update
        setLiked(!newLiked)
        setCount(count)
        toast.error('Kunde inte gilla quizet, försök igen')
      }
    })
  }

  const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm'

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      title={liked ? 'Ta bort like' : 'Gilla detta quiz'}
      className={cn(
        'flex items-center gap-1.5 rounded-full px-2.5 py-1 transition-all duration-150 select-none',
        'border',
        liked
          ? 'border-rose-300 bg-rose-50 text-rose-500 hover:bg-rose-100 dark:border-rose-700 dark:bg-rose-950/40 dark:text-rose-400 dark:hover:bg-rose-950/70'
          : 'border-border bg-transparent text-muted-foreground hover:border-rose-300 hover:bg-rose-50 hover:text-rose-500 dark:hover:border-rose-700 dark:hover:bg-rose-950/30 dark:hover:text-rose-400',
        isPending && 'opacity-70 cursor-not-allowed',
        !userId && 'cursor-default'
      )}
    >
      <Heart
        className={cn(
          iconSize,
          'transition-all duration-150',
          liked ? 'fill-current scale-110' : 'fill-none'
        )}
      />
      {count > 0 && (
        <span className={cn(textSize, 'font-medium tabular-nums leading-none')}>
          {count}
        </span>
      )}
    </button>
  )
}
