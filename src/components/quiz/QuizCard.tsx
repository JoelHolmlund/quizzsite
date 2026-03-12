'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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
import LikeButton from '@/components/quiz/LikeButton'
import { BookOpen, Globe, Lock, MoreVertical, Pencil, Share2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { Quiz } from '@/types/database'

export interface QuizCreator {
  id: string
  full_name: string | null
  avatar_url: string | null
}

interface QuizCardProps {
  quiz: Quiz
  showActions?: boolean
  userId?: string | null
  liked?: boolean
  creator?: QuizCreator | null
}

export default function QuizCard({
  quiz,
  showActions = false,
  userId = null,
  liked = false,
  creator = null,
}: QuizCardProps) {
  const router = useRouter()
  const supabase = createClient()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  function handleShare() {
    const url = `${window.location.origin}/quiz/${quiz.id}`
    navigator.clipboard.writeText(url)
    toast.success('Länk kopierad!')
  }

  async function handleDelete() {
    setDeleting(true)
    const { error } = await supabase.from('quizzes').delete().eq('id', quiz.id)
    if (error) {
      toast.error('Kunde inte radera quizet')
    } else {
      toast.success('Quiz raderat')
      router.refresh()
    }
    setDeleting(false)
    setDeleteDialogOpen(false)
  }

  const formattedDate = new Intl.DateTimeFormat('sv-SE', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(quiz.created_at))

  const creatorName = creator?.full_name ?? 'Okänd'
  const creatorInitials = creatorName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  // Show "Du" if the card belongs to the logged-in user
  const isOwn = userId != null && userId === quiz.user_id
  const displayName = isOwn ? 'Du' : creatorName

  return (
    <>
      <Card className="group hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 border-border/60 flex flex-col">
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
                  <><Globe className="h-3 w-3" /> Publik</>
                ) : (
                  <><Lock className="h-3 w-3" /> Privat</>
                )}
              </Badge>
              {showActions && (
                <DropdownMenu>
                  <DropdownMenuTrigger>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => e.preventDefault()}
                    >
                      <MoreVertical className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => router.push(`/quiz/${quiz.id}`)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Redigera
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleShare}>
                      <Share2 className="mr-2 h-4 w-4" />
                      Kopiera länk
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => setDeleteDialogOpen(true)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Radera
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

        <CardContent className="pb-3 flex-1">
          {/* Creator row */}
          {creator && (
            <div className="flex items-center gap-2 mb-2.5">
              <Avatar className="h-5 w-5">
                <AvatarImage src={creator.avatar_url ?? undefined} alt={creatorName} />
                <AvatarFallback className="text-[9px] font-semibold bg-violet-100 text-violet-700">
                  {creatorInitials}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-muted-foreground truncate">
                {isOwn ? (
                  <span className="text-violet-600 font-medium">Du</span>
                ) : (
                  displayName
                )}
              </span>
            </div>
          )}

          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <BookOpen className="h-3.5 w-3.5" />
            <span>{quiz.card_count} kort</span>
          </div>
        </CardContent>

        <CardFooter className="pt-0 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{formattedDate}</span>
            {quiz.is_public && (
              <LikeButton
                quizId={quiz.id}
                initialLiked={liked}
                initialCount={quiz.like_count ?? 0}
                userId={userId}
                size="sm"
              />
            )}
          </div>
          <div className="flex gap-2">
            <Link href={`/quiz/${quiz.id}/study`}>
              <Button size="sm" variant="outline" className="h-7 text-xs">Studera</Button>
            </Link>
            <Link href={`/quiz/${quiz.id}`}>
              <Button size="sm" className="h-7 text-xs bg-violet-600 hover:bg-violet-700">Visa</Button>
            </Link>
          </div>
        </CardFooter>
      </Card>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Radera quiz?</DialogTitle>
            <DialogDescription>
              Detta raderar &quot;{quiz.title}&quot; och alla dess kort permanent. Åtgärden kan inte ångras.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Avbryt</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Raderar…' : 'Radera quiz'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
