import React, { useState, useEffect } from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useTranslation } from 'react-i18next';

export interface FilterState {
  maxPrice: number;
  minRating: number;
  bedrooms: string;
  dietary: string[];
  sortBy: 'recommended' | 'price_asc' | 'price_desc';
}

export const initialFilterState: FilterState = {
  maxPrice: 10000,
  minRating: 0,
  bedrooms: 'all',
  dietary: [],
  sortBy: 'recommended',
};

interface FilterDrawerProps {
  isOpen: boolean;
  onClose: (isOpen: boolean) => void;
  activeCategory: string;
  onApplyFilters: (filters: FilterState) => void;
  initialFilters: FilterState;
}

export const FilterDrawer: React.FC<FilterDrawerProps> = ({
  isOpen,
  onClose,
  activeCategory,
  onApplyFilters,
  initialFilters
}) => {
  const { t } = useTranslation();
  const [filters, setFilters] = useState<FilterState>(initialFilters);

  useEffect(() => {
    if (isOpen) {
      setFilters(initialFilters);
    }
  }, [initialFilters, isOpen]);

  const handleReset = () => {
    const defaultState = { ...initialFilterState };
    setFilters(defaultState);
  };

  const handleApply = () => {
    onApplyFilters(filters);
    onClose(false);
  };

  const isRoom = activeCategory === 'room';

  return (
    <Drawer open={isOpen} onOpenChange={onClose}>
      <DrawerContent className="max-h-[85vh] px-1 bg-background/95 backdrop-blur-xl border-t border-border/50">
        <DrawerHeader className="flex items-center justify-between pb-3 border-b border-border/40 mt-2 px-5">
          <DrawerTitle className="text-xl font-bold tracking-tight">Filters</DrawerTitle>
          <button onClick={handleReset} className="text-[15px] font-medium text-muted-foreground hover:text-foreground transition-colors">
            Reset
          </button>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto px-5 py-6 space-y-8 no-scrollbar pb-24">
          
          {/* Sort By */}
          <div className="space-y-3.5">
            <h3 className="text-xs font-bold tracking-wider uppercase text-muted-foreground">Sort By</h3>
            <ToggleGroup 
              type="single" 
              value={filters.sortBy} 
              onValueChange={(val) => val && setFilters(f => ({ ...f, sortBy: val as any }))}
              className="justify-start flex-wrap gap-2.5"
            >
              <ToggleGroupItem value="recommended" className="rounded-xl px-4 py-2 bg-card border data-[state=on]:bg-foreground data-[state=on]:text-background transition-all">Recommended</ToggleGroupItem>
              <ToggleGroupItem value="price_asc" className="rounded-xl px-4 py-2 bg-card border data-[state=on]:bg-foreground data-[state=on]:text-background transition-all">Price: Low to High</ToggleGroupItem>
              <ToggleGroupItem value="price_desc" className="rounded-xl px-4 py-2 bg-card border data-[state=on]:bg-foreground data-[state=on]:text-background transition-all">Price: High to Low</ToggleGroupItem>
            </ToggleGroup>
          </div>

          {/* Price Range */}
          <div className="space-y-5">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold tracking-wider uppercase text-muted-foreground">Max Price</h3>
              <span className="font-bold text-foreground">{filters.maxPrice} birr</span>
            </div>
            <Slider 
              value={[filters.maxPrice]} 
              min={0} 
              max={15000} 
              step={100}
              onValueChange={([val]) => setFilters(f => ({ ...f, maxPrice: val }))}
              className="[&_.relative.h-2]:bg-muted/60 [&_[role=slider]]:bg-white [&_[role=slider]]:border-[0.5px] [&_[role=slider]]:border-black/10 [&_[role=slider]]:h-[28px] [&_[role=slider]]:w-[28px] [&_[role=slider]]:shadow-[0_2px_8px_rgba(0,0,0,0.15)] [&_[role=slider]]:transition-transform [&_[role=slider]]:active:scale-95"
            />
          </div>

        </div>

        <div className="absolute bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-background via-background to-transparent pt-12 pb-8">
          <Button 
            onClick={handleApply}
            className="w-full h-[52px] rounded-2xl text-[16px] font-bold bg-foreground hover:bg-foreground/90 text-background shadow-lg transition-all active:scale-[0.98]"
          >
            Show Results
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
};
