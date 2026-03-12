export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string | null
          full_name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email?: string | null
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          full_name?: string | null
          avatar_url?: string | null
          updated_at?: string
        }
      }
      quizzes: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string | null
          is_public: boolean
          card_count: number
          like_count: number
          share_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description?: string | null
          is_public?: boolean
          card_count?: number
          like_count?: number
          share_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string | null
          is_public?: boolean
          card_count?: number
          like_count?: number
          share_url?: string | null
          updated_at?: string
        }
      }
      quiz_likes: {
        Row: {
          id: string
          quiz_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          quiz_id: string
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          quiz_id?: string
          user_id?: string
        }
      }
      cards: {
        Row: {
          id: string
          quiz_id: string
          question: string
          answer: string
          options: string[] | null
          position: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          quiz_id: string
          question: string
          answer: string
          options?: string[] | null
          position?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          quiz_id?: string
          question?: string
          answer?: string
          options?: string[] | null
          position?: number
          updated_at?: string
        }
      }
    }
  }
}

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Quiz = Database['public']['Tables']['quizzes']['Row']
export type Card = Database['public']['Tables']['cards']['Row']
export type QuizLike = Database['public']['Tables']['quiz_likes']['Row']
export type QuizInsert = Database['public']['Tables']['quizzes']['Insert']
export type CardInsert = Database['public']['Tables']['cards']['Insert']
