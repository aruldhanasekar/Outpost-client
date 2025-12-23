// SendLaterModal.tsx - Schedule email for later sending
// Shows quick presets + custom date/time picker
// Uses react-datepicker for date/time selection

import { useState, useMemo } from 'react';
import { X, Clock, Calendar, Zap } from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

interface SendLaterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSchedule: (scheduledAt: Date) => void;
  userTimezone: string; // e.g., "Asia/Calcutta"
}

interface QuickOption {
  label: string;
  getDate: () => Date;
  show: boolean;
}

export function SendLaterModal({ 
  isOpen, 
  onClose, 
  onSchedule,
  userTimezone 
}: SendLaterModalProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<Date | null>(null);
  
  // Get current date in user's timezone
  const now = useMemo(() => new Date(), []);
  
  // Calculate quick options
  const quickOptions = useMemo((): QuickOption[] => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ...
    
    // In 2 hours
    const in2Hours = new Date(today.getTime() + 2 * 60 * 60 * 1000);
    
    // Tomorrow 9 AM
    const tomorrow9AM = new Date(today);
    tomorrow9AM.setDate(tomorrow9AM.getDate() + 1);
    tomorrow9AM.setHours(9, 0, 0, 0);
    
    // Tomorrow 2 PM
    const tomorrow2PM = new Date(today);
    tomorrow2PM.setDate(tomorrow2PM.getDate() + 1);
    tomorrow2PM.setHours(14, 0, 0, 0);
    
    // Next Monday 9 AM
    const daysUntilMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek);
    const nextMonday9AM = new Date(today);
    nextMonday9AM.setDate(nextMonday9AM.getDate() + daysUntilMonday);
    nextMonday9AM.setHours(9, 0, 0, 0);
    
    return [
      {
        label: 'In 2 hours',
        getDate: () => in2Hours,
        show: true
      },
      {
        label: 'Tomorrow 9 AM',
        getDate: () => tomorrow9AM,
        show: true
      },
      {
        label: 'Tomorrow 2 PM',
        getDate: () => tomorrow2PM,
        show: true
      },
      {
        label: 'Monday 9 AM',
        getDate: () => nextMonday9AM,
        show: dayOfWeek !== 1 // Hide if today is Monday
      }
    ];
  }, []);
  
  // Handle quick option click
  const handleQuickOption = (option: QuickOption) => {
    const scheduledDate = option.getDate();
    onSchedule(scheduledDate);
    onClose();
  };
  
  // Handle custom date/time schedule
  const handleCustomSchedule = () => {
    if (!selectedDate || !selectedTime) return;
    
    // Combine date and time
    const scheduledDate = new Date(selectedDate);
    scheduledDate.setHours(
      selectedTime.getHours(),
      selectedTime.getMinutes(),
      0,
      0
    );
    
    // Validate it's in the future
    if (scheduledDate <= new Date()) {
      alert('Please select a future date and time');
      return;
    }
    
    onSchedule(scheduledDate);
    onClose();
  };
  
  // Format date for display
  const formatSchedulePreview = (): string => {
    if (!selectedDate || !selectedTime) return '';
    
    const scheduledDate = new Date(selectedDate);
    scheduledDate.setHours(
      selectedTime.getHours(),
      selectedTime.getMinutes(),
      0,
      0
    );
    
    return scheduledDate.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };
  
  // Check if custom selection is valid
  const isCustomValid = selectedDate && selectedTime && (() => {
    const scheduledDate = new Date(selectedDate);
    scheduledDate.setHours(
      selectedTime.getHours(),
      selectedTime.getMinutes(),
      0,
      0
    );
    return scheduledDate > new Date();
  })();
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-[#2d2d2d] rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-700/50">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#f7ac5c]" />
            <h3 className="text-base font-semibold text-white">Schedule Send</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-zinc-700 rounded-lg transition-colors text-zinc-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-5">
          {/* Quick Options */}
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-zinc-500" />
              <span className="text-sm text-zinc-400">Quick options</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {quickOptions.filter(o => o.show).map((option) => (
                <button
                  key={option.label}
                  onClick={() => handleQuickOption(option)}
                  className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-600 rounded-lg text-sm text-white transition-all text-left"
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          
          {/* Divider */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-zinc-700" />
            <span className="text-xs text-zinc-500">or pick a time</span>
            <div className="flex-1 h-px bg-zinc-700" />
          </div>
          
          {/* Custom Date/Time Picker */}
          <div className="space-y-3">
            {/* Date Picker */}
            <div>
              <label className="flex items-center gap-2 text-sm text-zinc-400 mb-2">
                <Calendar className="w-4 h-4" />
                Date
              </label>
              <DatePicker
                selected={selectedDate}
                onChange={(date) => setSelectedDate(date)}
                minDate={now}
                dateFormat="MMMM d, yyyy"
                placeholderText="Select date"
                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm placeholder:text-zinc-500 focus:outline-none focus:border-[#f7ac5c] transition-colors"
                calendarClassName="send-later-calendar"
                wrapperClassName="w-full"
              />
            </div>
            
            {/* Time Picker */}
            <div>
              <label className="flex items-center gap-2 text-sm text-zinc-400 mb-2">
                <Clock className="w-4 h-4" />
                Time
              </label>
              <DatePicker
                selected={selectedTime}
                onChange={(date) => setSelectedTime(date)}
                showTimeSelect
                showTimeSelectOnly
                timeIntervals={15}
                timeCaption="Time"
                dateFormat="h:mm aa"
                placeholderText="Select time"
                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm placeholder:text-zinc-500 focus:outline-none focus:border-[#f7ac5c] transition-colors"
                wrapperClassName="w-full"
              />
            </div>
            
            {/* Preview */}
            {selectedDate && selectedTime && (
              <div className="mt-3 px-3 py-2 bg-zinc-800/50 border border-zinc-700/50 rounded-lg">
                <p className="text-xs text-zinc-500">Will be sent:</p>
                <p className="text-sm text-white font-medium">
                  {formatSchedulePreview()}
                </p>
              </div>
            )}
          </div>
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-zinc-700/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCustomSchedule}
            disabled={!isCustomValid}
            className={`
              px-5 py-2 rounded-lg text-sm font-medium transition-all
              ${isCustomValid
                ? 'bg-[#f7ac5c] hover:bg-[#f5a043] text-white cursor-pointer'
                : 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
              }
            `}
          >
            Schedule
          </button>
        </div>
      </div>
      
      {/* Custom styles for react-datepicker */}
      <style>{`
        .react-datepicker {
          background-color: #2d2d2d !important;
          border: 1px solid #3f3f46 !important;
          border-radius: 12px !important;
          font-family: inherit !important;
        }
        
        .react-datepicker__header {
          background-color: #27272a !important;
          border-bottom: 1px solid #3f3f46 !important;
          border-radius: 12px 12px 0 0 !important;
        }
        
        .react-datepicker__current-month,
        .react-datepicker__day-name,
        .react-datepicker-time__header {
          color: #ffffff !important;
        }
        
        .react-datepicker__day {
          color: #e4e4e7 !important;
          border-radius: 8px !important;
        }
        
        .react-datepicker__day:hover {
          background-color: #3f3f46 !important;
          border-radius: 8px !important;
        }
        
        .react-datepicker__day--selected,
        .react-datepicker__day--keyboard-selected {
          background-color: #f7ac5c !important;
          color: #ffffff !important;
        }
        
        .react-datepicker__day--disabled {
          color: #52525b !important;
        }
        
        .react-datepicker__day--outside-month {
          color: #52525b !important;
        }
        
        .react-datepicker__navigation-icon::before {
          border-color: #a1a1aa !important;
        }
        
        .react-datepicker__navigation:hover *::before {
          border-color: #ffffff !important;
        }
        
        .react-datepicker__time-container {
          border-left: 1px solid #3f3f46 !important;
        }
        
        .react-datepicker__time {
          background-color: #2d2d2d !important;
        }
        
        .react-datepicker__time-box {
          width: 100px !important;
        }
        
        .react-datepicker__time-list-item {
          color: #e4e4e7 !important;
          height: 36px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
        }
        
        .react-datepicker__time-list-item:hover {
          background-color: #3f3f46 !important;
        }
        
        .react-datepicker__time-list-item--selected {
          background-color: #f7ac5c !important;
          color: #ffffff !important;
        }
        
        .react-datepicker__time-list {
          scrollbar-width: none !important; /* Firefox */
          -ms-overflow-style: none !important; /* IE/Edge */
        }
        
        .react-datepicker__time-list::-webkit-scrollbar {
          display: none !important; /* Chrome, Safari */
        }
        
        .react-datepicker__triangle {
          display: none !important;
        }
        
        .react-datepicker-popper {
          z-index: 100 !important;
        }
      `}</style>
    </div>
  );
}