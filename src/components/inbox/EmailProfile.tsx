// EmailProfile.tsx - EXACT design from original Inbox.tsx

import { Email } from './types';

interface EmailProfileProps {
  email: Email;
  userEmail: string;
}

export function EmailProfile({ email, userEmail }: EmailProfileProps) {
  // Get first letter of senderEmail for fallback avatar
  const firstLetter = email.senderEmail 
    ? email.senderEmail.charAt(0).toUpperCase() 
    : '?';

  return (
    <div className="p-6 pt-8">
      {/* Profile Photo - Centered */}
      <div className="flex justify-center mb-6">
        {email.sender_photo_url ? (
          <img
            src={email.sender_photo_url}
            alt="Sender"
            className="w-16 h-16 rounded-full object-cover"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-zinc-600 flex items-center justify-center">
            <span className="text-white text-xl font-medium">
              {firstLetter}
            </span>
          </div>
        )}
      </div>

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