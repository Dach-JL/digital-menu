import React, { useState, useEffect } from 'react';
import { uploadsUrl } from '@/config/api';
import { useUser } from '@/contexts/UserContext';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Heart, Plus } from 'lucide-react';
import { Product } from '@/types/Product';
import { useNavigate } from 'react-router-dom';
import { useRoomMode } from '@/contexts/RoomContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useFavorites, useToggleFavoriteMutation } from '@/hooks/useQueries';

interface ProductCardProps {
  product: Product;
  onFavoriteToggle?: () => void;
  index?: number;
}

const getTranslated = (product: Product, field: 'name' | 'description', lang: string) => {
  const key = `${field}_${lang}` as keyof Product;
  const fallbackKey = `${field}_en` as keyof Product;
  return product[key] || product[fallbackKey];
};

export const ProductCard: React.FC<ProductCardProps> = ({ product, onFavoriteToggle, index = 0 }) => {
  const { user } = useUser();
  const { isRoomMode, addToCart } = useRoomMode();
  const { t, i18n } = useTranslation();
  const { formatPrice } = useCurrency();
  const navigate = useNavigate();
  const [translatedName, setTranslatedName] = useState<string>("");

  const { data: favorites = [] } = useFavorites(user?.id);
  const toggleFavoriteMutation = useToggleFavoriteMutation();

  const isFavorited = favorites.includes(Number(product.id));
  const displayName = translatedName || getTranslated(product, 'name', i18n.language);

  // Handle Auto-Translation
  useEffect(() => {
    const currentLang = i18n.language;
    const existingTranslation = getTranslated(product, 'name', currentLang);
    
    if (currentLang !== 'en' && !existingTranslation) {
      import('@/utils/translator').then(({ translateAndPersist }) => {
        translateAndPersist(Number(product.id), product.name_en, currentLang, 'name')
          .then(setTranslatedName);
      });
    } else {
      setTranslatedName("");
    }
  }, [i18n.language, product]);

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      toast.error("You must be logged in to add or remove favorites.");
      return;
    }

    await toggleFavoriteMutation.mutateAsync({ userId: user.id, serviceId: Number(product.id) });
    const isNowFavorited = !isFavorited;
    toast.success(`${displayName} ${isNowFavorited ? 'added to' : 'removed from'} favorites.`);
    onFavoriteToggle?.();
  };

  const handleAddClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToCart({
      id: product.id,
      name_en: String(displayName),
      price: product.price,
      image_url: product.image_url,
    });
  };

  const isShorter = index % 4 === 0 || index % 4 === 3;

  return (
    <article
      onClick={() => navigate(`/product/${product.id}`)}
      className="bg-card cursor-pointer rounded-2xl flex flex-col relative transition-shadow hover:shadow-lg border border-border/10"
    >
      {/* Rectangular product image with padding */}
      <div className="w-full p-1 pb-0">
        <div className={`w-full overflow-hidden relative rounded-xl ${isShorter ? 'h-[130px]' : 'h-[160px]'}`}>
          <img
            src={uploadsUrl(product.image_url)}
            className="w-full h-full object-cover"
            alt={String(displayName)}
            onError={(e) => { e.currentTarget.src = '/placeholder.svg'; }}
          />

          {/* Add Button - top left */}
          {isRoomMode && (
            <button
              onClick={handleAddClick}
              className="absolute top-2 left-2 z-10 bg-primary text-primary-foreground h-7 w-7 rounded-full flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-transform"
              aria-label="Add to room order"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}

          {/* Favorite heart button - top right with translucent circle */}
          <button
            onClick={handleFavoriteClick}
            className="absolute top-2 right-2 z-10 w-7 h-7 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center transition-transform hover:scale-110"
            aria-label={`Toggle ${String(displayName)} as a favorite`}
          >
            <Heart
              className={`w-3.5 h-3.5 transition-colors ${isFavorited
                ? 'fill-red-500 text-red-500'
                : 'text-white'
                }`}
            />
          </button>
        </div>
      </div>

      {/* Product info */}
      <div className="px-3 pt-3 pb-4">
        <h3 className="text-sm font-bold text-foreground leading-tight mb-1 line-clamp-1">
          {String(displayName)}
        </h3>
        <p className="text-foreground text-sm font-bold">
          {formatPrice(product.price)}
        </p>
      </div>
    </article>
  );
};