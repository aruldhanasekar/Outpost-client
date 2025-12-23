// pages/Draft.tsx - Draft Emails Page (Same design as Done)
// v3.0: Clicking a draft opens ComposeModal for editing

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Loader2, Menu, X, SendHorizontal } from "lucide-react";
import {
  Email,
  EmailList,
  ComposeModal,
} from "@/components/inbox";
import { useDraftEmails } from "@/hooks/useDraftEmails";
import { loadDraft } from "@/services/draftApi";
import { Sidebar } from "@/components/layout";

// Draft data for editing
interface DraftEditData {
  id: string;
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  body_html: string;
}

const DraftPage = () => {
  const { currentUser, userProfile, loading: authLoading, backendUserData } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Compose modal state
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [editingDraft, setEditingDraft] = useState<DraftEditData | null>(null);

  // Checked emails state (for bulk selection)
  const [checkedEmails, setCheckedEmails] = useState<Set<string>>(new Set());

  // Fetch draft emails from Firestore
  const { emails, loading: emailsLoading, error: emailsError } = useDraftEmails(currentUser?.uid);

  useEffect(() => {
    if (!authLoading && !currentUser) {
      navigate("/");
    }
  }, [currentUser, authLoading, navigate]);

  // Handle email click - load full draft and open ComposeModal
  const handleEmailClick = useCallback(async (email: Email) => {
    try {
      const draft = await loadDraft(email.id);
      if (draft) {
        setEditingDraft({
          id: email.id,
          to: draft.to || [],
          cc: draft.cc || [],
          bcc: draft.bcc || [],
          subject: draft.subject || '',
          body_html: draft.body_html || '',
        });
        setIsComposeOpen(true);
      }
    } catch (error) {
      console.error('Failed to load draft:', error);
    }
  }, []);

  // Handle compose modal close
  const handleComposeClose = useCallback(() => {
    setIsComposeOpen(false);
    setEditingDraft(null);
  }, []);

  // Handle new compose (not editing)
  const handleNewCompose = useCallback(() => {
    setEditingDraft(null);
    setIsComposeOpen(true);
  }, []);

  // Handle checkbox change for individual email
  const handleCheckChange = useCallback((email: Email, checked: boolean) => {
    setCheckedEmails(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(email.id);
      } else {
        newSet.delete(email.id);
      }
      return newSet;
    });
  }, []);

  // Handle global checkbox change
  const handleGlobalCheckChange = useCallback(() => {
    if (checkedEmails.size > 0) {
      setCheckedEmails(new Set());
    } else {
      const allIds = new Set(emails.map(e => e.id));
      setCheckedEmails(allIds);
    }
  }, [checkedEmails.size, emails]);

  if (authLoading) {
    return (
      <div className="fixed inset-0 bg-[#1a1a1a] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  if (!currentUser) return null;

  return (
    <>
      {/* Global styles to prevent scroll and hide scrollbar */}

      <div 
        className="fixed inset-0 bg-[#1a1a1a]" 
      >


        <Sidebar 
          activePage="drafts"
          userEmail={currentUser?.email || ""}
          userName={userProfile?.firstName ? `${userProfile.firstName} ${userProfile.lastName || ""}`.trim() : undefined}
          avatarLetter={userProfile?.firstName?.[0]?.toUpperCase() || currentUser?.email?.[0]?.toUpperCase() || "U"}
        />
        {/* ==================== MOBILE/TABLET: Overlay ==================== */}
        {sidebarOpen && (
          <div 
            className="lg:hidden fixed inset-0 bg-black/60 z-40"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* ==================== MOBILE/TABLET: Slide-out Sidebar ==================== */}
        <div className={`
          lg:hidden fixed top-0 left-0 bottom-0 w-72 bg-[#1a1a1a] z-50 
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
          {/* Sidebar Header */}
          <div className="flex items-center justify-between p-4 border-b border-zinc-800">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-10 h-10 rounded-full bg-[#8FA8A3] flex items-center justify-center text-base font-semibold text-black flex-shrink-0">
                {currentUser?.email?.[0]?.toUpperCase() || "U"}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-white text-sm font-medium truncate">
                  {currentUser?.email || "User"}
                </span>
                <span className="text-zinc-500 text-xs">Outpost</span>
              </div>
            </div>
            <button 
              onClick={() => setSidebarOpen(false)}
              className="p-2 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-white flex-shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Sidebar Navigation */}
          <div className="p-4">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3 px-3">
              Navigation
            </p>
            <div className="flex flex-col gap-1">
              <button 
                onClick={() => { setSidebarOpen(false); navigate('/inbox'); }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/30 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-5 h-5 flex-shrink-0" fill="currentColor">
                  <path d="M155.8 96C123.9 96 96.9 119.4 92.4 150.9L64.6 345.2C64.2 348.2 64 351.2 64 354.3L64 480C64 515.3 92.7 544 128 544L512 544C547.3 544 576 515.3 576 480L576 354.3C576 351.3 575.8 348.2 575.4 345.2L547.6 150.9C543.1 119.4 516.1 96 484.2 96L155.8 96zM155.8 160L484.3 160L511.7 352L451.8 352C439.7 352 428.6 358.8 423.2 369.7L408.9 398.3C403.5 409.1 392.4 416 380.3 416L259.9 416C247.8 416 236.7 409.2 231.3 398.3L217 369.7C211.6 358.9 200.5 352 188.4 352L128.3 352L155.8 160z"/>
                </svg>
                <span className="text-sm font-medium">Inbox</span>
              </button>
              <button 
                onClick={() => { setSidebarOpen(false); navigate('/sent'); }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/30 transition-colors"
              >
                <SendHorizontal className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm font-medium">Sent</span>
              </button>
              <button className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-white bg-zinc-800/50">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-5 h-5 flex-shrink-0" fill="currentColor">
                  <path d="M128 128C128 92.7 156.7 64 192 64L341.5 64C358.5 64 374.8 70.7 386.8 82.7L493.3 189.3C505.3 201.3 512 217.6 512 234.6L512 512C512 547.3 483.3 576 448 576L192 576C156.7 576 128 547.3 128 512L128 128zM336 122.5L336 216C336 229.3 346.7 240 360 240L453.5 240L336 122.5zM192 136C192 149.3 202.7 160 216 160L264 160C277.3 160 288 149.3 288 136C288 122.7 277.3 112 264 112L216 112C202.7 112 192 122.7 192 136zM192 232C192 245.3 202.7 256 216 256L264 256C277.3 256 288 245.3 288 232C288 218.7 277.3 208 264 208L216 208C202.7 208 192 218.7 192 232zM256 304L224 304C206.3 304 192 318.3 192 336L192 384C192 410.5 213.5 432 240 432C266.5 432 288 410.5 288 384L288 336C288 318.3 273.7 304 256 304zM240 368C248.8 368 256 375.2 256 384C256 392.8 248.8 400 240 400C231.2 400 224 392.8 224 384C224 375.2 231.2 368 240 368z"/>
                </svg>
                <span className="text-sm font-medium">Drafts</span>
              </button>
              <button 
                onClick={() => { setSidebarOpen(false); navigate('/done'); }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/30 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-5 h-5 flex-shrink-0" fill="currentColor">
                  <path d="M337.3 86.1L385.7 125.5C390.3 129.3 396 131.5 402 131.8L463.8 135.1C495.8 136.8 521.2 162.2 523 194.2L526.2 256C526.5 262 528.7 267.7 532.5 272.3L571.9 320.7C593 347.3 593 385.7 571.9 412.3L532.5 460.7C528.7 465.3 526.5 471 526.2 477L523 538.8C521.2 570.8 495.8 596.2 463.8 598L402 601.2C396 601.5 390.3 603.7 385.7 607.5L337.3 646.9C310.7 668 272.3 668 245.7 646.9L197.3 607.5C192.7 603.7 187 601.5 181 601.2L119.2 598C87.2 596.2 61.8 570.8 60 538.8L56.8 477C56.5 471 54.3 465.3 50.5 460.7L11.1 412.3C-10 385.7 -10 347.3 11.1 320.7L50.5 272.3C54.3 267.7 56.5 262 56.8 256L60 194.2C61.8 162.2 87.2 136.8 119.2 135L181 131.8C187 131.5 192.7 129.3 197.3 125.5L245.7 86.1C272.3 65 310.7 65 337.3 86.1zM408.5 252.5C421 240 421 219.7 408.5 207.2C396 194.7 375.7 194.7 363.2 207.2L252 318.3L209.8 276.2C197.3 263.7 177 263.7 164.5 276.2C152 288.7 152 309 164.5 321.5L229.4 386.3C241.9 398.8 262.2 398.8 274.7 386.3L408.5 252.5z"/>
                </svg>
                <span className="text-sm font-medium">Done</span>
              </button>
            </div>
          </div>
        </div>

        {/* ==================== MAIN CONTENT AREA ==================== */}
        <div className="lg:ml-20 h-full flex flex-col">
          {/* ==================== TOP NAVIGATION BAR ==================== */}
          <nav className="flex-shrink-0 border-b border-zinc-700/50">
            {/* Mobile Header */}
            <div className="flex lg:hidden items-center justify-between px-4 py-3">
              {/* LEFT: Menu + Title */}
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setSidebarOpen(true)}
                  className="p-2 hover:bg-zinc-700/50 rounded-lg transition-colors text-zinc-400 hover:text-white"
                >
                  <Menu className="w-5 h-5" />
                </button>

                {/* Page Title */}
                <span className="text-white font-medium text-sm">Drafts</span>
              </div>

              {/* RIGHT: Action Icons */}
              <div className="flex items-center">
                {/* Search Icon */}
                <button className="p-2 hover:bg-zinc-700/50 rounded-lg transition-colors text-zinc-400 hover:text-white">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-5 h-5" fill="currentColor">
                    <path d="M480 272C480 317.9 465.1 360.3 440 394.7L566.6 521.4C579.1 533.9 579.1 554.2 566.6 566.7C554.1 579.2 533.8 579.2 521.3 566.7L394.7 440C360.3 465.1 317.9 480 272 480C157.1 480 64 386.9 64 272C64 157.1 157.1 64 272 64C386.9 64 480 157.1 480 272zM272 416C351.5 416 416 351.5 416 272C416 192.5 351.5 128 272 128C192.5 128 128 192.5 128 272C128 351.5 192.5 416 272 416z"/>
                  </svg>
                </button>

                {/* Compose/Pencil Icon - Orange Background */}
                <button 
                  onClick={handleNewCompose}
                  className="p-2 bg-[#8FA8A3] hover:bg-[#7a9691] rounded-lg transition-colors text-white"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-5 h-5" fill="currentColor">
                    <path d="M505 122.9L517.1 135C526.5 144.4 526.5 159.6 517.1 168.9L488 198.1L441.9 152L471 122.9C480.4 113.5 495.6 113.5 504.9 122.9zM273.8 320.2L408 185.9L454.1 232L319.8 366.2C316.9 369.1 313.3 371.2 309.4 372.3L250.9 389L267.6 330.5C268.7 326.6 270.8 323 273.7 320.1zM437.1 89L239.8 286.2C231.1 294.9 224.8 305.6 221.5 317.3L192.9 417.3C190.5 425.7 192.8 434.7 199 440.9C205.2 447.1 214.2 449.4 222.6 447L322.6 418.4C334.4 415 345.1 408.7 353.7 400.1L551 202.9C579.1 174.8 579.1 129.2 551 101.1L538.9 89C510.8 60.9 465.2 60.9 437.1 89zM152 128C103.4 128 64 167.4 64 216L64 488C64 536.6 103.4 576 152 576L424 576C472.6 576 512 536.6 512 488L512 376C512 362.7 501.3 352 488 352C474.7 352 464 362.7 464 376L464 488C464 510.1 446.1 528 424 528L152 528C129.9 528 112 510.1 112 488L112 216C112 193.9 129.9 176 152 176L264 176C277.3 176 288 165.3 288 152C288 138.7 277.3 128 264 128L152 128z"/>
                  </svg>
                </button>
              </div>
            </div>

            {/* Desktop Header */}
            <div className="hidden lg:flex items-center justify-between px-6 pt-4">
              {/* Global Checkbox + Page Title + Email Count */}
              <div className="flex items-center gap-4 pb-4">
                <div className="h-5 flex items-center">
                  <input
                    type="checkbox"
                    checked={checkedEmails.size > 0 && checkedEmails.size === emails.length}
                    onChange={handleGlobalCheckChange}
                    className="w-4 h-4 rounded bg-transparent cursor-pointer appearance-none border-2 border-gray-400 outline-none focus:outline-none focus:ring-0 relative checked:border-black checked:after:content-['✓'] checked:after:absolute checked:after:text-black checked:after:text-xs checked:after:font-bold checked:after:left-1/2 checked:after:top-1/2 checked:after:-translate-x-1/2 checked:after:-translate-y-1/2"
                  />
                </div>
                <span className="text-[#8FA8A3] font-medium text-sm">Drafts</span>
                <span className="text-zinc-500 text-sm">{emails.length} drafts</span>
              </div>

              {/* Action Icons */}
              <div className="flex items-center gap-1 pb-4">
                {/* Search Icon */}
                <button className="p-2 hover:bg-zinc-700/50 rounded-lg transition-colors text-zinc-400 hover:text-white">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-5 h-5" fill="currentColor">
                    <path d="M480 272C480 317.9 465.1 360.3 440 394.7L566.6 521.4C579.1 533.9 579.1 554.2 566.6 566.7C554.1 579.2 533.8 579.2 521.3 566.7L394.7 440C360.3 465.1 317.9 480 272 480C157.1 480 64 386.9 64 272C64 157.1 157.1 64 272 64C386.9 64 480 157.1 480 272zM272 416C351.5 416 416 351.5 416 272C416 192.5 351.5 128 272 128C192.5 128 128 192.5 128 272C128 351.5 192.5 416 272 416z"/>
                  </svg>
                </button>

                {/* Compose Icon - Orange Background */}
                <button 
                  onClick={handleNewCompose}
                  className="p-2 bg-[#8FA8A3] hover:bg-[#7a9691] rounded-lg transition-colors text-white"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-5 h-5" fill="currentColor">
                    <path d="M505 122.9L517.1 135C526.5 144.4 526.5 159.6 517.1 168.9L488 198.1L441.9 152L471 122.9C480.4 113.5 495.6 113.5 504.9 122.9zM273.8 320.2L408 185.9L454.1 232L319.8 366.2C316.9 369.1 313.3 371.2 309.4 372.3L250.9 389L267.6 330.5C268.7 326.6 270.8 323 273.7 320.1zM437.1 89L239.8 286.2C231.1 294.9 224.8 305.6 221.5 317.3L192.9 417.3C190.5 425.7 192.8 434.7 199 440.9C205.2 447.1 214.2 449.4 222.6 447L322.6 418.4C334.4 415 345.1 408.7 353.7 400.1L551 202.9C579.1 174.8 579.1 129.2 551 101.1L538.9 89C510.8 60.9 465.2 60.9 437.1 89zM152 128C103.4 128 64 167.4 64 216L64 488C64 536.6 103.4 576 152 576L424 576C472.6 576 512 536.6 512 488L512 376C512 362.7 501.3 352 488 352C474.7 352 464 362.7 464 376L464 488C464 510.1 446.1 528 424 528L152 528C129.9 528 112 510.1 112 488L112 216C112 193.9 129.9 176 152 176L264 176C277.3 176 288 165.3 288 152C288 138.7 277.3 128 264 128L152 128z"/>
                  </svg>
                </button>
              </div>
            </div>
          </nav>

          {/* ==================== MAIN CONTENT AREA - EMAIL LIST ==================== */}
          <div className="flex-1 flex overflow-hidden">
            
            {/* List Panel - Full Width Email List */}
            <div className="w-full overflow-y-auto hide-scrollbar">
              <EmailList
                emails={emails}
                loading={emailsLoading}
                error={emailsError}
                selectedEmailId={null}
                isCompact={false}
                onEmailClick={handleEmailClick}
                showMarkDone={false}
                checkedEmailIds={checkedEmails}
                onCheckChange={handleCheckChange}
              />
            </div>
          </div>
          
        </div>
        
        {/* Compose Modal - with draft editing support */}
        <ComposeModal
          isOpen={isComposeOpen}
          onClose={handleComposeClose}
          userEmail={currentUser?.email || ''}
          userTimezone={backendUserData?.timezone}
          // Draft editing props
          draftId={editingDraft?.id}
          initialTo={editingDraft?.to}
          initialCc={editingDraft?.cc}
          initialBcc={editingDraft?.bcc}
          initialSubject={editingDraft?.subject}
          initialBody={editingDraft?.body_html}
        />
        
      </div>
    </>
  );
};

export default DraftPage;