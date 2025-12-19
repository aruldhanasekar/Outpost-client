export interface Commitment {
  id: string;
  type: "PROMISE" | "AWAITING";
  who_owes: string;
  owed_to: string;
  what: string;
  deadline: string | null;
  deadline_text: string | null;
  status: "pending" | "done";
  created_at: string;
}

export interface Thread {
  id: string;
  thread_id: string;
  subject: string;
  participants: string[];
  email_ids: string[];
  ai_context_summary: string;
  has_promise: boolean;
  has_awaiting: boolean;
  commitments: Commitment[];
  ui_summary_promise: string;
  ui_summary_awaiting: string;
  status: "active" | "done";
  last_email_date: any;
  updated_at: string;
}

export interface Email {
  id: string;
  messageId: string;
  subject: string;
  from: any;
  from_email?: string;
  from_name?: string;
  to: string[];
  date: any;
  body_plain: string;
  body_html: string;
  ai_summary: string;
  snippet: string;
  category: string;
  is_sent: boolean;
  attachments?: Attachment[];
}

export interface Attachment {
  filename: string;
  name: string;
  mimeType: string;
}

export type CategoryType = "Urgent" | "Important" | "Promises" | "Awaiting" | "Others";