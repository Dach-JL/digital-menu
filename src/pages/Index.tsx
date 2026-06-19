import React, { useState, useEffect, useMemo } from 'react';
import { HeroSection } from '@/components/HeroSection';
import { SearchBar } from '@/components/SearchBar';
import { CategoryTabs } from '@/components/CategoryTabs';
import { ProductList, Product } from '@/components/ProductList';
import { BottomNavigation } from '@/components/BottomNavigation';
import { FilterDrawer, FilterState, initialFilterState } from '@/components/FilterDrawer';
import { useUser } from '@/contexts/UserContext';
import { RoomBadge } from '@/components/RoomBadge';
import { FloatingCart } from '@/components/FloatingCart';
import { FloatingCallWaiter } from '@/components/FloatingCallWaiter';
import { useServiceStore } from '@/stores/serviceStore';
import { useFavoritesStore } from '@/stores/favoritesStore';
import { useShallow } from 'zustand/react/shallow';

const Index = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>(initialFilterState);

  const { user } = useUser();

  // Selectors from serviceStore
  const { services, isLoading, error, fetchServices } = useServiceStore(
    useShallow((state) => ({
      services: state.services,
      isLoading: state.loading,
      error: state.error,
      fetchServices: state.fetchServices,
    }))
  );

  // Selectors from favoritesStore
  const { favorites, fetchFavorites } = useFavoritesStore(
    useShallow((state) => ({
      favorites: state.favorites,
      fetchFavorites: state.fetchFavorites,
    }))
  );

  // Initialize service catalog
  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  // Sync favorites if guest user is logged in
  useEffect(() => {
    if (user?.id) {
      fetchFavorites(user.id);
    }
  }, [user, fetchFavorites]);

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
    // Favorites now handle state management optimistically in favoritesStore
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
