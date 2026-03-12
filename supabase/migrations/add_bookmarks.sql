-- ============================================================
-- Migration: Add bookmarks feature
-- Run this in Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS quiz_bookmarks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(quiz_id, user_id)
);

CREATE INDEX IF NOT EXISTS quiz_bookmarks_quiz_id_idx ON quiz_bookmarks(quiz_id);
CREATE INDEX IF NOT EXISTS quiz_bookmarks_user_id_idx ON quiz_bookmarks(user_id);

ALTER TABLE quiz_bookmarks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own bookmarks" ON quiz_bookmarks;
CREATE POLICY "Users can view own bookmarks"
  ON quiz_bookmarks FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can add bookmarks" ON quiz_bookmarks;
CREATE POLICY "Users can add bookmarks"
  ON quiz_bookmarks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can remove bookmarks" ON quiz_bookmarks;
CREATE POLICY "Users can remove bookmarks"
  ON quiz_bookmarks FOR DELETE
  USING (auth.uid() = user_id);
