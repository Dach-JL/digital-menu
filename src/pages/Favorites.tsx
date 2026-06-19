import React, { useMemo } from 'react';
import { BottomNavigation } from '@/components/BottomNavigation';
import { ProductCard } from '@/components/ProductCard';
import { useUser } from '@/contexts/UserContext';
import { Heart } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useServices, useFavorites } from '@/hooks/useQueries';
import { Product } from '@/types/Product';

const Favorites = () => {
  const { user } = useUser();
  const { t } = useTranslation();

  const { data: services = [], isLoading: servicesLoading } = useServices(false);
  const { data: favoriteIds = [], isLoading: favoritesLoading } = useFavorites(user?.id);

  const favoriteProducts = useMemo<Product[]>(() => {
    return services
      .filter((service) => favoriteIds.includes(Number(service.id)))
      .map((service) => ({
        ...service,
        id: String(service.id),
        name_am: service.name_am || "",
        name_om: service.name_om || "",
        description_am: service.description_am || "",
        description_om: service.description_om || "",
        isFavoritedInitially: true,
        rating: 5,
        reviewCount: '0',
        image: service.image_url || '/placeholder.svg',
      }));
  }, [services, favoriteIds]);

  const isLoading = servicesLoading || favoritesLoading;

  if (!user) {
    return (
      <div className="bg-background flex max-w-[480px] w-full flex-col overflow-hidden mx-auto min-h-screen pb-28">
        <main className="flex flex-col w-full flex-1 px-5 pt-14 items-center justify-center">
          <Heart className="w-16 h-16 text-muted-foreground mb-4" />
          <p className="text-center text-muted-foreground">{t('favorites.login_prompt')}</p>
        </main>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="bg-background flex max-w-[480px] w-full flex-col overflow-hidden mx-auto min-h-screen pb-28 page-transition">
      <main className="flex flex-col w-full flex-1 px-5 pt-14">
        <h1 className="text-2xl font-bold text-foreground mb-5">Favorite</h1>
        {isLoading && <p className="text-center text-muted-foreground">{t('messages.loading')}</p>}
        {!isLoading && favoriteProducts.length > 0 && (
          <div className="grid grid-cols-2 gap-3 items-start mt-3">
             <div className="flex flex-col gap-3">
                {favoriteProducts.filter((_, i) => i % 2 === 0).map((product, i) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    index={i * 2}
                  />
                ))}
            </div>
             <div className="flex flex-col gap-3">
                {favoriteProducts.filter((_, i) => i % 2 === 1).map((product, i) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    index={i * 2 + 1}
                  />
                ))}
            </div>
          </div>
        )}
        {!isLoading && favoriteProducts.length === 0 && (
          <div className="text-center mt-16">
            <Heart className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-foreground">{t('favorites.empty_title')}</h2>
            <p className="text-muted-foreground mt-2 text-sm">{t('favorites.empty_description')}</p>
          </div>
        )}
      </main>
      <BottomNavigation />
    </div>
  );
};

export default Favorites;