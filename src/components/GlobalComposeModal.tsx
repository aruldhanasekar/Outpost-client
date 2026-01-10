// components/GlobalComposeModal.tsx
// Global compose modal wrapper that renders at App level
// Uses ComposeContext to manage state

import { useCompose } from '@/context/ComposeContext';
import { useAuth } from '@/context/AuthContext';
import { ComposeModal, UndoEmailData } from '@/components/inbox/ComposeModal';

export function GlobalComposeModal() {
  const { currentUser } = useAuth();
  const {
    isComposeOpen,
    composeData,
    closeCompose,
    onEmailSent,
    onEmailScheduled,
    onDraftSaved,
    onDraftDeleted,
    onEmailUpdated,
  } = useCompose();

  // Don't render if no user
  if (!currentUser) {
    return null;
  }

  // Get user email and timezone
  const userEmail = currentUser.email || '';
  // TODO: Get timezone from user profile if available
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

  return (
    <ComposeModal
      isOpen={isComposeOpen}
      onClose={closeCompose}
      userEmail={userEmail}
      userTimezone={userTimezone}
      // Edit mode props
      editMode={composeData?.editMode}
      editEmailId={composeData?.editEmailId}
      // Initial values
      initialTo={composeData?.initialTo}
      initialCc={composeData?.initialCc}
      initialBcc={composeData?.initialBcc}
      initialSubject={composeData?.initialSubject}
      initialBody={composeData?.initialBody}
      initialAttachments={composeData?.initialAttachments}
      initialScheduledAt={composeData?.initialScheduledAt}
      // Draft mode
      draftId={composeData?.draftId}
      // Callbacks
      onEmailSent={onEmailSent || undefined}
      onEmailScheduled={onEmailScheduled || undefined}
      onDraftSaved={onDraftSaved || undefined}
      onDraftDeleted={onDraftDeleted || undefined}
      onEmailUpdated={onEmailUpdated || undefined}
    />
  );
}