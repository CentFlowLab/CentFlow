export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      app_config: {
        Row: {
          force_update_required: boolean
          id: string
          latest_version: string
          maintenance_mode: boolean
          minimum_supported_version: string
          store_url_android: string | null
          store_url_ios: string | null
          update_message: string | null
          updated_at: string
        }
        Insert: {
          force_update_required?: boolean
          id?: string
          latest_version?: string
          maintenance_mode?: boolean
          minimum_supported_version?: string
          store_url_android?: string | null
          store_url_ios?: string | null
          update_message?: string | null
          updated_at?: string
        }
        Update: {
          force_update_required?: boolean
          id?: string
          latest_version?: string
          maintenance_mode?: boolean
          minimum_supported_version?: string
          store_url_android?: string | null
          store_url_ios?: string | null
          update_message?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      category_budgets: {
        Row: {
          category: string
          created_at: string
          id: string
          monthly_limit: number
          source: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          monthly_limit: number
          source?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          monthly_limit?: number
          source?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      credits: {
        Row: {
          commission_rate_early_repayment: number | null
          created_at: string
          credit_type: string | null
          id: string
          index_rate: number | null
          insurance_monthly: number | null
          interest_rate_annual: number | null
          lender: string | null
          monthly_income: number | null
          monthly_payment: number | null
          name: string
          next_payment_amount: number | null
          next_payment_date: string | null
          notes: string | null
          original_amount: number | null
          outstanding_balance: number
          spread: number | null
          start_date: string | null
          term_months: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          commission_rate_early_repayment?: number | null
          created_at?: string
          credit_type?: string | null
          id?: string
          index_rate?: number | null
          insurance_monthly?: number | null
          interest_rate_annual?: number | null
          lender?: string | null
          monthly_income?: number | null
          monthly_payment?: number | null
          name: string
          next_payment_amount?: number | null
          next_payment_date?: string | null
          notes?: string | null
          original_amount?: number | null
          outstanding_balance: number
          spread?: number | null
          start_date?: string | null
          term_months?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          commission_rate_early_repayment?: number | null
          created_at?: string
          credit_type?: string | null
          id?: string
          index_rate?: number | null
          insurance_monthly?: number | null
          interest_rate_annual?: number | null
          lender?: string | null
          monthly_income?: number | null
          monthly_payment?: number | null
          name?: string
          next_payment_amount?: number | null
          next_payment_date?: string | null
          notes?: string | null
          original_amount?: number | null
          outstanding_balance?: number
          spread?: number | null
          start_date?: string | null
          term_months?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      loan_payments: {
        Row: {
          account_id: string | null
          amount: number
          created_at: string
          credit_id: string
          fees_amount: number | null
          id: string
          interest_amount: number | null
          note: string | null
          paid_at: string
          principal_amount: number | null
          type: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          created_at?: string
          credit_id: string
          fees_amount?: number | null
          id?: string
          interest_amount?: number | null
          note?: string | null
          paid_at?: string
          principal_amount?: number | null
          type: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          created_at?: string
          credit_id?: string
          fees_amount?: number | null
          id?: string
          interest_amount?: number | null
          note?: string | null
          paid_at?: string
          principal_amount?: number | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loan_payments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loan_payments_credit_id_fkey"
            columns: ["credit_id"]
            isOneToOne: false
            referencedRelation: "credits"
            referencedColumns: ["id"]
          },
        ]
      }
      email_events: {
        Row: {
          email_type: string
          error: string | null
          id: string
          metadata: Json
          provider_message_id: string | null
          sent_at: string
          status: string
          user_id: string
        }
        Insert: {
          email_type: string
          error?: string | null
          id?: string
          metadata?: Json
          provider_message_id?: string | null
          sent_at?: string
          status?: string
          user_id: string
        }
        Update: {
          email_type?: string
          error?: string | null
          id?: string
          metadata?: Json
          provider_message_id?: string | null
          sent_at?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      accounts: {
        Row: {
          bank: string | null
          budget_enabled: boolean | null
          color: string | null
          created_at: string
          currency: string
          icon: string | null
          id: string
          initial_balance: number
          institution: string | null
          is_active: boolean
          name: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bank?: string | null
          budget_enabled?: boolean | null
          color?: string | null
          created_at?: string
          currency?: string
          icon?: string | null
          id?: string
          initial_balance?: number
          institution?: string | null
          is_active?: boolean
          name: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bank?: string | null
          budget_enabled?: boolean | null
          color?: string | null
          created_at?: string
          currency?: string
          icon?: string | null
          id?: string
          initial_balance?: number
          institution?: string | null
          is_active?: boolean
          name?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      goal_contributions: {
        Row: {
          account_id: string | null
          amount: number
          created_at: string
          goal_id: string
          id: string
          kind: string
          note: string | null
          user_id: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          created_at?: string
          goal_id: string
          id?: string
          kind?: string
          note?: string | null
          user_id: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          created_at?: string
          goal_id?: string
          id?: string
          kind?: string
          note?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_contributions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goal_contributions_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          category: string | null
          created_at: string
          currency: string
          current: number
          deadline: string | null
          id: string
          name: string
          target: number
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          currency?: string
          current?: number
          deadline?: string | null
          id?: string
          name: string
          target: number
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          currency?: string
          current?: number
          deadline?: string | null
          id?: string
          name?: string
          target?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      inventory_items: {
        Row: {
          category: string | null
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
          value: number
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
          value: number
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
          value?: number
        }
        Relationships: []
      }
      ocr_results: {
        Row: {
          confidence: number | null
          created_at: string
          id: string
          items: Json
          merchant_name: string | null
          raw_text: string | null
          receipt_date: string | null
          receipt_id: string
          source: string
          suggested_category: string | null
          total_amount: number | null
          user_id: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          id?: string
          items?: Json
          merchant_name?: string | null
          raw_text?: string | null
          receipt_date?: string | null
          receipt_id: string
          source?: string
          suggested_category?: string | null
          total_amount?: number | null
          user_id: string
        }
        Update: {
          confidence?: number | null
          created_at?: string
          id?: string
          items?: Json
          merchant_name?: string | null
          raw_text?: string | null
          receipt_date?: string | null
          receipt_id?: string
          source?: string
          suggested_category?: string | null
          total_amount?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ocr_results_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "receipts"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_answers: {
        Row: {
          answers: Json
          completed: boolean
          completed_at: string | null
          created_at: string
          skipped: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          answers?: Json
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          skipped?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          answers?: Json
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          skipped?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          currency: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          id: string
          name?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      receipt_items: {
        Row: {
          category: string | null
          created_at: string
          id: string
          name: string
          quantity: number | null
          receipt_id: string
          sort_order: number
          total_price: number
          transaction_id: string | null
          unit_price: number | null
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          name: string
          quantity?: number | null
          receipt_id: string
          sort_order?: number
          total_price: number
          transaction_id?: string | null
          unit_price?: number | null
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          name?: string
          quantity?: number | null
          receipt_id?: string
          sort_order?: number
          total_price?: number
          transaction_id?: string | null
          unit_price?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "receipt_items_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipt_items_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      receipts: {
        Row: {
          created_at: string
          file_name: string
          id: string
          mime_type: string
          status: string
          storage_path: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          id?: string
          mime_type: string
          status?: string
          storage_path: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          id?: string
          mime_type?: string
          status?: string
          storage_path?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          amount: number
          billing_interval: string
          category: string | null
          created_at: string
          id: string
          last_reviewed_at: string | null
          name: string
          notes: string | null
          renews_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          billing_interval?: string
          category?: string | null
          created_at?: string
          id?: string
          last_reviewed_at?: string | null
          name: string
          notes?: string | null
          renews_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          billing_interval?: string
          category?: string | null
          created_at?: string
          id?: string
          last_reviewed_at?: string | null
          name?: string
          notes?: string | null
          renews_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          account_id: string | null
          amount: number
          budget_month: string | null
          category: string
          created_at: string
          currency: string
          description: string | null
          destination_account_id: string | null
          credit_id: string | null
          related_transaction_id: string | null
          recurring_id: string | null
          id: string
          receipt_id: string | null
          transaction_date: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          budget_month?: string | null
          category: string
          created_at?: string
          currency?: string
          description?: string | null
          destination_account_id?: string | null
          credit_id?: string | null
          related_transaction_id?: string | null
          recurring_id?: string | null
          id?: string
          receipt_id?: string | null
          transaction_date?: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          budget_month?: string | null
          category?: string
          created_at?: string
          currency?: string
          description?: string | null
          destination_account_id?: string | null
          credit_id?: string | null
          related_transaction_id?: string | null
          recurring_id?: string | null
          id?: string
          receipt_id?: string | null
          transaction_date?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "receipts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          biometrics_enabled: boolean
          budget_alerts: boolean
          category_spend_alert_threshold: number
          category_spend_alerts: boolean
          created_at: string
          email_credit_payments: boolean
          email_important: boolean
          email_subscription_renewals: boolean
          email_tips_insights: boolean
          email_warranty_alerts: boolean
          email_weekly_digest: boolean
          prioritize_debt_amortization: boolean
          push_notifications: boolean
          region: string
          theme_id: string
          updated_at: string
          user_id: string
          warranty_alerts: boolean
          weekly_digest: boolean
        }
        Insert: {
          biometrics_enabled?: boolean
          budget_alerts?: boolean
          category_spend_alert_threshold?: number
          category_spend_alerts?: boolean
          created_at?: string
          email_credit_payments?: boolean
          email_important?: boolean
          email_subscription_renewals?: boolean
          email_tips_insights?: boolean
          email_warranty_alerts?: boolean
          email_weekly_digest?: boolean
          prioritize_debt_amortization?: boolean
          push_notifications?: boolean
          region?: string
          theme_id?: string
          updated_at?: string
          user_id: string
          warranty_alerts?: boolean
          weekly_digest?: boolean
        }
        Update: {
          biometrics_enabled?: boolean
          budget_alerts?: boolean
          category_spend_alert_threshold?: number
          category_spend_alerts?: boolean
          created_at?: string
          email_credit_payments?: boolean
          email_important?: boolean
          email_subscription_renewals?: boolean
          email_tips_insights?: boolean
          email_warranty_alerts?: boolean
          email_weekly_digest?: boolean
          prioritize_debt_amortization?: boolean
          push_notifications?: boolean
          region?: string
          theme_id?: string
          updated_at?: string
          user_id?: string
          warranty_alerts?: boolean
          weekly_digest?: boolean
        }
        Relationships: []
      }
      warranties: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          notes: string | null
          product: string
          purchase_date: string | null
          receipt_id: string | null
          receipt_label: string | null
          receipt_transaction_id: string | null
          store: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          notes?: string | null
          product: string
          purchase_date?: string | null
          receipt_id?: string | null
          receipt_label?: string | null
          receipt_transaction_id?: string | null
          store?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          notes?: string | null
          product?: string
          purchase_date?: string | null
          receipt_id?: string | null
          receipt_label?: string | null
          receipt_transaction_id?: string | null
          store?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      user_has_any_financial_data: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      user_last_activity: { Args: { p_user_id: string }; Returns: string }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null
          avif_autodetection: boolean | null
          created_at: string | null
          file_size_limit: number | null
          id: string
          name: string
          owner: string | null
          owner_id: string | null
          public: boolean | null
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string | null
        }
        Insert: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id: string
          name: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Update: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id?: string
          name?: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Relationships: []
      }
      buckets_analytics: {
        Row: {
          created_at: string
          deleted_at: string | null
          format: string
          id: string
          name: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      buckets_vectors: {
        Row: {
          created_at: string
          id: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      migrations: {
        Row: {
          executed_at: string | null
          hash: string
          id: number
          name: string
        }
        Insert: {
          executed_at?: string | null
          hash: string
          id: number
          name: string
        }
        Update: {
          executed_at?: string | null
          hash?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      objects: {
        Row: {
          bucket_id: string | null
          created_at: string | null
          id: string
          last_accessed_at: string | null
          metadata: Json | null
          name: string | null
          owner: string | null
          owner_id: string | null
          path_tokens: string[] | null
          updated_at: string | null
          user_metadata: Json | null
          version: string | null
        }
        Insert: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Update: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "objects_bucketId_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads: {
        Row: {
          bucket_id: string
          created_at: string
          id: string
          in_progress_size: number
          key: string
          metadata: Json | null
          owner_id: string | null
          upload_signature: string
          user_metadata: Json | null
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          id: string
          in_progress_size?: number
          key: string
          metadata?: Json | null
          owner_id?: string | null
          upload_signature: string
          user_metadata?: Json | null
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          id?: string
          in_progress_size?: number
          key?: string
          metadata?: Json | null
          owner_id?: string | null
          upload_signature?: string
          user_metadata?: Json | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads_parts: {
        Row: {
          bucket_id: string
          created_at: string
          etag: string
          id: string
          key: string
          owner_id: string | null
          part_number: number
          size: number
          upload_id: string
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          etag: string
          id?: string
          key: string
          owner_id?: string | null
          part_number: number
          size?: number
          upload_id: string
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          etag?: string
          id?: string
          key?: string
          owner_id?: string | null
          part_number?: number
          size?: number
          upload_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_parts_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "s3_multipart_uploads_parts_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "s3_multipart_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      vector_indexes: {
        Row: {
          bucket_id: string
          created_at: string
          data_type: string
          dimension: number
          distance_metric: string
          id: string
          metadata_configuration: Json | null
          name: string
          updated_at: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          data_type: string
          dimension: number
          distance_metric: string
          id?: string
          metadata_configuration?: Json | null
          name: string
          updated_at?: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          data_type?: string
          dimension?: number
          distance_metric?: string
          id?: string
          metadata_configuration?: Json | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vector_indexes_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets_vectors"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      allow_any_operation: {
        Args: { expected_operations: string[] }
        Returns: boolean
      }
      allow_only_operation: {
        Args: { expected_operation: string }
        Returns: boolean
      }
      can_insert_object: {
        Args: { bucketid: string; metadata: Json; name: string; owner: string }
        Returns: undefined
      }
      extension: { Args: { name: string }; Returns: string }
      filename: { Args: { name: string }; Returns: string }
      foldername: { Args: { name: string }; Returns: string[] }
      get_common_prefix: {
        Args: { p_delimiter: string; p_key: string; p_prefix: string }
        Returns: string
      }
      get_size_by_bucket: {
        Args: never
        Returns: {
          bucket_id: string
          size: number
        }[]
      }
      list_multipart_uploads_with_delimiter: {
        Args: {
          bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_key_token?: string
          next_upload_token?: string
          prefix_param: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
        }[]
      }
      list_objects_with_delimiter: {
        Args: {
          _bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_token?: string
          prefix_param: string
          sort_order?: string
          start_after?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      operation: { Args: never; Returns: string }
      search: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_by_timestamp: {
        Args: {
          p_bucket_id: string
          p_level: number
          p_limit: number
          p_prefix: string
          p_sort_column: string
          p_sort_column_after: string
          p_sort_order: string
          p_start_after: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_v2: {
        Args: {
          bucket_name: string
          levels?: number
          limits?: number
          prefix: string
          sort_column?: string
          sort_column_after?: string
          sort_order?: string
          start_after?: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
    }
    Enums: {
      buckettype: "STANDARD" | "ANALYTICS" | "VECTOR"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
  storage: {
    Enums: {
      buckettype: ["STANDARD", "ANALYTICS", "VECTOR"],
    },
  },
} as const

export type Profile = Tables<"profiles">
export type ReceiptRow = Tables<"receipts">
export type OcrResultRow = Tables<"ocr_results">
export type TransactionRow = Tables<"transactions">
export type ReceiptStatus = ReceiptRow["status"]
export type TransactionType = TransactionRow["type"]
export type OcrSource = OcrResultRow["source"]
