import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { BookOpen, Bot, Layers, Share2, Sparkles, Zap } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-blue-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* Nav */}
      <header className="border-b bg-white/60 dark:bg-gray-950/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-lg">
            <div className="bg-violet-600 text-white p-1.5 rounded-lg">
              <BookOpen className="h-4 w-4" />
            </div>
            <span>TentaKung</span>
          </div>
          <div className="flex gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">Sign in</Button>
            </Link>
            <Link href="/signup">
              <Button size="sm" className="bg-violet-600 hover:bg-violet-700">Get started free</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 py-24 text-center">
        <Badge className="mb-6 bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300 border-0 px-3 py-1">
          <Sparkles className="h-3.5 w-3.5 mr-1.5" />
          AI-Powered Flashcards
        </Badge>
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-gray-900 dark:text-white mb-6 leading-tight">
          Study smarter,<br />
          <span className="text-violet-600">not harder</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
          Upload your notes or textbook chapters and let AI instantly create flashcard decks for you. Study with flip cards or test yourself with multiple-choice quizzes.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link href="/signup">
            <Button size="lg" className="bg-violet-600 hover:bg-violet-700 gap-2 text-base px-8">
              <Zap className="h-5 w-5" />
              Start for free
            </Button>
          </Link>
          <Link href="/explore">
            <Button size="lg" variant="outline" className="gap-2 text-base px-8">
              <Layers className="h-5 w-5" />
              Explore decks
            </Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 pb-24">
        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              icon: <Bot className="h-6 w-6 text-violet-600" />,
              title: 'AI Card Generation',
              description: 'Upload a PDF or paste text and get a full flashcard deck in seconds using OpenAI.',
            },
            {
              icon: <Layers className="h-6 w-6 text-violet-600" />,
              title: 'Two Study Modes',
              description: 'Flip through cards to memorize, or take a timed MCQ quiz to test your knowledge.',
            },
            {
              icon: <Share2 className="h-6 w-6 text-violet-600" />,
              title: 'Share Anywhere',
              description: 'Share any deck via a unique URL. Publish publicly to the Explore feed or keep it private.',
            },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border bg-white dark:bg-gray-900 p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="mb-4 w-12 h-12 rounded-xl bg-violet-50 dark:bg-violet-950/50 flex items-center justify-center">
                {f.icon}
              </div>
              <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t bg-white/60 dark:bg-gray-950/60 backdrop-blur-sm py-8">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="bg-violet-600 text-white p-1 rounded-md">
              <BookOpen className="h-3 w-3" />
            </div>
            <span className="font-medium text-foreground">TentaKung</span>
          </div>
          <p>Built with Next.js, Supabase, and OpenAI</p>
        </div>
      </footer>
    </div>
  )
}
