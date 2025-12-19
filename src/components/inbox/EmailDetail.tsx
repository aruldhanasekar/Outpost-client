// EmailDetail.tsx - EXACT design from original Inbox.tsx

import { X, Check, Trash2 } from 'lucide-react';
import { useRef, useEffect, useState } from 'react';
import { Email } from './types';

// Expand icon SVG component
const ExpandIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-5 h-5" fill="currentColor">
    <path d="M408 64L552 64C565.3 64 576 74.7 576 88L576 232C576 241.7 570.2 250.5 561.2 254.2C552.2 257.9 541.9 255.9 535 249L496 210L409 297C399.6 306.4 384.4 306.4 375.1 297L343.1 265C333.7 255.6 333.7 240.4 343.1 231.1L430.1 144.1L391.1 105.1C384.2 98.2 382.2 87.9 385.9 78.9C389.6 69.9 398.3 64 408 64zM232 576L88 576C74.7 576 64 565.3 64 552L64 408C64 398.3 69.8 389.5 78.8 385.8C87.8 382.1 98.1 384.2 105 391L144 430L231 343C240.4 333.6 255.6 333.6 264.9 343L296.9 375C306.3 384.4 306.3 399.6 296.9 408.9L209.9 495.9L248.9 534.9C255.8 541.8 257.8 552.1 254.1 561.1C250.4 570.1 241.7 576 232 576z"/>
  </svg>
);

// Minimize icon SVG component
const MinimizeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-5 h-5" fill="currentColor">
    <path d="M503.5 71C512.9 61.6 528.1 61.6 537.4 71L569.4 103C578.8 112.4 578.8 127.6 569.4 136.9L482.4 223.9L521.4 262.9C528.3 269.8 530.3 280.1 526.6 289.1C522.9 298.1 514.2 304 504.5 304L360.5 304C347.2 304 336.5 293.3 336.5 280L336.5 136C336.5 126.3 342.3 117.5 351.3 113.8C360.3 110.1 370.6 112.1 377.5 119L416.5 158L503.5 71zM136.5 336L280.5 336C293.8 336 304.5 346.7 304.5 360L304.5 504C304.5 513.7 298.7 522.5 289.7 526.2C280.7 529.9 270.4 527.9 263.5 521L224.5 482L137.5 569C128.1 578.4 112.9 578.4 103.6 569L71.6 537C62.2 527.6 62.2 512.4 71.6 503.1L158.6 416.1L119.6 377.1C112.7 370.2 110.7 359.9 114.4 350.9C118.1 341.9 126.8 336 136.5 336z"/>
  </svg>
);

// Left arrow icon (previous)
const LeftArrowIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-5 h-5" fill="currentColor">
    <path d="M201.4 297.4C188.9 309.9 188.9 330.2 201.4 342.7L361.4 502.7C373.9 515.2 394.2 515.2 406.7 502.7C419.2 490.2 419.2 469.9 406.7 457.4L269.3 320L406.6 182.6C419.1 170.1 419.1 149.8 406.6 137.3C394.1 124.8 373.8 124.8 361.3 137.3L201.3 297.3z"/>
  </svg>
);

// Right arrow icon (next)
const RightArrowIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-5 h-5" fill="currentColor">
    <path d="M439.1 297.4C451.6 309.9 451.6 330.2 439.1 342.7L279.1 502.7C266.6 515.2 246.3 515.2 233.8 502.7C221.3 490.2 221.3 469.9 233.8 457.4L371.2 320L233.9 182.6C221.4 170.1 221.4 149.8 233.9 137.3C246.4 124.8 266.7 124.8 279.2 137.3L439.2 297.3z"/>
  </svg>
);

interface EmailDetailProps {
  email: Email;
  onClose: () => void;
  onMarkDone?: () => void;
  onDelete?: () => void;
  onExpand?: () => void;
  isExpanded?: boolean;
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
}

export function EmailDetail({ 
  email, 
  onClose, 
  onMarkDone, 
  onDelete, 
  onExpand, 
  isExpanded = false,
  onPrevious,
  onNext,
  hasPrevious = false,
  hasNext = false
}: EmailDetailProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeHeight, setIframeHeight] = useState<number>(100);
  const [showContent, setShowContent] = useState(false);
  
  // Delay content render to allow panel transition to complete
  // Also reset iframe height for new email
  useEffect(() => {
    setShowContent(false);
    setIframeHeight(100); // Reset to small default, will expand based on content
    const timer = setTimeout(() => setShowContent(true), 300);
    return () => clearTimeout(timer);
  }, [email.id]);
  
  // Check if body contains actual HTML tags (not just < > characters)
  const isHtml = /<[a-z][\s\S]*>/i.test(email.body);
  
  // Wrap HTML content with white background styling - includes sender/time header
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          * {
            -ms-overflow-style: none;
            scrollbar-width: none;
            box-sizing: border-box;
          }
          *::-webkit-scrollbar {
            display: none;
          }
          html {
            height: auto !important;
            min-height: 0 !important;
          }
          body {
            margin: 0;
            padding: 0;
            width: 100%;
            height: auto !important;
            min-height: 0 !important;
            overflow-x: hidden;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            font-size: 14px;
            line-height: 1.6;
            color: #1a1a1a;
            background-color: #ffffff;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px 24px;
            border-bottom: 1px solid #e5e5e5;
          }
          .sender {
            font-size: 14px;
            font-weight: 500;
            color: #374151;
          }
          .time {
            font-size: 12px;
            color: #9ca3af;
          }
          .content-wrapper {
            overflow: hidden;
            height: auto !important;
          }
          .content {
            padding: 24px;
            word-wrap: break-word;
            overflow-wrap: break-word;
            transform-origin: top left;
            height: auto !important;
          }
          .content img {
            max-width: 100%;
            height: auto;
          }
          .content table {
            max-width: 100%;
            height: auto !important;
          }
          .content div, .content td, .content tr, .content tbody {
            height: auto !important;
            min-height: 0 !important;
          }
          a { color: #2563eb; }
          pre { white-space: pre-wrap; word-wrap: break-word; }
        </style>
      </head>
      <body>
        <div class="header">
          <span class="sender">${email.sender}</span>
          <span class="time">${email.time || ''}</span>
        </div>
        <div class="content-wrapper">
          <div class="content">${email.body}</div>
        </div>
        <script>
          function scaleContent() {
            const wrapper = document.querySelector('.content-wrapper');
            const content = document.querySelector('.content');
            if (!wrapper || !content) return;
            
            content.style.transform = 'none';
            wrapper.style.height = 'auto';
            
            const containerWidth = document.body.clientWidth;
            const contentWidth = content.scrollWidth;
            
            if (contentWidth > containerWidth) {
              const scale = containerWidth / contentWidth;
              content.style.transform = 'scale(' + scale + ')';
              wrapper.style.height = (content.scrollHeight * scale) + 'px';
            }
            
            // Send actual height to parent
            const header = document.querySelector('.header');
            const totalHeight = header.offsetHeight + wrapper.scrollHeight;
            window.parent.postMessage({ type: 'iframeHeight', height: totalHeight }, '*');
          }
          
          window.addEventListener('load', scaleContent);
          setTimeout(scaleContent, 100);
          setTimeout(scaleContent, 500);
        </script>
      </body>
    </html>
  `;

  // Adjust iframe height based on content
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !showContent) return;

    // Listen for height message from iframe
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'iframeHeight' && event.data.height > 0) {
        setIframeHeight(event.data.height + 10);
      }
    };

    const updateHeight = () => {
      try {
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (doc && doc.body) {
          const header = doc.querySelector('.header') as HTMLElement;
          const wrapper = doc.querySelector('.content-wrapper') as HTMLElement;
          if (header && wrapper) {
            const height = header.offsetHeight + wrapper.scrollHeight;
            if (height > 0) {
              setIframeHeight(height + 10);
            }
          }
        }
      } catch (e) {
        // Cross-origin error, use default height
      }
    };

    window.addEventListener('message', handleMessage);
    iframe.addEventListener('load', updateHeight);
    
    const timer1 = setTimeout(updateHeight, 200);
    const timer2 = setTimeout(updateHeight, 600);
    const timer3 = setTimeout(updateHeight, 1200);

    return () => {
      window.removeEventListener('message', handleMessage);
      iframe.removeEventListener('load', updateHeight);
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [email.body, showContent]);

  return (
    <>
      {/* Detail Header */}
      <div className="flex items-center justify-between px-6 py-4">
        <h2 className="text-lg font-medium text-white truncate pr-4" style={{ fontFamily: "'Manrope', sans-serif" }}>
          {email.subject}
        </h2>
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Navigation Arrows */}
          {(onPrevious || onNext) && (
            <>
              <button 
                onClick={onPrevious}
                disabled={!hasPrevious}
                className={`p-2 rounded-lg transition-colors ${
                  hasPrevious 
                    ? 'hover:bg-zinc-700/50 text-zinc-400 hover:text-white cursor-pointer' 
                    : 'text-zinc-600 cursor-not-allowed'
                }`}
                title="Previous email"
              >
                <LeftArrowIcon />
              </button>
              <button 
                onClick={onNext}
                disabled={!hasNext}
                className={`p-2 rounded-lg transition-colors ${
                  hasNext 
                    ? 'hover:bg-zinc-700/50 text-zinc-400 hover:text-white cursor-pointer' 
                    : 'text-zinc-600 cursor-not-allowed'
                }`}
                title="Next email"
              >
                <RightArrowIcon />
              </button>
            </>
          )}
          
          {/* Expand/Minimize Button - Desktop only */}
          {onExpand && (
            <button 
              onClick={onExpand}
              className="p-2 hover:bg-zinc-700/50 rounded-lg transition-colors text-zinc-400 hover:text-white"
              title={isExpanded ? "Minimize" : "Expand"}
            >
              {isExpanded ? <MinimizeIcon /> : <ExpandIcon />}
            </button>
          )}
          {/* Mark as Done Button */}
          {onMarkDone && (
            <button 
              onClick={onMarkDone}
              className="p-2 hover:bg-zinc-700/50 rounded-lg transition-colors text-zinc-400 hover:text-white"
              title="Mark as done"
            >
              <Check className="w-5 h-5" />
            </button>
          )}
          {/* Delete Button */}
          {onDelete && (
            <button 
              onClick={onDelete}
              className="p-2 hover:bg-zinc-700/50 rounded-lg transition-colors text-zinc-400 hover:text-white"
              title="Delete"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
          {/* Close Button */}
          <button 
            onClick={onClose}
            className="p-2 hover:bg-zinc-700/50 rounded-lg transition-colors text-zinc-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Detail Content - Email Body */}
      <div className="flex-1 overflow-y-auto hide-scrollbar px-6 pb-6">
        {/* Content wrapper - starts at top, height based on content */}
        <div className="max-w-[600px] mx-auto">
          {/* Email Content - Delayed render for smooth panel transition */}
          {showContent ? (
            <div className="animate-fadeIn">
              {isHtml ? (
                <iframe
                  ref={iframeRef}
                  srcDoc={htmlContent}
                  sandbox="allow-same-origin"
                  className="w-full border-0 rounded-lg bg-white"
                  style={{ height: `${iframeHeight}px` }}
                  title="Email content"
                />
              ) : (
                <div className="rounded-lg bg-white overflow-hidden">
                  {/* Sender + Time Header */}
                  <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                    <span className="text-sm font-medium text-gray-700">
                      {email.sender}
                    </span>
                    <span className="text-xs text-gray-400">
                      {email.time}
                    </span>
                  </div>
                  {/* Body */}
                  <div className="p-6">
                    <div className="text-zinc-800 text-sm leading-relaxed whitespace-pre-wrap">
                      {email.body}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-32">
              <div className="w-6 h-6 border-2 border-zinc-600 border-t-zinc-400 rounded-full animate-spin" />
            </div>
          )}
        </div>
      </div>
    </>
  );
}