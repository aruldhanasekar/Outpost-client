// pages/Sent.tsx - Sent Emails Page with Tracking Display
// Shows sent emails with open tracking statistics
// v2.0: Added ComposeModal support

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Loader2, Menu, X } from "lucide-react";
import {
  Email,
  useSentEmails,
  EmailList,
  ComposeModal,
} from "@/components/inbox";
import { SearchModal } from "@/components/search";
import { useThreadEmailsByThreadId } from "@/components/inbox/useThreadEmailsByThreadId";
import { SentThreadDetail } from "@/components/inbox/SentThreadDetail";
import { MobileSentThreadDetail } from "@/components/inbox/MobileSentThreadDetail";
import { TrackingPanel } from "@/components/inbox/TrackingPanel";
import { Sidebar } from "@/components/layout";
import { EmailSendUndoToast } from "@/components/ui/EmailSendUndoToast";
import { UndoEmailData } from "@/components/inbox/ComposeModal";

const SentPage = () => {
  const { currentUser, userProfile, loading: authLoading, backendUserData } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);

  // Compose modal state
  const [isComposeOpen, setIsComposeOpen] = useState(false);

  // Search modal state
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Email send undo toast state
  const [emailUndoToast, setEmailUndoToast] = useState<{
    show: boolean;
    emailId: string;
    recipients: string[];
    emailData: UndoEmailData;
  } | null>(null);

  // Undo restore state
  const [undoComposeData, setUndoComposeData] = useState<UndoEmailData | null>(null);

  // Checked emails state (for bulk selection)
  const [checkedEmails, setCheckedEmails] = useState<Set<string>>(new Set());

  // Fetch sent emails from Firestore
  const { emails, loading: emailsLoading, error: emailsError } = useSentEmails(currentUser?.uid);

  // Fetch thread emails when an email is selected
  const { emails: threadEmails, loading: threadEmailsLoading } = useThreadEmailsByThreadId(
    currentUser?.uid,
    selectedEmail?.thread_id
  );

  useEffect(() => {
    if (!authLoading && !currentUser) {
      navigate("/");
    }
  }, [currentUser, authLoading, navigate]);

  // Keyboard shortcut: "/" to open search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
      if (target.closest('[data-modal]')) return;
      if (isComposeOpen || isSearchOpen) return;
      
      if (e.key === '/' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isComposeOpen, isSearchOpen]);

  // Handle email click
  const handleEmailClick = (email: Email) => {
    setSelectedEmail(email);
  };

  // Close detail panel
  const handleCloseDetail = () => {
    setSelectedEmail(null);
  };

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

  // Handle email sent - show undo toast
  const handleEmailSent = useCallback((emailId: string, recipients: string[], emailData: UndoEmailData) => {
    console.log('📧 Email queued, showing undo toast:', emailId);
    setEmailUndoToast({
      show: true,
      emailId,
      recipients,
      emailData
    });
  }, []);

  // Handle email undone - just store data, useEffect will open modal
  const handleEmailUndone = useCallback(() => {
    console.log('↩️ Email cancelled, storing data for modal');
    const emailData = emailUndoToast?.emailData;
    if (!emailData) return;
    
    // Store undo data - useEffect below will open the modal
    setUndoComposeData(emailData);
  }, [emailUndoToast]);

  // Open modal AFTER undoComposeData is set (fixes timing issue)
  useEffect(() => {
    if (undoComposeData && undoComposeData.type === 'compose') {
      console.log('📧 Opening compose modal with undo data');
      setIsComposeOpen(true);
    }
  }, [undoComposeData]);

  // Handle close undo toast
  const handleCloseEmailUndoToast = useCallback(() => {
    setEmailUndoToast(null);
  }, []);

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
          activePage="sent"
          userEmail={currentUser?.email || ""}
          userName={userProfile?.firstName ? `${userProfile.firstName} ${userProfile.lastName || ""}`.trim() : undefined}
          avatarLetter={userProfile?.firstName?.[0]?.toUpperCase() || currentUser?.email?.[0]?.toUpperCase() || "U"}
        />

        {/* ==================== MOBILE SIDEBAR OVERLAY ==================== */}
        {sidebarOpen && (
          <div 
            className="lg:hidden fixed inset-0 bg-black/60 z-40"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* ==================== MOBILE SIDEBAR DRAWER ==================== */}
        <div className={`
          lg:hidden fixed top-0 left-0 h-full w-64 bg-[#1a1a1a] z-50 transform transition-transform duration-300
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
          <div className="flex items-center justify-between p-4 border-b border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#8FA8A3] flex items-center justify-center text-base font-semibold text-black">
                {currentUser?.email?.[0]?.toUpperCase() || "U"}
              </div>
              <div className="flex flex-col">
                <span className="text-white text-sm font-medium truncate max-w-[140px]">
                  {currentUser?.email || "User"}
                </span>
                <span className="text-zinc-500 text-xs">Outpost</span>
              </div>
            </div>
            <button 
              onClick={() => setSidebarOpen(false)}
              className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 space-y-1">
            <button 
              onClick={() => { navigate('/inbox'); setSidebarOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-5 h-5" fill="currentColor">
                <path d="M155.8 96C123.9 96 96.9 119.4 92.4 150.9L64.6 345.2C64.2 348.2 64 351.2 64 354.3L64 480C64 515.3 92.7 544 128 544L512 544C547.3 544 576 515.3 576 480L576 354.3C576 351.3 575.8 348.2 575.4 345.2L547.6 150.9C543.1 119.4 516.1 96 484.2 96L155.8 96zM155.8 160L484.3 160L511.7 352L451.8 352C439.7 352 428.6 358.8 423.2 369.7L408.9 398.3C403.5 409.1 392.4 416 380.3 416L259.9 416C247.8 416 236.7 409.2 231.3 398.3L217 369.7C211.6 358.9 200.5 352 188.4 352L128.3 352L155.8 160z"/>
              </svg>
              <span>Inbox</span>
            </button>

            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-white bg-zinc-800">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
              <span>Sent</span>
            </button>

            <button 
              onClick={() => { navigate('/drafts'); setSidebarOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-5 h-5" fill="currentColor">
                <path d="M128 128C128 92.7 156.7 64 192 64L341.5 64C358.5 64 374.8 70.7 386.8 82.7L493.3 189.3C505.3 201.3 512 217.6 512 234.6L512 512C512 547.3 483.3 576 448 576L192 576C156.7 576 128 547.3 128 512L128 128zM336 122.5L336 216C336 229.3 346.7 240 360 240L453.5 240L336 122.5zM192 136C192 149.3 202.7 160 216 160L264 160C277.3 160 288 149.3 288 136C288 122.7 277.3 112 264 112L216 112C202.7 112 192 122.7 192 136zM192 232C192 245.3 202.7 256 216 256L264 256C277.3 256 288 245.3 288 232C288 218.7 277.3 208 264 208L216 208C202.7 208 192 218.7 192 232zM256 304L224 304C206.3 304 192 318.3 192 336L192 384C192 410.5 213.5 432 240 432C266.5 432 288 410.5 288 384L288 336C288 318.3 273.7 304 256 304zM240 368C248.8 368 256 375.2 256 384C256 392.8 248.8 400 240 400C231.2 400 224 392.8 224 384C224 375.2 231.2 368 240 368z"/>
              </svg>
              <span>Drafts</span>
            </button>

            <button 
              onClick={() => { navigate('/done'); setSidebarOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-5 h-5" fill="currentColor">
                <path d="M530.8 134.1C545.1 144.5 548.3 164.5 537.9 178.8L281.9 530.8C276.4 538.4 267.9 543.1 258.5 543.9C249.1 544.7 240 541.2 233.4 534.6L105.4 406.6C92.9 394.1 92.9 373.8 105.4 361.3C117.9 348.8 138.2 348.8 150.7 361.3L252.2 462.8L486.2 141.1C496.6 126.8 516.6 123.6 530.9 134z"/>
              </svg>
              <span>Done</span>
            </button>

            <button 
              onClick={() => { navigate('/scheduled'); setSidebarOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-5 h-5" fill="currentColor">
                <path d="M320 0C496.7 0 640 143.3 640 320C640 496.7 496.7 640 320 640C143.3 640 0 496.7 0 320C0 143.3 143.3 0 320 0ZM290 150V320C290 330 295 339.4 303.4 345L423.4 425C437.1 434.2 455.6 430.5 464.9 416.9C474.1 403.2 470.5 384.7 456.8 375.4L350 304.9V150C350 133.4 336.6 120 320 120C303.4 120 290 133.4 290 150Z"/>
              </svg>
              <span>Scheduled</span>
            </button>

            <button 
              onClick={() => { navigate('/trash'); setSidebarOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-5 h-5" fill="currentColor">
                <path d="M232.7 69.9L224 96L128 96C110.3 96 96 110.3 96 128C96 145.7 110.3 160 128 160L512 160C529.7 160 544 145.7 544 128C544 110.3 529.7 96 512 96L416 96L407.3 69.9C402.9 56.8 390.7 48 376.9 48L263.1 48C249.3 48 237.1 56.8 232.7 69.9zM512 208L128 208L149.1 531.1C150.7 556.4 171.7 576 197 576L443 576C468.3 576 489.3 556.4 490.9 531.1L512 208z"/>
              </svg>
              <span>Trash</span>
            </button>
          </div>
        </div>

        {/* ==================== MAIN CONTAINER ==================== */}
        <div className={`fixed inset-0 lg:top-0 lg:right-0 lg:left-16 bg-[#2d2d2d] lg:rounded-bl-2xl flex flex-col ${isComposeOpen ? 'lg:bottom-12' : 'lg:bottom-8'}`}>
          
          {/* ==================== TOP NAVBAR ==================== */}
          <nav className="flex-shrink-0 border-b border-zinc-700/50">
            {/* Mobile/Tablet Header */}
            <div className="flex lg:hidden items-center justify-between h-14 px-3">
              {/* LEFT: Checkbox + Hamburger + Title */}
              <div className="flex items-center">
                <div className="flex items-center justify-center w-8">
                  <input
                    type="checkbox"
                    checked={checkedEmails.size > 0 && checkedEmails.size === emails.length}
                    onChange={handleGlobalCheckChange}
                    className="w-4 h-4 rounded bg-transparent cursor-pointer appearance-none border-2 border-zinc-500 outline-none focus:outline-none focus:ring-0 relative checked:after:content-['✓'] checked:after:absolute checked:after:text-white checked:after:text-xs checked:after:font-bold checked:after:left-1/2 checked:after:top-1/2 checked:after:-translate-x-1/2 checked:after:-translate-y-1/2"
                  />
                </div>
                {/* Hamburger Menu */}
                <button 
                  onClick={() => setSidebarOpen(true)}
                  className="p-2 hover:bg-zinc-700/50 rounded-lg transition-colors text-zinc-400 hover:text-white"
                >
                  <Menu className="w-5 h-5" />
                </button>

                {/* Page Title */}
                <span className="text-white font-medium text-sm">Sent</span>
              </div>

              {/* RIGHT: Action Icons */}
              <div className="flex items-center">
                {/* Search Icon */}
                <button onClick={() => setIsSearchOpen(true)} className="p-2 hover:bg-zinc-700/50 rounded-lg transition-colors text-zinc-400 hover:text-white" title="Search">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-5 h-5" fill="currentColor">
                    <path d="M480 272C480 317.9 465.1 360.3 440 394.7L566.6 521.4C579.1 533.9 579.1 554.2 566.6 566.7C554.1 579.2 533.8 579.2 521.3 566.7L394.7 440C360.3 465.1 317.9 480 272 480C157.1 480 64 386.9 64 272C64 157.1 157.1 64 272 64C386.9 64 480 157.1 480 272zM272 416C351.5 416 416 351.5 416 272C416 192.5 351.5 128 272 128C192.5 128 128 192.5 128 272C128 351.5 192.5 416 272 416z"/>
                  </svg>
                </button>

                {/* Compose/Pencil Icon - Orange Background */}
                <button 
                  onClick={() => setIsComposeOpen(true)}
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
                <span className="text-[#8FA8A3] font-medium text-sm">Sent</span>
                <span className="text-zinc-500 text-sm">{emails.length} emails</span>
              </div>

              {/* Action Icons */}
              <div className="flex items-center gap-1 pb-4">
                {/* Search Icon */}
                <button onClick={() => setIsSearchOpen(true)} className="p-2 hover:bg-zinc-700/50 rounded-lg transition-colors text-zinc-400 hover:text-white" title="Search">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-5 h-5" fill="currentColor">
                    <path d="M480 272C480 317.9 465.1 360.3 440 394.7L566.6 521.4C579.1 533.9 579.1 554.2 566.6 566.7C554.1 579.2 533.8 579.2 521.3 566.7L394.7 440C360.3 465.1 317.9 480 272 480C157.1 480 64 386.9 64 272C64 157.1 157.1 64 272 64C386.9 64 480 157.1 480 272zM272 416C351.5 416 416 351.5 416 272C416 192.5 351.5 128 272 128C192.5 128 128 192.5 128 272C128 351.5 192.5 416 272 416z"/>
                  </svg>
                </button>

                {/* Compose Icon - Orange Background */}
                <button 
                  onClick={() => setIsComposeOpen(true)}
                  className="p-2 bg-[#8FA8A3] hover:bg-[#7a9691] rounded-lg transition-colors text-white"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-5 h-5" fill="currentColor">
                    <path d="M505 122.9L517.1 135C526.5 144.4 526.5 159.6 517.1 168.9L488 198.1L441.9 152L471 122.9C480.4 113.5 495.6 113.5 504.9 122.9zM273.8 320.2L408 185.9L454.1 232L319.8 366.2C316.9 369.1 313.3 371.2 309.4 372.3L250.9 389L267.6 330.5C268.7 326.6 270.8 323 273.7 320.1zM437.1 89L239.8 286.2C231.1 294.9 224.8 305.6 221.5 317.3L192.9 417.3C190.5 425.7 192.8 434.7 199 440.9C205.2 447.1 214.2 449.4 222.6 447L322.6 418.4C334.4 415 345.1 408.7 353.7 400.1L551 202.9C579.1 174.8 579.1 129.2 551 101.1L538.9 89C510.8 60.9 465.2 60.9 437.1 89zM152 128C103.4 128 64 167.4 64 216L64 488C64 536.6 103.4 576 152 576L424 576C472.6 576 512 536.6 512 488L512 376C512 362.7 501.3 352 488 352C474.7 352 464 362.7 464 376L464 488C464 510.1 446.1 528 424 528L152 528C129.9 528 112 510.1 112 488L112 216C112 193.9 129.9 176 152 176L264 176C277.3 176 288 165.3 288 152C288 138.7 277.3 128 264 128L152 128z"/>
                  </svg>
                </button>
              </div>
            </div>
          </nav>

          {/* ==================== MAIN CONTENT AREA - EMAIL LIST + DETAIL ==================== */}
          <div className="flex-1 flex overflow-hidden">
            
            {/* List Panel - Email List */}
            <div 
              className={`
                overflow-y-auto hide-scrollbar transition-[width] duration-300 ease-out
                ${selectedEmail ? 'hidden lg:block lg:w-[30%] lg:border-r lg:border-zinc-700/50' : 'w-full'}
              `}
            >
              <EmailList
                emails={emails}
                loading={emailsLoading}
                error={emailsError}
                selectedEmailId={selectedEmail?.id || null}
                isCompact={!!selectedEmail}
                onEmailClick={handleEmailClick}
                showMarkDone={false}
                checkedEmailIds={checkedEmails}
                onCheckChange={handleCheckChange}
              />
            </div>

            {/* Detail Panel - Desktop Only */}
            <div 
              className={`
                hidden lg:flex flex-col bg-[#252525] overflow-hidden
                transition-[width,opacity] duration-300 ease-out will-change-[width,opacity]
                ${selectedEmail ? 'w-[55%] opacity-100' : 'w-0 opacity-0'}
              `}
            >
              {selectedEmail && (
                <SentThreadDetail 
                  subject={selectedEmail.subject}
                  emails={threadEmails}
                  loading={threadEmailsLoading}
                  userEmail={currentUser?.email || ""}
                  onClose={handleCloseDetail}
                />
              )}
            </div>

            {/* Tracking Panel - Desktop Only */}
            <div 
              className={`
                hidden lg:flex flex-col bg-[#1a1a1a] border-l border-zinc-700/50 overflow-hidden
                transition-[width,opacity] duration-300 ease-out will-change-[width,opacity]
                ${selectedEmail ? 'w-[15%] opacity-100' : 'w-0 opacity-0'}
              `}
            >
              {selectedEmail && (
                <TrackingPanel 
                  gmailMessageId={selectedEmail.id}
                  threadEmailCount={threadEmails.length}
                  recipient={selectedEmail.sender}
                />
              )}
            </div>

            {/* Mobile Detail View - Full Screen */}
            {selectedEmail && (
              <MobileSentThreadDetail 
                subject={selectedEmail.subject}
                emails={threadEmails}
                loading={threadEmailsLoading}
                userEmail={currentUser?.email || ""}
                onClose={handleCloseDetail}
              />
            )}
          </div>
          
        </div>
        
        {/* Compose Modal */}
        <ComposeModal
          key={undoComposeData ? 'undo' : 'normal'}
          isOpen={isComposeOpen}
          onClose={() => {
            setIsComposeOpen(false);
            setUndoComposeData(null);
          }}
          userEmail={currentUser?.email || ''}
          userTimezone={backendUserData?.timezone}
          onEmailSent={handleEmailSent}
          initialTo={undoComposeData?.type === 'compose' ? undoComposeData.to : undefined}
          initialCc={undoComposeData?.type === 'compose' ? undoComposeData.cc : undefined}
          initialBcc={undoComposeData?.type === 'compose' ? undoComposeData.bcc : undefined}
          initialSubject={undoComposeData?.type === 'compose' ? undoComposeData.subject : undefined}
          initialBody={undoComposeData?.type === 'compose' ? undoComposeData.body_html : undefined}
          initialAttachments={undoComposeData?.type === 'compose' ? undoComposeData.attachments : undefined}
        />

        {/* Email Send Undo Toast */}
        {emailUndoToast && emailUndoToast.show && (
          <EmailSendUndoToast
            emailId={emailUndoToast.emailId}
            recipients={emailUndoToast.recipients}
            onClose={handleCloseEmailUndoToast}
            onUndo={handleEmailUndone}
          />
        )}
        
        {/* Search Modal */}
        <SearchModal
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
          userEmail={currentUser?.email || ''}
        />
        
      </div>
    </>
  );
};

export default SentPage;