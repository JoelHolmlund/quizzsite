'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { BookOpen, Globe, Lock, MoreVertical, Pencil, Share2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { Quiz } from '@/types/database'

interface QuizCardProps {
  quiz: Quiz
  showActions?: boolean
}

export default function QuizCard({ quiz, showActions = false }: QuizCardProps) {
  const router = useRouter()
  const supabase = createClient()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  function handleShare() {
    const url = `${window.location.origin}/quiz/${quiz.id}`
    navigator.clipboard.writeText(url)
    toast.success('Link copied to clipboard!')
  }

  async function handleDelete() {
    setDeleting(true)
    const { error } = await supabase.from('quizzes').delete().eq('id', quiz.id)
    if (error) {
      toast.error('Failed to delete quiz')
    } else {
      toast.success('Quiz deleted')
      router.refresh()
    }
    setDeleting(false)
    setDeleteDialogOpen(false)
  }

  const formattedDate = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(quiz.created_at))

  return (
    <>
      <Card className="group hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 border-border/60">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <Link href={`/quiz/${quiz.id}`} className="flex-1 min-w-0">
              <h3 className="font-semibold text-base leading-tight truncate group-hover:text-violet-600 transition-colors">
                {quiz.title}
              </h3>
            </Link>
            <div className="flex items-center gap-1 flex-shrink-0">
              <Badge variant={quiz.is_public ? 'default' : 'secondary'} className="text-xs gap-1">
                {quiz.is_public ? (
                  <><Globe className="h-3 w-3" /> Public</>
                ) : (
                  <><Lock className="h-3 w-3" /> Private</>
                )}
              </Badge>
              {showActions && (
                <DropdownMenu>
                  <DropdownMenuTrigger>
                    <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.preventDefault()}>
                      <MoreVertical className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => router.push(`/quiz/${quiz.id}`)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleShare}>
                      <Share2 className="mr-2 h-4 w-4" />
                      Copy link
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => setDeleteDialogOpen(true)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
          {quiz.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{quiz.description}</p>
          )}
        </CardHeader>
        <CardContent className="pb-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <BookOpen className="h-4 w-4" />
            <span>{quiz.card_count} {quiz.card_count === 1 ? 'card' : 'cards'}</span>
          </div>
        </CardContent>
        <CardFooter className="pt-0 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{formattedDate}</span>
          <div className="flex gap-2">
            <Link href={`/quiz/${quiz.id}/study`}>
              <Button size="sm" variant="outline" className="h-7 text-xs">Study</Button>
            </Link>
            <Link href={`/quiz/${quiz.id}`}>
              <Button size="sm" className="h-7 text-xs bg-violet-600 hover:bg-violet-700">View</Button>
            </Link>
          </div>
        </CardFooter>
      </Card>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete quiz?</DialogTitle>
            <DialogDescription>
              This will permanently delete &quot;{quiz.title}&quot; and all its cards. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Delete quiz'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
