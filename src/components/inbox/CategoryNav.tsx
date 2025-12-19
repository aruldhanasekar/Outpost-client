// CategoryNav.tsx - EXACT design from original Inbox.tsx
// v2.1: Added unread count badges

import { Category, CategoryCounts, categories } from './types';

interface CategoryNavProps {
  activeCategory: Category;
  onCategoryChange: (category: Category) => void;
  counts?: CategoryCounts;
}

export function CategoryNav({ activeCategory, onCategoryChange, counts }: CategoryNavProps) {
  return (
    <div className="flex items-center gap-8">
      {categories.map((category) => {
        const count = counts?.[category.id] || 0;
        
        return (
          <button
            key={category.id}
            onClick={() => onCategoryChange(category.id)}
            className={`
              relative pb-4 text-sm font-semibold transition-colors duration-200
              ${activeCategory === category.id 
                ? "text-[#8FA8A3]" 
                : "text-zinc-400 hover:text-white"
              }
            `}
          >
            <span className="flex items-center gap-1.5">
              {category.label}
              {count > 0 && (
                <span className="text-xs">
                  {count}
                </span>
              )}
            </span>
            {activeCategory === category.id && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#8FA8A3] rounded-full" />
            )}
          </button>
        );
      })}
    </div>
  );
}