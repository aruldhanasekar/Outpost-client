// MobileEmailDetail.tsx - EXACT design from original Inbox.tsx

import { useRef, useEffect, useState } from 'react';
import { Check, Trash2 } from 'lucide-react';
import { Email } from './types';

interface MobileEmailDetailProps {
  email: Email;
  onClose: () => void;
  onMarkDone?: () => void;
  onDelete?: () => void;
}

export function MobileEmailDetail({ email, onClose, onMarkDone, onDelete }: MobileEmailDetailProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeHeight, setIframeHeight] = useState<number>(100);
  
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
            padding: 14px 20px;
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
            padding: 20px;
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
    if (!iframe) return;

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

    return () => {
      window.removeEventListener('message', handleMessage);
      iframe.removeEventListener('load', updateHeight);
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [email.body]);

  return (
    <div className="lg:hidden fixed inset-0 bg-[#2d2d2d] z-30 flex flex-col">
      {/* Mobile Detail Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-zinc-700/50">
        <div className="flex items-center gap-3 min-w-0">
          <button 
            onClick={onClose}
            className="p-2 hover:bg-zinc-700/50 rounded-lg transition-colors text-zinc-400 hover:text-white flex-shrink-0"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <path d="m15 18-6-6 6-6"/>
            </svg>
          </button>
          <h2 className="text-base font-semibold text-white truncate">
            {email.subject}
          </h2>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
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
        </div>
      </div>

      {/* Mobile Detail Content */}
      <div className="flex-1 overflow-y-auto hide-scrollbar p-4">
        {/* Email Content */}
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
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200">
              <span className="text-sm font-medium text-gray-700">
                {email.sender}
              </span>
              <span className="text-xs text-gray-400">
                {email.time}
              </span>
            </div>
            {/* Body */}
            <div className="p-5">
              <div className="text-zinc-800 text-sm leading-relaxed whitespace-pre-wrap">
                {email.body}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}