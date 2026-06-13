/**
 * Tipos gerados a partir do schema Supabase CentFlow.
 * Regenerar após migrations:
 *   supabase gen types typescript --project-id <PROJECT_REF> > lib/supabase/database.types.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type ReceiptStatus = 'pending' | 'uploaded' | 'processing' | 'ready' | 'failed';
export type TransactionType = 'expense' | 'income';
export type OcrSource = 'mock' | 'google_vision' | 'device';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          name: string;
          currency: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name?: string;
          currency?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          currency?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      receipts: {
        Row: {
          id: string;
          user_id: string;
          storage_path: string;
          mime_type: string;
          file_name: string;
          status: ReceiptStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          storage_path: string;
          mime_type: string;
          file_name: string;
          status?: ReceiptStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          storage_path?: string;
          mime_type?: string;
          file_name?: string;
          status?: ReceiptStatus;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      ocr_results: {
        Row: {
          id: string;
          receipt_id: string;
          user_id: string;
          merchant_name: string | null;
          total_amount: number | null;
          receipt_date: string | null;
          suggested_category: string | null;
          confidence: number | null;
          raw_text: string | null;
          items: Json;
          source: OcrSource;
          created_at: string;
        };
        Insert: {
          id?: string;
          receipt_id: string;
          user_id: string;
          merchant_name?: string | null;
          total_amount?: number | null;
          receipt_date?: string | null;
          suggested_category?: string | null;
          confidence?: number | null;
          raw_text?: string | null;
          items?: Json;
          source?: OcrSource;
          created_at?: string;
        };
        Update: {
          id?: string;
          receipt_id?: string;
          user_id?: string;
          merchant_name?: string | null;
          total_amount?: number | null;
          receipt_date?: string | null;
          suggested_category?: string | null;
          confidence?: number | null;
          raw_text?: string | null;
          items?: Json;
          source?: OcrSource;
          created_at?: string;
        };
        Relationships: [];
      };
      transactions: {
        Row: {
          id: string;
          user_id: string;
          type: TransactionType;
          amount: number;
          category: string;
          description: string | null;
          transaction_date: string;
          currency: string;
          receipt_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: TransactionType;
          amount: number;
          category: string;
          description?: string | null;
          transaction_date?: string;
          currency?: string;
          receipt_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: TransactionType;
          amount?: number;
          category?: string;
          description?: string | null;
          transaction_date?: string;
          currency?: string;
          receipt_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      goals: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          target: number;
          current: number;
          currency: string;
          deadline: string | null;
          category: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          target: number;
          current?: number;
          currency?: string;
          deadline?: string | null;
          category?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          target?: number;
          current?: number;
          currency?: string;
          deadline?: string | null;
          category?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      warranties: {
        Row: {
          id: string;
          user_id: string;
          product: string;
          expires_at: string;
          purchase_date: string | null;
          store: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          product: string;
          expires_at: string;
          purchase_date?: string | null;
          store?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          product?: string;
          expires_at?: string;
          purchase_date?: string | null;
          store?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      inventory_items: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          value: number;
          category: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          value: number;
          category?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          value?: number;
          category?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];

export type Profile = Tables<'profiles'>;
export type ReceiptRow = Tables<'receipts'>;
export type OcrResultRow = Tables<'ocr_results'>;
export type TransactionRow = Tables<'transactions'>;
export type GoalRow = Tables<'goals'>;
export type WarrantyRow = Tables<'warranties'>;
export type InventoryItemRow = Tables<'inventory_items'>;
