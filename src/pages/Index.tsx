import React, { useState, useEffect, useCallback } from 'react';
import { apiUrl } from '@/config/api';
import { getCachedProducts, setCachedProducts } from '@/lib/pageCache';
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
import { pusherClient } from '@/config/pusher';


const Index = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [products, setProducts] = useState<Product[]>(getCachedProducts() || []);
  const [isLoading, setIsLoading] = useState(!getCachedProducts());
  const [error, setError] = useState('');
  
  // Filter state
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>(initialFilterState);

  const { user } = useUser();

  const fetchServicesAndFavorites = useCallback(async (forceBackground = false) => {
    if (!forceBackground && !getCachedProducts()) {
      setIsLoading(true);
    }
    setError('');
    try {
      const [servicesRes, favoritesRes] = await Promise.all([
        fetch(apiUrl('/services.php')),
        user ? fetch(apiUrl(`/favorites.php?user_id=${user.id}`)) : Promise.resolve(null)
      ]);

      if (!servicesRes.ok) throw new Error('Failed to fetch services');

      const servicesData = await servicesRes.json();
      let favoriteIds = new Set();

      if (favoritesRes && favoritesRes.ok) {
        const favoritesData = await favoritesRes.json();
        if(!favoritesData.error){
            favoriteIds = new Set(favoritesData.map((fav: any) => fav.service_id));
        }
      }

      if (servicesData.error) throw new Error(servicesData.error);

      const mappedProducts = servicesData.map((item: any) => ({
        ...item,
        price: item.price,
        rating: 5,
        reviewCount: "0",
        image: item.image_url || "/placeholder.svg",
        isFavoritedInitially: favoriteIds.has(item.id),
      }));

      setCachedProducts(mappedProducts);
      setProducts(mappedProducts);

    } catch (e: any) {
      if (!getCachedProducts()) {
        setError(e.message || "Failed to load services.");
        setProducts([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchServicesAndFavorites(!!getCachedProducts());
  }, [fetchServicesAndFavorites]);

  // Real-time menu updates subscription
  useEffect(() => {
    const channel = pusherClient.subscribe('menu-updates');

    const handleServiceCreated = (newService: any) => {
      setProducts((prevProducts) => {
        // Avoid duplicates if already exists
        if (prevProducts.some((p) => String(p.id) === String(newService.id))) return prevProducts;

        // If the service is created as hidden, do not add it to guest view
        if (!newService.is_available) return prevProducts;

        const mapped: Product = {
          ...newService,
          id: String(newService.id),
          price: newService.price,
          rating: 5,
          reviewCount: "0",
          image: newService.image_url || "/placeholder.svg",
          isFavoritedInitially: false,
        };
        const updated = [mapped, ...prevProducts];
        setCachedProducts(updated);
        return updated;
      });
    };

    const handleServiceUpdated = (updatedService: any) => {
      setProducts((prevProducts) => {
        const isCurrentlyInList = prevProducts.some((p) => String(p.id) === String(updatedService.id));

        if (!updatedService.is_available) {
          // If the item is marked as unavailable/hidden, remove it from the guest view
          if (isCurrentlyInList) {
            const updated = prevProducts.filter((p) => String(p.id) !== String(updatedService.id));
            setCachedProducts(updated);
            return updated;
          }
          return prevProducts;
        }

        // If the item is available but not in the list (e.g. was previously hidden, now unhidden), add it
        if (!isCurrentlyInList) {
          const mapped: Product = {
            ...updatedService,
            id: String(updatedService.id),
            price: updatedService.price,
            rating: 5,
            reviewCount: "0",
            image: updatedService.image_url || "/placeholder.svg",
            isFavoritedInitially: false,
          };
          const updated = [mapped, ...prevProducts];
          setCachedProducts(updated);
          return updated;
        }

        // If the item is available and already in the list, update its details in real-time
        const updated = prevProducts.map((p) => {
          if (String(p.id) === String(updatedService.id)) {
            return {
              ...p,
              ...updatedService,
              id: String(updatedService.id),
              image: updatedService.image_url || "/placeholder.svg",
            };
          }
          return p;
        });
        setCachedProducts(updated);
        return updated;
      });
    };

    const handleServiceDeleted = (data: { id: number }) => {
      setProducts((prevProducts) => {
        const updated = prevProducts.filter((p) => String(p.id) !== String(data.id));
        setCachedProducts(updated);
        return updated;
      });
    };

    channel.bind('service-created', handleServiceCreated);
    channel.bind('service-updated', handleServiceUpdated);
    channel.bind('service-deleted', handleServiceDeleted);

    return () => {
      channel.unbind('service-created', handleServiceCreated);
      channel.unbind('service-updated', handleServiceUpdated);
      channel.unbind('service-deleted', handleServiceDeleted);
      pusherClient.unsubscribe('menu-updates');
    };
  }, []);


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
          onFavoriteToggle={fetchServicesAndFavorites}
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
