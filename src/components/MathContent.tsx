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

export default function MathContent({
  children,
  className,
  variant = 'prose',
}: MathContentProps) {
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
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}
