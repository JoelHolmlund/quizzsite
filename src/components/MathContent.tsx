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

// ─── Step 5 helper ────────────────────────────────────────────────────────────
// LaTeX commands that should NEVER appear in plain prose — always math.
// Includes relations, operators, functions, environments, Greek letters, etc.
const BARE_MATH_CMD_RE =
  /\\(?!begin\b|end\b)(?:frac|sqrt|sum|int|oint|prod|lim|limsup|liminf|max|min|sup|inf|det|dim|deg|gcd|ln|log|sin|cos|tan|cot|sec|csc|arcsin|arccos|arctan|sinh|cosh|tanh|exp|to|gets|rightarrow|leftarrow|leftrightarrow|Rightarrow|Leftarrow|Leftrightarrow|implies|iff|neq|leq|geq|ne|le|ge|ll|gg|approx|equiv|sim|simeq|cong|propto|in|notin|subset|supset|subseteq|supseteq|forall|exists|pm|mp|times|cdot|div|infty|partial|nabla|ldots|cdots|vdots|ddots|alpha|beta|gamma|delta|epsilon|varepsilon|zeta|eta|theta|vartheta|iota|kappa|lambda|mu|nu|xi|pi|varpi|rho|varrho|sigma|varsigma|tau|upsilon|phi|varphi|chi|psi|omega|Gamma|Delta|Theta|Lambda|Xi|Pi|Sigma|Upsilon|Phi|Psi|Omega|text|mathrm|mathbf|mathit|mathbb|mathcal|vec|hat|bar|tilde|dot|ddot|widehat|widetilde|overline|underline|left|right|mid|parallel|perp|angle|circ|quad|qquad|Re|Im|wp)\b/

/**
 * In a plain-text segment (already confirmed to be outside any $…$ block),
 * find bare LaTeX commands and wrap each command (plus attached curly-arg
 * groups and surrounding non-space chars) in $…$.
 *
 * e.g.  "a \neq b"  →  "$a$ $\neq$ $b$"  (not perfect grouping, but renders)
 *       "f(x)\neq 0" →  "$f(x)\neq$ $0$"
 *       "\text{cos}" →  "$\text{cos}$"
 */
function wrapBareLatexInSegment(segment: string): string {
  if (!BARE_MATH_CMD_RE.test(segment)) return segment
  BARE_MATH_CMD_RE.lastIndex = 0

  // Match: optional leading non-space math chars + \command + optional {arg}{arg}
  //        + optional trailing non-space chars
  // This keeps e.g. "f(x)\neq" as a single atom.
  return segment.replace(
    /[a-zA-Z0-9()\[\]^_{}'+\-.*]*\\(?!begin\b|end\b)[a-zA-Z]+(?:\{[^}]*\}(?:\{[^}]*\})?)?[a-zA-Z0-9()\[\]^_{}'+\-.]*/g,
    (match) => `$${match}$`,
  )
}

/**
 * Split `text` by existing $$…$$ and $…$ math blocks, apply
 * `wrapBareLatexInSegment` only to the plain-text parts, then rejoin.
 */
function applyBareMathFallback(text: string): string {
  // Match $$ blocks first (longer), then single $ blocks
  const mathRe = /\$\$[\s\S]*?\$\$|\$(?!\$)[^$\n]*?\$(?!\$)/g
  const segments: { text: string; isMath: boolean }[] = []
  let lastIndex = 0
  let m: RegExpExecArray | null

  while ((m = mathRe.exec(text)) !== null) {
    if (m.index > lastIndex) {
      segments.push({ text: text.slice(lastIndex, m.index), isMath: false })
    }
    segments.push({ text: m[0], isMath: true })
    lastIndex = m.index + m[0].length
  }
  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex), isMath: false })
  }

  return segments
    .map((s) => (s.isMath ? s.text : wrapBareLatexInSegment(s.text)))
    .join('')
}

// ─── Main normaliser ──────────────────────────────────────────────────────────
/**
 * Normalise various LaTeX delimiter styles so remark-math can render them.
 *
 * Steps (in order):
 *  1. \[…\]   → $$…$$           (display math)
 *  2. \(…\)   → $…$             (inline math)
 *  3. Single $…$ containing \begin{env}…\end{env} → $$…$$  (upgrade to display)
 *  4. Bare \begin{env}…\end{env} not already in $$ → $$…$$
 *  5. Remaining bare \LaTeX{} commands in plain text → $…$  (safety net)
 */
function normaliseMathDelimiters(text: string): string {
  // 1. \[…\] → $$…$$
  text = text.replace(/\\\[([\s\S]*?)\\\]/g, (_m, inner: string) => `\n$$\n${inner}\n$$\n`)

  // 2. \(…\) → $…$
  text = text.replace(/\\\(([\s\S]*?)\\\)/g, (_m, inner: string) => `$${inner}$`)

  // 3. Single $…$ containing \begin{env}…\end{env} → $$…$$
  //    (?<!\$)\$(?!\$) = lone $ not part of $$
  text = text.replace(
    /(?<!\$)\$(?!\$)([^$]*\\begin\{[^}]+\}[\s\S]*?\\end\{[^}]+\}[^$]*)(?<!\$)\$(?!\$)/g,
    (_m, inner: string) => `\n$$\n${inner}\n$$\n`,
  )

  // 4. Bare \begin{env}…\end{env} not inside any $ → $$…$$
  text = text.replace(
    /(?<!\$)(\\begin\{[^}]+\}[\s\S]*?\\end\{[^}]+\})(?!\$)/g,
    (_m, inner: string) => `\n$$\n${inner}\n$$\n`,
  )

  // 5. Safety net: wrap any remaining bare \LaTeXCommand in plain text with $…$
  text = applyBareMathFallback(text)

  return text
}

// ─── Component ────────────────────────────────────────────────────────────────
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
