'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ChevronLeft, ChevronRight, RotateCcw, Shuffle } from 'lucide-react'
import type { Card } from '@/types/database'

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
            className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl border-2 border-violet-200 dark:border-violet-800 bg-gradient-to-br from-violet-50 to-white dark:from-violet-950/30 dark:to-gray-900 p-8 shadow-lg"
            style={{ backfaceVisibility: 'hidden' }}
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-violet-500 mb-4">Question</p>
            <p className="text-xl font-semibold text-center leading-relaxed">{current.question}</p>
            <p className="text-xs text-muted-foreground mt-6">Click to reveal answer</p>
          </div>

          {/* Back – Answer */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl border-2 border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/30 dark:to-gray-900 p-8 shadow-lg"
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-500 mb-4">Answer</p>
            <p className="text-xl font-semibold text-center leading-relaxed">{current.answer}</p>
            <p className="text-xs text-muted-foreground mt-6">Click to flip back</p>
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
