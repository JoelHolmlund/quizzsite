-- ============================================================
-- Migration: Add likes feature
-- Run this if you already have the base schema set up.
-- ============================================================

-- 1. Add like_count column to quizzes
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0 NOT NULL;

-- 2. Create quiz_likes table
CREATE TABLE IF NOT EXISTS quiz_likes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(quiz_id, user_id)
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS quizzes_like_count_idx ON quizzes(like_count DESC);
CREATE INDEX IF NOT EXISTS quiz_likes_quiz_id_idx ON quiz_likes(quiz_id);
CREATE INDEX IF NOT EXISTS quiz_likes_user_id_idx ON quiz_likes(user_id);

-- 4. RLS
ALTER TABLE quiz_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view likes" ON quiz_likes;
CREATE POLICY "Anyone can view likes"
  ON quiz_likes FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS "Users can like quizzes" ON quiz_likes;
CREATE POLICY "Users can like quizzes"
  ON quiz_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can unlike quizzes" ON quiz_likes;
CREATE POLICY "Users can unlike quizzes"
  ON quiz_likes FOR DELETE
  USING (auth.uid() = user_id);

-- 5. Trigger to auto-maintain like_count
CREATE OR REPLACE FUNCTION public.update_quiz_like_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE quizzes SET like_count = like_count + 1 WHERE id = NEW.quiz_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE quizzes SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.quiz_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE TRIGGER quiz_likes_count_trigger
  AFTER INSERT OR DELETE ON quiz_likes
  FOR EACH ROW EXECUTE FUNCTION public.update_quiz_like_count();

-- 6. Backfill like_count for existing rows (should be 0 for new installs)
UPDATE quizzes SET like_count = (
  SELECT COUNT(*) FROM quiz_likes WHERE quiz_likes.quiz_id = quizzes.id
);
