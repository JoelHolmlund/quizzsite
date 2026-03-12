'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Loader2, Plus } from 'lucide-react'
import { toast } from 'sonner'

interface CreateQuizDialogProps {
  userId: string
  children?: React.ReactNode
}

export default function CreateQuizDialog({ userId, children }: CreateQuizDialogProps) {
  const router = useRouter()
  const supabase = createClient()

  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setLoading(true)

    const { data, error } = await supabase
      .from('quizzes')
      .insert({
        user_id: userId,
        title: title.trim(),
        description: description.trim() || null,
        is_public: isPublic,
      })
      .select()
      .single()

    if (error) {
      toast.error('Failed to create quiz: ' + error.message)
      setLoading(false)
      return
    }

    // Store the full shareable URL so it's visible in Supabase dashboard
    const shareUrl = `${window.location.origin}/quiz/${data.id}`
    await supabase
      .from('quizzes')
      .update({ share_url: shareUrl })
      .eq('id', data.id)

    toast.success('Quiz skapad!')
    setOpen(false)
    setTitle('')
    setDescription('')
    setIsPublic(false)
    router.push(`/quiz/${data.id}`)
    router.refresh()
  }

  const trigger = children
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? React.cloneElement(children as React.ReactElement<any>, { onClick: () => setOpen(true) })
    : (
      <Button className="bg-violet-600 hover:bg-violet-700 gap-2" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        New Quiz
      </Button>
    )

  return (
    <>
      {trigger}
      <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleCreate}>
          <DialogHeader>
            <DialogTitle>Create new quiz</DialogTitle>
            <DialogDescription>
              Give your quiz a title and optional description. You can add cards after creating it.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="quiz-title">Title *</Label>
              <Input
                id="quiz-title"
                placeholder="e.g. Biology Chapter 3 – Cell Division"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quiz-description">Description</Label>
              <Textarea
                id="quiz-description"
                placeholder="Optional description of what this quiz covers…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/30">
              <div>
                <p className="text-sm font-medium">Make public</p>
                <p className="text-xs text-muted-foreground">Visible in the Explore feed</p>
              </div>
              <Switch checked={isPublic} onCheckedChange={setIsPublic} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-violet-600 hover:bg-violet-700" disabled={loading || !title.trim()}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Create quiz
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
      </Dialog>
    </>
  )
}
