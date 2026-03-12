'use client'

import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { cn } from '@/lib/utils'

interface MathContentProps {
  children: string
  className?: string
  // 'prose' adds paragraph spacing — good for answers; 'compact' for inline option labels
  variant?: 'prose' | 'compact'
}

/**
 * Normalise various LaTeX delimiter styles that AIs commonly produce so that
 * remark-math (which only understands $…$ and $$…$$) can render them.
 *
 * Conversions applied (in order):
 *  1. \[…\]  → $$…$$   (display math)
 *  2. \(…\)  → $…$     (inline math)
 *  3. bare \begin{…}…\end{…} blocks not already inside $…$ → $$…$$
 */
function normaliseMathDelimiters(text: string): string {
  // 1. \[…\] → $$…$$
  text = text.replace(/\\\[([\s\S]*?)\\\]/g, (_m, inner: string) => `\n$$\n${inner}\n$$\n`)

  // 2. \(…\) → $…$
  text = text.replace(/\\\(([\s\S]*?)\\\)/g, (_m, inner: string) => `$${inner}$`)

  // 3. bare \begin{env}…\end{env} not already inside $…$
  //    A simple look-around for a preceding $ is imperfect but catches the common case
  text = text.replace(
    /(?<!\$)(\\begin\{[^}]+\}[\s\S]*?\\end\{[^}]+\})(?!\$)/g,
    (_m, inner: string) => `\n$$\n${inner}\n$$\n`,
  )

  return text
}

export default function MathContent({
  children,
  className,
  variant = 'prose',
}: MathContentProps) {
  const content = normaliseMathDelimiters(children)

  return (
    <div
      className={cn(
        '[&_.katex-display]:overflow-x-auto [&_.katex-display]:py-1 [&_.katex-display]:text-center',
        '[&_.katex]:text-[1.05em]',
        className
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        // Pass normalised content instead of raw children
        // eslint-disable-next-line react/no-children-prop
        children={content}
        components={{
          p: ({ children }) => (
            <span className={cn('block', variant === 'prose' && 'leading-relaxed')}>
              {children}
            </span>
          ),
          code: ({ children }) => (
            <code className="font-mono text-[0.9em] bg-muted px-1 py-0.5 rounded">
              {children}
            </code>
          ),
          ul: ({ children }) => (
            <ul className="list-disc list-inside space-y-0.5">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside space-y-0.5">{children}</ol>
          ),
        }}
      />

    </div>
  )
}
