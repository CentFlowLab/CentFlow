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
      user_preferences: {
        Row: {
          user_id: string;
          push_notifications: boolean;
          warranty_alerts: boolean;
          budget_alerts: boolean;
          weekly_digest: boolean;
          region: string;
          theme_id: string;
          biometrics_enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          push_notifications?: boolean;
          warranty_alerts?: boolean;
          budget_alerts?: boolean;
          weekly_digest?: boolean;
          region?: string;
          theme_id?: string;
          biometrics_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          push_notifications?: boolean;
          warranty_alerts?: boolean;
          budget_alerts?: boolean;
          weekly_digest?: boolean;
          region?: string;
          theme_id?: string;
          biometrics_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      onboarding_answers: {
        Row: {
          user_id: string;
          completed: boolean;
          completed_at: string | null;
          skipped: boolean;
          answers: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          completed?: boolean;
          completed_at?: string | null;
          skipped?: boolean;
          answers?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          completed?: boolean;
          completed_at?: string | null;
          skipped?: boolean;
          answers?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      receipt_items: {
        Row: {
          id: string;
          receipt_id: string;
          user_id: string;
          transaction_id: string | null;
          name: string;
          quantity: number | null;
          unit_price: number | null;
          total_price: number;
          category: string | null;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          receipt_id: string;
          user_id: string;
          transaction_id?: string | null;
          name: string;
          quantity?: number | null;
          unit_price?: number | null;
          total_price: number;
          category?: string | null;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          receipt_id?: string;
          user_id?: string;
          transaction_id?: string | null;
          name?: string;
          quantity?: number | null;
          unit_price?: number | null;
          total_price?: number;
          category?: string | null;
          sort_order?: number;
          created_at?: string;
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
          receipt_transaction_id: string | null;
          receipt_id: string | null;
          receipt_label: string | null;
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
          receipt_transaction_id?: string | null;
          receipt_id?: string | null;
          receipt_label?: string | null;
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
          receipt_transaction_id?: string | null;
          receipt_id?: string | null;
          receipt_label?: string | null;
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
      credits: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          outstanding_balance: number;
          next_payment_date: string | null;
          next_payment_amount: number | null;
          original_amount: number | null;
          interest_rate_annual: number | null;
          index_rate: number | null;
          spread: number | null;
          term_months: number | null;
          monthly_payment: number | null;
          insurance_monthly: number | null;
          credit_type: string | null;
          lender: string | null;
          start_date: string | null;
          monthly_income: number | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          outstanding_balance: number;
          next_payment_date?: string | null;
          next_payment_amount?: number | null;
          original_amount?: number | null;
          interest_rate_annual?: number | null;
          index_rate?: number | null;
          spread?: number | null;
          term_months?: number | null;
          monthly_payment?: number | null;
          insurance_monthly?: number | null;
          credit_type?: string | null;
          lender?: string | null;
          start_date?: string | null;
          monthly_income?: number | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          outstanding_balance?: number;
          next_payment_date?: string | null;
          next_payment_amount?: number | null;
          original_amount?: number | null;
          interest_rate_annual?: number | null;
          index_rate?: number | null;
          spread?: number | null;
          term_months?: number | null;
          monthly_payment?: number | null;
          insurance_monthly?: number | null;
          credit_type?: string | null;
          lender?: string | null;
          start_date?: string | null;
          monthly_income?: number | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          amount: number;
          billing_interval: string;
          renews_at: string | null;
          category: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          amount: number;
          billing_interval?: string;
          renews_at?: string | null;
          category?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          amount?: number;
          billing_interval?: string;
          renews_at?: string | null;
          category?: string | null;
          notes?: string | null;
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
export type CreditRow = Tables<'credits'>;
export type SubscriptionRow = Tables<'subscriptions'>;
