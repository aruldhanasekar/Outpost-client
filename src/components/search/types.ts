// types.ts - Search types

export interface SearchableEmail {
  id: string;
  thread_id: string;
  subject: string;
  sender: string;
  sender_email: string;
  recipients: string[];
  date: string;
  snippet: string;
  category: string;
  source: 'inbox' | 'sent' | 'done' | 'trash';
  has_attachment: boolean;
  is_read: boolean;
}

export interface SearchOperator {
  type: 'from' | 'to' | 'subject' | 'has' | 'in' | 'is' | 'category';
  value: string;
}

export interface ParsedQuery {
  operators: SearchOperator[];
  keywords: string[];
}