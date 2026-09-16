import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { RoomBadge } from '@/components/RoomBadge';
import { HeroSection } from '@/components/HeroSection';
import { SearchBar } from '@/components/SearchBar';
import { CategoryTabs } from '@/components/CategoryTabs';
import { ProductList } from '@/components/ProductList';
import { FilterDrawer, initialFilterState, type FilterState } from '@/components/FilterDrawer';
import { FloatingCart } from '@/components/FloatingCart';
import { FloatingCallWaiter } from '@/components/FloatingCallWaiter';
import { BottomNavigation } from '@/components/BottomNavigation';
import { useUser } from '@/contexts/UserContext';
import { useServices, useFavorites } from '@/hooks/useQueries';
import { OnboardingWizard } from '@/components/OnboardingWizard';

const Index = () => {
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedSubcategory, setSelectedSubcategory] = useState('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>(initialFilterState);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const { user } = useUser();

  const { data: services = [], isLoading: servicesLoading, error: servicesError } = useServices();
  const { data: favorites = [], isLoading: favoritesLoading } = useFavorites(user?.id);

  const isLoading = servicesLoading || (!!user && favoritesLoading && favorites.length === 0);
  const error = servicesError ? (servicesError as Error).message : '';

  useEffect(() => {
    const room = searchParams.get('room');
    const savedOnboarding = sessionStorage.getItem('onboarding_completed');
    
    // Show onboarding if they scan the QR code (i.e. room param is present in URL)
    // or if onboarding has never been completed in the current session.
    if (room || !savedOnboarding) {
      setShowOnboarding(true);
    }
  }, [searchParams]);

  const handleOnboardingComplete = ({ language, subcategory }: { language: string; subcategory: string }) => {
    sessionStorage.setItem('onboarding_completed', 'true');
    setShowOnboarding(false);
    
    // Automatically set the active category tab to the selected onboarding option
    setActiveCategory(subcategory.toLowerCase());
    setSelectedSubcategory('all');
  };

  const handleCategoryChange = (category: string) => {
    setActiveCategory(category);
    setSelectedSubcategory('all');
  };

  // Derive products list from services and favorites
  const products = useMemo(() => {
    const availableServices = services.filter((s) => s.is_available);
    const favoriteSet = new Set(favorites);

    return availableServices.map((item) => ({
      ...item,
      id: String(item.id),
      price: item.price,
      // Map old legacy 'food' type to 'meal' for backwards compatibility
      type: item.type === 'food' ? 'meal' : item.type,
      rating: 5,
      reviewCount: "0",
      image: item.image_url || "/placeholder.svg",
      isFavoritedInitially: favoriteSet.has(Number(item.id)),
      name_am: item.name_am || "",
      name_om: item.name_om || "",
      description_am: item.description_am || "",
      description_om: item.description_om || "",
    }));
  }, [services, favorites]);

  // Filter products by selected subcategory (food type) if activeCategory is one of the food categories
  const displayedProducts = useMemo(() => {
    if (['breakfast', 'meal', 'dinner', 'dessert'].includes(activeCategory) && selectedSubcategory !== 'all') {
      return products.filter((p) => (p.subcategory || 'Other') === selectedSubcategory);
    }
    return products;
  }, [products, activeCategory, selectedSubcategory]);

  const handleFavoriteToggleNoop = () => {
    // React Query handles cache invalidation and UI syncing
  };

  return (
    <div className="bg-background text-foreground flex max-w-[480px] md:max-w-full w-full flex-col overflow-x-hidden mx-auto min-h-screen pb-28">
      <div className="relative w-full">
        <RoomBadge />
        <HeroSection />
      </div>

      <main className="flex flex-col w-full flex-1 px-5 md:px-8 lg:px-12 xl:px-16 relative z-10 bg-background rounded-t-[32px] -mt-[40px] pt-6 shadow-[0_-8px_30px_rgba(0,0,0,0.05)]">
        <SearchBar onSearch={setSearchQuery} onFilterClick={() => setIsFilterOpen(true)} />
        <CategoryTabs activeCategory={activeCategory} onCategoryChange={handleCategoryChange} />
        
        {/* Horizontal scrollable subcategory chips when a Food Category is selected */}
        {['breakfast', 'meal', 'dinner', 'dessert'].includes(activeCategory) && (
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-3 mt-1 scroll-smooth">
            {['all', ...Array.from(new Set(products.filter(p => p.type === activeCategory).map(p => p.subcategory || 'Other')))].map((sub) => {
              if (!sub) return null;
              return (
                <button
                  key={sub}
                  onClick={() => setSelectedSubcategory(sub)}
                  className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border cursor-pointer active:scale-95 ${
                    selectedSubcategory === sub 
                      ? 'bg-foreground border-foreground text-background shadow-md' 
                      : 'bg-card border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {sub === 'all' ? 'All' : sub}
                </button>
              );
            })}
          </div>
        )}

        <ProductList
          products={displayedProducts}
          isLoading={isLoading}
          error={error}
          searchQuery={searchQuery}
          activeCategory={activeCategory}
          filters={filters}
          onFavoriteToggle={handleFavoriteToggleNoop}
        />
      </main>

      <FloatingCart />
      <FloatingCallWaiter />
      <BottomNavigation />

      <FilterDrawer 
        isOpen={isFilterOpen}
        onClose={setIsFilterOpen}
        activeCategory={activeCategory}
        initialFilters={filters}
        onApplyFilters={setFilters}
      />

      {showOnboarding && (
        <OnboardingWizard onComplete={handleOnboardingComplete} />
      )}
    </div>
  );
};

export default Index;
