-- Add correct_answers column to cards table
-- Supports multiple correct answers for MCQ questions.
-- When NULL: single correct answer (use the `answer` field)
-- When set: array of correct option strings (must be a subset of `options`)
ALTER TABLE cards ADD COLUMN IF NOT EXISTS correct_answers TEXT[] DEFAULT NULL;
