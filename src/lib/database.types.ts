export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type UserRole = 'admin' | 'accountant' | 'viewer'
export type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense'
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
export type BillStatus = 'draft' | 'received' | 'paid' | 'overdue' | 'cancelled'
export type TransactionType = 'income' | 'expense' | 'transfer' | 'journal'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          role: UserRole
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
      }
      accounts: {
        Row: {
          id: string
          code: string
          name: string
          type: AccountType
          parent_id: string | null
          description: string | null
          is_active: boolean
          balance: number
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['accounts']['Row'], 'id' | 'created_at' | 'updated_at' | 'balance'>
        Update: Partial<Database['public']['Tables']['accounts']['Insert']>
      }
      contacts: {
        Row: {
          id: string
          name: string
          email: string | null
          phone: string | null
          address: string | null
          type: 'customer' | 'vendor' | 'both'
          tax_number: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['contacts']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['contacts']['Insert']>
      }
      invoices: {
        Row: {
          id: string
          number: string
          contact_id: string
          issue_date: string
          due_date: string
          status: InvoiceStatus
          subtotal: number
          tax_amount: number
          total: number
          notes: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['invoices']['Row'], 'id' | 'created_at' | 'updated_at' | 'number'>
        Update: Partial<Database['public']['Tables']['invoices']['Insert']>
      }
      invoice_items: {
        Row: {
          id: string
          invoice_id: string
          description: string
          quantity: number
          unit_price: number
          tax_rate: number
          amount: number
        }
        Insert: Omit<Database['public']['Tables']['invoice_items']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['invoice_items']['Insert']>
      }
      bills: {
        Row: {
          id: string
          number: string
          contact_id: string
          issue_date: string
          due_date: string
          status: BillStatus
          subtotal: number
          tax_amount: number
          total: number
          notes: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['bills']['Row'], 'id' | 'created_at' | 'updated_at' | 'number'>
        Update: Partial<Database['public']['Tables']['bills']['Insert']>
      }
      bill_items: {
        Row: {
          id: string
          bill_id: string
          description: string
          quantity: number
          unit_price: number
          tax_rate: number
          amount: number
        }
        Insert: Omit<Database['public']['Tables']['bill_items']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['bill_items']['Insert']>
      }
      journal_entries: {
        Row: {
          id: string
          number: string
          date: string
          description: string
          reference: string | null
          total_debit: number
          total_credit: number
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['journal_entries']['Row'], 'id' | 'created_at' | 'updated_at' | 'number'>
        Update: Partial<Database['public']['Tables']['journal_entries']['Insert']>
      }
      journal_lines: {
        Row: {
          id: string
          entry_id: string
          account_id: string
          description: string | null
          debit: number
          credit: number
        }
        Insert: Omit<Database['public']['Tables']['journal_lines']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['journal_lines']['Insert']>
      }
      expenses: {
        Row: {
          id: string
          date: string
          account_id: string
          contact_id: string | null
          description: string
          amount: number
          tax_amount: number
          reference: string | null
          receipt_url: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['expenses']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['expenses']['Insert']>
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      user_role: UserRole
      account_type: AccountType
      invoice_status: InvoiceStatus
      bill_status: BillStatus
    }
  }
}
