import React, { useState, useMemo } from 'react';
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

const Index = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>(initialFilterState);

  const { user } = useUser();

  const { data: services = [], isLoading: servicesLoading, error: servicesError } = useServices();
  const { data: favorites = [], isLoading: favoritesLoading } = useFavorites(user?.id);

  const isLoading = servicesLoading || (!!user && favoritesLoading && favorites.length === 0);
  const error = servicesError ? (servicesError as Error).message : '';

  // Derive products list from services and favorites
  const products = useMemo(() => {
    const availableServices = services.filter((s) => s.is_available);
    const favoriteSet = new Set(favorites);

    return availableServices.map((item) => ({
      ...item,
      id: String(item.id),
      price: item.price,
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

  const handleFavoriteToggleNoop = () => {
    // React Query handles cache invalidation and UI syncing
  };

  return (
    <div className="bg-background text-foreground flex max-w-[480px] w-full flex-col overflow-x-hidden mx-auto min-h-screen pb-28">
      <div className="relative w-full">
        <RoomBadge />
        <HeroSection />
      </div>

      <main className="flex flex-col w-full flex-1 px-5 relative z-10 bg-background rounded-t-[32px] -mt-[40px] pt-6 shadow-[0_-8px_30px_rgba(0,0,0,0.05)]">
        <SearchBar onSearch={setSearchQuery} onFilterClick={() => setIsFilterOpen(true)} />
        <CategoryTabs onCategoryChange={setActiveCategory} />
        <ProductList
          products={products}
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
    </div>
  );
};

export default Index;
