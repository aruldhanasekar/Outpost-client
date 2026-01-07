// EmailProfile.tsx - EXACT design from original Inbox.tsx

import { Email } from './types';

interface EmailProfileProps {
  email: Email;
  userEmail: string;
}

export function EmailProfile({ email, userEmail }: EmailProfileProps) {
  return (
    <div className="p-6 pt-8">
      {/* From */}
      <div className="mb-4">
        <p className="text-zinc-500 text-xs uppercase tracking-wider mb-1">From</p>
        <p className="text-zinc-300 text-sm break-all">
          {email.senderEmail}
        </p>
      </div>
      {/* To */}
      <div>
        <p className="text-zinc-500 text-xs uppercase tracking-wider mb-1">To</p>
        <p className="text-zinc-300 text-sm break-all">
          {userEmail || "user@email.com"}
        </p>
      </div>
    </div>
  );
}