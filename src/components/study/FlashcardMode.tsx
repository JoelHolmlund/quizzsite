'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ChevronLeft, ChevronRight, RotateCcw, Shuffle } from 'lucide-react'
import type { Card } from '@/types/database'
import MathContent from '@/components/MathContent'

function ScrollableContent({
  children,
  fadeColor,
}: {
  children: React.ReactNode
  fadeColor: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [hasMore, setHasMore] = useState(false)

  function checkScroll() {
    const el = ref.current
    if (!el) return
    setHasMore(el.scrollHeight - el.scrollTop - el.clientHeight > 4)
  }

  useEffect(() => {
    checkScroll()
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(checkScroll)
    ro.observe(el)
    return () => ro.disconnect()
  })

  return (
    <div className="relative flex-1 min-h-0">
      <div
        ref={ref}
        onScroll={checkScroll}
        className="h-full overflow-y-auto px-8 py-2"
      >
        <div className="min-h-full flex flex-col items-center justify-center">
          {children}
        </div>
      </div>
      {hasMore && (
        <div
          className="pointer-events-none absolute bottom-0 left-0 right-0 h-12"
          style={{
            background: `linear-gradient(to bottom, transparent, ${fadeColor})`,
          }}
        />
      )}
    </div>
  )
}

interface FlashcardModeProps {
  cards: Card[]
}

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export default function FlashcardMode({ cards: initialCards }: FlashcardModeProps) {
  const [cards, setCards] = useState(initialCards)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [isShuffled, setIsShuffled] = useState(false)

  const current = cards[currentIndex]
  const progress = ((currentIndex + 1) / cards.length) * 100

  const goNext = useCallback(() => {
    if (currentIndex < cards.length - 1) {
      setCurrentIndex((i) => i + 1)
      setIsFlipped(false)
    }
  }, [currentIndex, cards.length])

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1)
      setIsFlipped(false)
    }
  }, [currentIndex])

  function handleShuffle() {
    setCards(shuffleArray(initialCards))
    setCurrentIndex(0)
    setIsFlipped(false)
    setIsShuffled(true)
  }

  function handleReset() {
    setCards(initialCards)
    setCurrentIndex(0)
    setIsFlipped(false)
    setIsShuffled(false)
  }

  if (!current) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p>No cards to display.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground">
            {currentIndex + 1} / {cards.length}
          </span>
          <Badge variant="outline" className="text-xs">
            {isFlipped ? 'Answer' : 'Question'}
          </Badge>
        </div>
        <div className="flex gap-2">
          {isShuffled ? (
            <Button variant="outline" size="sm" onClick={handleReset} className="gap-1.5 text-xs">
              <RotateCcw className="h-3.5 w-3.5" />
              Reset order
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={handleShuffle} className="gap-1.5 text-xs">
              <Shuffle className="h-3.5 w-3.5" />
              Shuffle
            </Button>
          )}
        </div>
      </div>

      <Progress value={progress} className="h-1.5" />

      {/* Flashcard with flip animation */}
      <div
        className="relative w-full cursor-pointer"
        style={{ perspective: '1200px', height: '320px' }}
        onClick={() => setIsFlipped((f) => !f)}
      >
        <div
          className="relative w-full h-full transition-transform duration-500"
          style={{
            transformStyle: 'preserve-3d',
            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          }}
        >
          {/* Front – Question */}
          <div
            className="absolute inset-0 flex flex-col rounded-2xl border-2 border-violet-200 dark:border-violet-800 bg-gradient-to-br from-violet-50 to-white dark:from-violet-950/30 dark:to-gray-900 shadow-lg overflow-hidden"
            style={{ backfaceVisibility: 'hidden' }}
          >
            <div className="shrink-0 px-8 pt-6 pb-2 text-center">
              <p className="text-xs font-semibold uppercase tracking-widest text-violet-500">Question</p>
            </div>
            <ScrollableContent fadeColor="rgb(245 243 255 / 0.95)">
              <div className="text-xl font-semibold text-center w-full">
                <MathContent>{current.question}</MathContent>
              </div>
            </ScrollableContent>
            <div className="shrink-0 px-8 pb-5 pt-2 text-center">
              <p className="text-xs text-muted-foreground">Click to reveal answer</p>
            </div>
          </div>

          {/* Back – Answer */}
          <div
            className="absolute inset-0 flex flex-col rounded-2xl border-2 border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/30 dark:to-gray-900 shadow-lg overflow-hidden"
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            <div className="shrink-0 px-8 pt-6 pb-2 text-center">
              <p className="text-xs font-semibold uppercase tracking-widest text-emerald-500">Answer</p>
            </div>
            <ScrollableContent fadeColor="rgb(240 253 244 / 0.95)">
              <div className="text-xl font-semibold text-center w-full">
                <MathContent>{current.answer}</MathContent>
              </div>
            </ScrollableContent>
            <div className="shrink-0 px-8 pb-5 pt-2 text-center">
              <p className="text-xs text-muted-foreground">Click to flip back</p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-center gap-4">
        <Button
          variant="outline"
          size="lg"
          className="gap-2"
          onClick={goPrev}
          disabled={currentIndex === 0}
        >
          <ChevronLeft className="h-5 w-5" />
          Previous
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="gap-2"
          onClick={goNext}
          disabled={currentIndex === cards.length - 1}
        >
          Next
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {currentIndex === cards.length - 1 && isFlipped && (
        <div className="text-center py-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
          <p className="font-semibold text-emerald-700 dark:text-emerald-400">🎉 You've reviewed all cards!</p>
          <Button variant="link" className="text-emerald-600 text-sm mt-1" onClick={handleReset}>
            Start over
          </Button>
        </div>
      )}
    </div>
  )
}
