-- ============================================================
-- Quizzlet Database Schema
-- Run this in your Supabase SQL Editor to set up the database
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- PROFILES TABLE
-- Auto-created when a user signs up via auth trigger
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================================
-- QUIZZES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS quizzes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT FALSE NOT NULL,
  card_count INTEGER DEFAULT 0 NOT NULL,
  like_count INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================================
-- CARDS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS cards (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  -- options: for MCQ mode, array of strings e.g. ["Option A", "Option B", "Option C", "Option D"]
  -- The correct answer is always the `answer` field; options includes the correct answer + distractors
  options JSONB DEFAULT NULL,
  position INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================================
-- QUIZ LIKES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS quiz_likes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(quiz_id, user_id)
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS quizzes_user_id_idx ON quizzes(user_id);
CREATE INDEX IF NOT EXISTS quizzes_is_public_idx ON quizzes(is_public);
CREATE INDEX IF NOT EXISTS quizzes_like_count_idx ON quizzes(like_count DESC);
CREATE INDEX IF NOT EXISTS cards_quiz_id_idx ON cards(quiz_id);
CREATE INDEX IF NOT EXISTS cards_position_idx ON cards(quiz_id, position);
CREATE INDEX IF NOT EXISTS quiz_likes_quiz_id_idx ON quiz_likes(quiz_id);
CREATE INDEX IF NOT EXISTS quiz_likes_user_id_idx ON quiz_likes(user_id);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_likes ENABLE ROW LEVEL SECURITY;

-- Profiles: anyone can read profiles (needed for creator names on explore page)
-- but only the owner can write their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Anyone can view profiles" ON profiles;
CREATE POLICY "Anyone can view profiles"
  ON profiles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Quizzes: owner has full CRUD; anyone can READ any quiz by direct link.
-- "Private" only means the quiz is hidden from the Explore feed — not from direct URL access.
DROP POLICY IF EXISTS "Users can CRUD own quizzes" ON quizzes;
CREATE POLICY "Users can CRUD own quizzes"
  ON quizzes FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Public quizzes are viewable by all" ON quizzes;
DROP POLICY IF EXISTS "Anyone can view any quiz by direct link" ON quizzes;
CREATE POLICY "Anyone can view any quiz by direct link"
  ON quizzes FOR SELECT
  USING (true);

-- Cards: owner can CRUD; anyone can read cards of any quiz they can already see
DROP POLICY IF EXISTS "Users can CRUD cards in own quizzes" ON cards;
CREATE POLICY "Users can CRUD cards in own quizzes"
  ON cards FOR ALL
  USING (
    quiz_id IN (
      SELECT id FROM quizzes WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    quiz_id IN (
      SELECT id FROM quizzes WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Cards of public quizzes are viewable by all" ON cards;
DROP POLICY IF EXISTS "Anyone can view cards by direct link" ON cards;
CREATE POLICY "Anyone can view cards by direct link"
  ON cards FOR SELECT
  USING (true);

-- Quiz likes: logged-in users can like/unlike; likes are visible to all
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

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update `updated_at` on row changes
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER quizzes_updated_at
  BEFORE UPDATE ON quizzes
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER cards_updated_at
  BEFORE UPDATE ON cards
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Auto-maintain card_count on quizzes
CREATE OR REPLACE FUNCTION public.update_quiz_card_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE quizzes SET card_count = card_count + 1 WHERE id = NEW.quiz_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE quizzes SET card_count = card_count - 1 WHERE id = OLD.quiz_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE TRIGGER cards_count_trigger
  AFTER INSERT OR DELETE ON cards
  FOR EACH ROW EXECUTE FUNCTION public.update_quiz_card_count();

-- Auto-maintain like_count on quizzes
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
