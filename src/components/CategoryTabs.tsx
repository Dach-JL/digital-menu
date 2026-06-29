import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useRoomMode } from '@/contexts/RoomContext';

interface CategoryTabsProps {
  activeCategory?: string;
  onCategoryChange?: (category: string) => void;
  hideAll?: boolean;
  allowedCategories?: string[];
}

export const CategoryTabs: React.FC<CategoryTabsProps> = ({ 
  activeCategory: parentActiveCategory, 
  onCategoryChange, 
  hideAll = false, 
  allowedCategories 
}) => {
  const { t, i18n } = useTranslation();
  const { isRoomMode } = useRoomMode();

  let categories = [
    { id: 'all', label: t('categories.all') },
    { id: 'breakfast', label: t('categories.breakfast') },
    { id: 'meal', label: t('categories.meal') },
    { id: 'dinner', label: t('categories.dinner') },
    { id: 'dessert', label: t('categories.dessert') },
    { id: 'drink', label: t('categories.drink') },
    { id: 'room', label: t('categories.room') }
  ];

  if (hideAll) {
    categories = categories.filter(c => c.id !== 'all');
  }
  
  // Follow existing room mode logic if not overriden by specific allowed permissions
  if (isRoomMode && !allowedCategories) {
    categories = categories.filter(c => c.id !== 'room');
  }

  if (allowedCategories && allowedCategories.length > 0) {
    categories = categories.filter(c => c.id === 'all' || allowedCategories.includes(c.id));
  }

  const defaultCategory = categories[0]?.id || 'all';
  
  const [localActiveCategory, setLocalActiveCategory] = useState(defaultCategory);
  const activeCategory = parentActiveCategory !== undefined ? parentActiveCategory : localActiveCategory;
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    // Need a slight delay to allow font rendering and flex layout to settle length calculation
    const updateIndicator = () => {
      if (navRef.current) {
        const activeElement = navRef.current.querySelector('[aria-selected="true"]') as HTMLElement;
        if (activeElement) {
          setIndicatorStyle({
            left: activeElement.offsetLeft,
            width: activeElement.offsetWidth,
          });
        }
      }
    };
    
    updateIndicator();
    const timeout = setTimeout(updateIndicator, 100);
    return () => clearTimeout(timeout);
  }, [activeCategory, i18n.language]);

  const handleCategoryClick = (categoryId: string) => {
    setLocalActiveCategory(categoryId);
    onCategoryChange?.(categoryId);
  };

  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between w-full mt-3 mb-4 border-b border-border/40 pb-1 gap-2.5 md:gap-0">
      <h2 className="text-[26px] font-bold text-foreground leading-none tracking-tight">Menu</h2>
      
      <nav 
        ref={navRef} 
        className="relative flex items-center gap-[14px] overflow-x-auto no-scrollbar max-w-full pb-1 whitespace-nowrap scroll-smooth" 
        role="tablist"
      >
        {categories.map((category) => {
          const isActive = activeCategory === category.id;
          return (
            <button
              key={category.id}
              onClick={() => handleCategoryClick(category.id)}
              className={`relative pb-1 text-[13px] font-medium transition-colors duration-200 z-10 shrink-0 ${
                isActive
                  ? 'text-foreground font-semibold'
                  : 'text-muted-foreground hover:text-foreground/80'
              }`}
              role="tab"
              aria-selected={isActive}
            >
              {category.label}
            </button>
          );
        })}
        
        {/* Sliding Indicator */}
        <div
          className="absolute bottom-0 h-[2px] rounded-full transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)]"
          style={{ 
            left: `${indicatorStyle.left}px`, 
            width: `${indicatorStyle.width}px`,
            backgroundColor: 'currentColor', 
          }}
        />
      </nav>
    </div>
  );
};
