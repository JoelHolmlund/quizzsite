'use client'

import { useState, useMemo, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Checkbox } from '@/components/ui/checkbox'
import { CheckCircle2, RotateCcw, XCircle } from 'lucide-react'
import type { Card } from '@/types/database'
import { cn } from '@/lib/utils'
import MathContent from '@/components/MathContent'

interface QuizModeProps {
  cards: Card[]
}

interface QuizQuestion {
  card: Card
  options: string[]
  correctAnswers: string[]
  isMultiSelect: boolean
}

function getCorrectAnswers(card: Card): string[] {
  if (card.correct_answers && card.correct_answers.length > 0) {
    return card.correct_answers
  }
  return [card.answer]
}

function buildOptions(card: Card, allCards: Card[]): string[] {
  if (card.options && card.options.length >= 2) {
    return shuffleArray(card.options)
  }
  const distractors = allCards
    .filter((c) => c.id !== card.id && c.answer !== card.answer)
    .map((c) => c.answer)
  const selected = shuffleArray(distractors).slice(0, 3)
  return shuffleArray([card.answer, ...selected])
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function setsEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  const sa = new Set(a)
  return b.every((x) => sa.has(x))
}

export default function QuizMode({ cards }: QuizModeProps) {
  const questions: QuizQuestion[] = useMemo(
    () =>
      shuffleArray(cards).map((card) => {
        const correctAnswers = getCorrectAnswers(card)
        return {
          card,
          options: buildOptions(card, cards),
          correctAnswers,
          isMultiSelect: correctAnswers.length > 1,
        }
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  const [currentIndex, setCurrentIndex] = useState(0)

  // Single-select state
  const [selected, setSelected] = useState<string | null>(null)

  // Multi-select state
  const [multiSelected, setMultiSelected] = useState<Set<string>>(new Set())
  const [multiConfirmed, setMultiConfirmed] = useState(false)

  const [score, setScore] = useState(0)
  const [incorrects, setIncorrects] = useState<number[]>([])
  const [finished, setFinished] = useState(false)

  const current = questions[currentIndex]
  const isMultiSelect = current?.isMultiSelect ?? false

  // For single-select
  const isSingleAnswered = selected !== null
  const isSingleCorrect = selected !== null && current?.correctAnswers.includes(selected)

  // For multi-select
  const isMultiAnswered = multiConfirmed
  const isMultiCorrect =
    multiConfirmed && setsEqual(Array.from(multiSelected), current?.correctAnswers ?? [])

  const isAnswered = isMultiSelect ? isMultiAnswered : isSingleAnswered

  const handleSingleSelect = useCallback(
    (option: string) => {
      if (isSingleAnswered) return
      setSelected(option)
      if (current.correctAnswers.includes(option)) {
        setScore((s) => s + 1)
      } else {
        setIncorrects((arr) => [...arr, currentIndex])
      }
    },
    [isSingleAnswered, current, currentIndex]
  )

  const handleMultiToggle = useCallback(
    (option: string) => {
      if (multiConfirmed) return
      setMultiSelected((prev) => {
        const next = new Set(prev)
        if (next.has(option)) {
          next.delete(option)
        } else {
          next.add(option)
        }
        return next
      })
    },
    [multiConfirmed]
  )

  const handleMultiConfirm = useCallback(() => {
    if (multiSelected.size === 0) return
    setMultiConfirmed(true)
    if (setsEqual(Array.from(multiSelected), current.correctAnswers)) {
      setScore((s) => s + 1)
    } else {
      setIncorrects((arr) => [...arr, currentIndex])
    }
  }, [multiSelected, current, currentIndex])

  function handleNext() {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1)
      setSelected(null)
      setMultiSelected(new Set())
      setMultiConfirmed(false)
    } else {
      setFinished(true)
    }
  }

  function handleRestart() {
    setCurrentIndex(0)
    setSelected(null)
    setMultiSelected(new Set())
    setMultiConfirmed(false)
    setScore(0)
    setIncorrects([])
    setFinished(false)
  }

  const percentage = Math.round((score / questions.length) * 100)

  if (finished) {
    return (
      <div className="text-center space-y-6 py-8">
        <div className="space-y-2">
          <div
            className={cn(
              'inline-flex items-center justify-center w-20 h-20 rounded-full text-3xl font-bold',
              percentage >= 70
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                : 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400'
            )}
          >
            {percentage}%
          </div>
          <h2 className="text-2xl font-bold">
            {percentage === 100 ? 'Perfect Score! 🎉' : percentage >= 70 ? 'Great job! 🙌' : 'Keep practicing! 💪'}
          </h2>
          <p className="text-muted-foreground">
            You got <strong>{score}</strong> out of <strong>{questions.length}</strong> correct.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 max-w-xs mx-auto">
          <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 p-3 text-center">
            <p className="text-2xl font-bold text-emerald-600">{score}</p>
            <p className="text-xs text-muted-foreground">Correct</p>
          </div>
          <div className="rounded-xl bg-red-50 dark:bg-red-950/30 p-3 text-center">
            <p className="text-2xl font-bold text-red-500">{questions.length - score}</p>
            <p className="text-xs text-muted-foreground">Wrong</p>
          </div>
          <div className="rounded-xl bg-violet-50 dark:bg-violet-950/30 p-3 text-center">
            <p className="text-2xl font-bold text-violet-600">{questions.length}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
        </div>

        <Button onClick={handleRestart} className="bg-violet-600 hover:bg-violet-700 gap-2">
          <RotateCcw className="h-4 w-4" />
          Try again
        </Button>
      </div>
    )
  }

  if (!current) return null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">
          Question {currentIndex + 1} of {questions.length}
        </span>
        <div className="flex gap-2 text-xs">
          <Badge variant="secondary" className="gap-1 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50">
            <CheckCircle2 className="h-3 w-3" />
            {score}
          </Badge>
          <Badge variant="secondary" className="gap-1 text-red-500 bg-red-50 dark:bg-red-950/50">
            <XCircle className="h-3 w-3" />
            {incorrects.length}
          </Badge>
        </div>
      </div>

      <Progress value={(currentIndex / questions.length) * 100} className="h-1.5" />

      {/* Question */}
      <div className="rounded-2xl border-2 border-violet-200 dark:border-violet-800 bg-gradient-to-br from-violet-50 to-white dark:from-violet-950/20 dark:to-gray-900 p-8 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-violet-500">Fråga</p>
          {isMultiSelect && (
            <Badge variant="outline" className="text-xs text-violet-600 border-violet-300">
              Välj flera rätta svar
            </Badge>
          )}
        </div>
        <div className="text-xl font-semibold">
          <MathContent>{current.card.question}</MathContent>
        </div>
      </div>

      {/* Options */}
      <div className="grid gap-3">
        {current.options.map((option, i) => {
          if (isMultiSelect) {
            const isChecked = multiSelected.has(option)
            const isCorrect = current.correctAnswers.includes(option)

            let optionStyle = 'border-border hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/20'
            if (isMultiAnswered) {
              if (isCorrect) {
                optionStyle = 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400'
              } else if (isChecked && !isCorrect) {
                optionStyle = 'border-red-400 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400'
              } else {
                optionStyle = 'border-border opacity-60'
              }
            } else if (isChecked) {
              optionStyle = 'border-violet-400 bg-violet-50 dark:bg-violet-950/20'
            }

            return (
              <button
                key={i}
                type="button"
                onClick={() => handleMultiToggle(option)}
                disabled={isMultiAnswered}
                className={cn(
                  'w-full text-left rounded-xl border-2 p-4 text-sm font-medium transition-all duration-150',
                  optionStyle,
                  !isMultiAnswered && 'cursor-pointer'
                )}
              >
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={isMultiAnswered ? isCorrect : isChecked}
                    readOnly
                    className={cn(
                      'flex-shrink-0 pointer-events-none',
                      isMultiAnswered && isCorrect
                        ? 'data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500'
                        : isMultiAnswered && isChecked && !isCorrect
                        ? 'data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500'
                        : 'data-[state=checked]:bg-violet-600 data-[state=checked]:border-violet-600'
                    )}
                  />
                  <span className="flex-1 text-left">
                    <MathContent variant="compact">{option}</MathContent>
                  </span>
                  {isMultiAnswered && isCorrect && <CheckCircle2 className="h-4 w-4 ml-auto text-emerald-500 flex-shrink-0" />}
                  {isMultiAnswered && isChecked && !isCorrect && <XCircle className="h-4 w-4 ml-auto text-red-500 flex-shrink-0" />}
                </div>
              </button>
            )
          }

          // Single-select
          const isSelected = selected === option
          const isRight = current.correctAnswers.includes(option)

          let optionStyle = 'border-border hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/20'
          if (isAnswered) {
            if (isRight) {
              optionStyle = 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400'
            } else if (isSelected && !isRight) {
              optionStyle = 'border-red-400 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400'
            } else {
              optionStyle = 'border-border opacity-60'
            }
          }

          return (
            <button
              key={i}
              onClick={() => handleSingleSelect(option)}
              disabled={isAnswered}
              className={cn(
                'w-full text-left rounded-xl border-2 p-4 text-sm font-medium transition-all duration-150',
                optionStyle,
                !isAnswered && 'cursor-pointer'
              )}
            >
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    'flex-shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold',
                    isAnswered && isRight
                      ? 'border-emerald-400 bg-emerald-100 text-emerald-700'
                      : isAnswered && isSelected && !isRight
                      ? 'border-red-400 bg-red-100 text-red-600'
                      : 'border-current'
                  )}
                >
                  {['A', 'B', 'C', 'D', 'E', 'F'][i]}
                </span>
                <span className="flex-1 text-left">
                  <MathContent variant="compact">{option}</MathContent>
                </span>
                {isAnswered && isRight && <CheckCircle2 className="h-4 w-4 ml-auto text-emerald-500 flex-shrink-0" />}
                {isAnswered && isSelected && !isRight && <XCircle className="h-4 w-4 ml-auto text-red-500 flex-shrink-0" />}
              </div>
            </button>
          )
        })}
      </div>

      {/* Multi-select confirm / feedback */}
      {isMultiSelect && !isMultiAnswered && (
        <div className="flex justify-end">
          <Button
            onClick={handleMultiConfirm}
            disabled={multiSelected.size === 0}
            className="bg-violet-600 hover:bg-violet-700"
          >
            Bekräfta svar
          </Button>
        </div>
      )}

      {isMultiSelect && isMultiAnswered && (
        <div
          className={cn(
            'rounded-xl border-2 p-4 text-sm font-medium',
            isMultiCorrect
              ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700'
              : 'border-red-400 bg-red-50 dark:bg-red-950/30 text-red-600'
          )}
        >
          {isMultiCorrect ? (
            <span className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" /> Rätt! Du valde alla korrekta alternativ.
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <XCircle className="h-4 w-4" />
              Fel. Rätta svar: {current.correctAnswers.join(', ')}
            </span>
          )}
        </div>
      )}

      {isAnswered && (
        <div className="flex justify-end">
          <Button onClick={handleNext} className="bg-violet-600 hover:bg-violet-700">
            {currentIndex < questions.length - 1 ? 'Nästa fråga →' : 'Se resultat'}
          </Button>
        </div>
      )}
    </div>
  )
}
