import React, { useState, useEffect } from 'react';
import { apiUrl, uploadsUrl } from '@/config/api';
import { useParams, useNavigate } from 'react-router-dom';
import { getCachedProducts } from '@/lib/pageCache';
import { useTranslation } from 'react-i18next';
import { useUser } from '@/contexts/UserContext';
import { Heart, ChevronLeft, Check, Plus, Minus, Info, Bed, Sofa, Utensils, Zap, Users, Maximize } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useRoomMode } from '@/contexts/RoomContext';
import { useCurrency } from '@/contexts/CurrencyContext';

const TranslatedItem = ({ text }: { text: string }) => {
  const { i18n } = useTranslation();
  const [translated, setTranslated] = useState(text);

  useEffect(() => {
    if (i18n.language === 'en') {
      setTranslated(text);
      return;
    }
    
    import('@/utils/translator').then(({ translateText }) => {
        translateText(text, i18n.language).then(setTranslated);
    });
  }, [text, i18n.language]);

  return <span className="truncate">{translated}</span>;
}

export const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useUser();
  const { t, i18n } = useTranslation();
  const { formatPrice } = useCurrency();
  const { isRoomMode, addToCart } = useRoomMode();

  const [product, setProduct] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFavorited, setIsFavorited] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [translatedName, setTranslatedName] = useState("");
  const [translatedDesc, setTranslatedDesc] = useState("");

  useEffect(() => {
    const fetchProductDetails = async () => {
      if (!id) return;

      // ── 1. Try to serve from the in-memory cache immediately ──
      const cached = getCachedProducts();
      const cachedProduct = cached?.find((s) => String(s.id) === String(id));
      if (cachedProduct) {
        setProduct(cachedProduct);
        if (cachedProduct.ingredients) {
          try { setIngredients(JSON.parse(cachedProduct.ingredients)); } catch { setIngredients([]); }
        }
        // Still check favorites in the background, but don't show a spinner
        if (user) {
          fetch(apiUrl(`/favorites.php?user_id=${user.id}`))
            .then(r => r.ok ? r.json() : [])
            .then((favoritesData: any[]) => {
              if (Array.isArray(favoritesData)) {
                setIsFavorited(favoritesData.some((fav) => String(fav.service_id) === String(id)));
              }
            })
            .catch(() => {});
        }
        setIsLoading(false);
        return;
      }

      // ── 2. Cache miss — fetch from network (e.g. direct URL / deep link) ──
      setIsLoading(true);
      try {
        const [servicesRes, favoritesRes] = await Promise.all([
          fetch(apiUrl('/services.php')),
          user ? fetch(apiUrl(`/favorites.php?user_id=${user.id}`)) : Promise.resolve(null)
        ]);

        if (!servicesRes.ok) throw new Error('Failed to fetch services');
        const servicesData = await servicesRes.json();
        const foundProduct = Array.isArray(servicesData)
          ? servicesData.find((s: any) => String(s.id) === String(id))
          : servicesData;

        if (!foundProduct) throw new Error('Product not found');

        let isFav = false;
        if (favoritesRes && favoritesRes.ok) {
          const favoritesData = await favoritesRes.json();
          if (Array.isArray(favoritesData)) {
            isFav = favoritesData.some((fav: any) => String(fav.service_id) === String(id));
          }
        }

        setProduct(foundProduct);
        setIsFavorited(isFav);
        if (foundProduct.ingredients) {
          try { setIngredients(JSON.parse(foundProduct.ingredients)); } catch { setIngredients([]); }
        }
      } catch (err: any) {
        console.error('ProductDetail Error:', err);
        toast.error(err.message || 'Failed to load product details.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchProductDetails();
  }, [id, user]);

  const handleFavoriteClick = async () => {
    if (!user) {
      toast.error("You must be logged in to manage favorites.");
      return;
    }
    const endpoint = apiUrl('/favorites.php');
    const payload = { user_id: user.id, service_id: product.id };
    const method = isFavorited ? 'DELETE' : 'POST';

    try {
      const response = await fetch(endpoint, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();

      if (response.ok && result.success) {
        toast.success(`${getTranslatedName()} ${isFavorited ? 'removed from' : 'added to'} favorites.`);
        setIsFavorited(!isFavorited);
      } else {
        toast.error(result.error || `Failed to update favorites.`);
      }
    } catch (err) {
      toast.error("An error occurred while managing favorites.");
    }
  };

  const getTranslatedName = () => {
    if (translatedName) return translatedName;
    const lang = i18n.language;
    if (lang === 'am' && product?.name_am) return product.name_am;
    if (lang === 'om' && product?.name_om) return product.name_om;
    if (lang === 'sid' && product?.name_sid) return product.name_sid; 
    return product?.name_en || '';
  };

  const getTranslatedDescription = () => {
    if (translatedDesc) return translatedDesc;
    const lang = i18n.language;
    if (lang === 'am' && product?.description_am) return product.description_am;
    if (lang === 'om' && product?.description_om) return product.description_om;
    if (lang === 'sid' && product?.description_sid) return product.description_sid;
    return product?.description_en || '';
  };

  // Auto-translate name and description
  useEffect(() => {
    const currentLang = i18n.language;
    if (!product || currentLang === 'en') {
      setTranslatedName("");
      setTranslatedDesc("");
      return;
    }

    const nameInLang = getTranslatedName();
    const descInLang = getTranslatedDescription();

    import('@/utils/translator').then(({ translateAndPersist }) => {
      // If the specific column is empty or still English, translate it
      if (!nameInLang || nameInLang === product.name_en) {
        translateAndPersist(Number(product.id), product.name_en, currentLang, 'name')
          .then(setTranslatedName);
      }
      if (!descInLang || descInLang === product.description_en) {
        translateAndPersist(Number(product.id), product.description_en, currentLang, 'description')
          .then(setTranslatedDesc);
      }
    });
  }, [i18n.language, product]);

  if (isLoading) {
    return (
      <div className="bg-background flex max-w-[480px] w-full min-h-screen mx-auto items-center justify-center page-transition">
        <p className="text-muted-foreground">{t('messages.loading')}</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="bg-background flex max-w-[480px] w-full min-h-screen mx-auto flex-col items-center justify-center px-5 page-transition">
        <p className="text-xl font-semibold mb-4 text-foreground">Product not found</p>
        <button onClick={() => navigate(-1)} className="text-zinc-500 dark:text-zinc-400 font-medium underline">Go Back</button>
      </div>
    );
  }

  const imageUrl = product.image_url
    ? (product.image_url.startsWith('http') ? product.image_url : uploadsUrl(product.image_url))
    : '/placeholder.svg';

  const addOns = [
    { name: "Extra Protein 1 scoop", price: "350 ETB" },
    { name: "Extra Mixed Nuts", price: "250 ETB" },
    { name: "Extra Berries", price: "200 ETB" },
  ];

  return (
    <div className="bg-background text-foreground flex max-w-[480px] w-full flex-col overflow-x-hidden mx-auto min-h-screen pb-6 page-transition relative">
      <button
        onClick={() => navigate(-1)}
        className="fixed top-6 left-5 z-50 w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/20 shadow-lg active:scale-95 transition-transform"
        aria-label="Go back"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>

      {/* Hero Section with full section image and perfect asymmetrical curve */}
      <div className="relative w-full h-[420px] overflow-hidden flex items-center justify-center shadow-md">
        <img
          src={imageUrl}
          alt={getTranslatedName()}
          className="absolute inset-0 w-full h-full object-cover"
          onError={(e) => { e.currentTarget.src = '/placeholder.svg'; }}
        />
        <div className="absolute inset-0 bg-black/10 z-[5]"></div>
        
        <div className="absolute inset-x-0 bottom-[-1px] z-10 w-full">
            <svg 
              viewBox="0 0 500 150" 
              preserveAspectRatio="none" 
              className="w-full h-[100px] text-background fill-current"
            >
              <path d="M-1.41,83.38 C141.93,178.12 344.52,-69.56 501.97,105.10 L500.00,150.00 L0.00,150.00 Z" />
            </svg>
        </div>
      </div>

      <div className="flex-1 w-full px-6 -mt-12 relative z-20">
        <div className="flex justify-between items-center w-full mb-3">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm rounded-full border border-border/50 text-[10px] font-bold uppercase tracking-wider text-muted-foreground shadow-sm">
            {product.type === 'room' ? <Bed className="w-3 h-3 text-zinc-500 dark:text-zinc-400" /> : <Utensils className="w-3 h-3 text-zinc-500 dark:text-zinc-400" />}
            {product.type === 'room' ? 'Room Service' : product.type}
          </div>
          <button
            onClick={handleFavoriteClick}
            className="w-11 h-11 bg-white dark:bg-zinc-800 rounded-full flex items-center justify-center shadow-[0_8px_30px_rgba(0,0,0,0.1)] text-zinc-900 dark:text-white hover:scale-110 active:scale-95 transition-transform"
            aria-label="Toggle favorite"
          >
            <Heart
              className={`w-5.5 h-5.5 transition-colors ${isFavorited ? 'fill-current text-zinc-900 dark:text-white' : 'text-current'}`}
              strokeWidth={2.5}
            />
          </button>
        </div>

        <div className="flex justify-between items-start mb-2">
          <h1 className="text-2xl font-bold text-[#1E2022] dark:text-white w-[60%] leading-tight">{getTranslatedName()}</h1>
          <span className="text-xl font-extrabold text-zinc-900 dark:text-white">{formatPrice(Number(product.price))}</span>
        </div>

        <p className="text-muted-foreground text-sm font-medium leading-relaxed mb-6">
          {getTranslatedDescription() || "Discover the delightful flavors of this carefully prepared dish, featuring high-quality ingredients and a balance of spices that ensure a satisfying culinary experience."}
        </p>

        {/* Ingredients / Room Features */}
        {ingredients.length > 0 && (
          <div className="mb-6 animate-in slide-in-from-bottom-2 duration-500">
            <h2 className="text-base font-bold text-[#1E2022] dark:text-white mb-3">
              {product.type === 'room' ? 'Room Features:' : 'Ingredients:'}
            </h2>
            <ul className={product.type === 'room' ? "grid grid-cols-2 gap-y-2.5 gap-x-4" : "space-y-2"}>
              {ingredients.map((item, index) => (
                <li key={index} className="flex items-center text-sm font-medium text-muted-foreground group">
                  <div className="w-6 h-6 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mr-2.5 group-hover:scale-110 transition-transform">
                    {product.type === 'room' ? (
                      <Zap className="w-3 h-3 text-zinc-900 dark:text-white" />
                    ) : (
                      <Check className="w-3.5 h-3.5 text-zinc-900 dark:text-white" strokeWidth={3} />
                    )}
                  </div>
                  <TranslatedItem text={item} />
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Macros - Only for non-room service */}
        {product.type !== 'room' && (product.macro_kcal || product.macro_protein || product.macro_fat || product.macro_carbs) && (
          <div className="mb-6 animate-in slide-in-from-bottom-4 duration-500">
            <div className="bg-[#1A1A1A] p-4 rounded-2xl border border-border/10 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div className="flex flex-col items-center gap-1.5">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase leading-none tracking-wider">Kcal</span>
                  <span className="text-sm font-extrabold text-white leading-none">{product.macro_kcal || 0}</span>
                </div>
                <div className="flex flex-col items-center gap-1.5">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase leading-none tracking-wider">P</span>
                  <span className="text-sm font-extrabold text-white leading-none">{product.macro_protein || 0}g</span>
                </div>
                <div className="flex flex-col items-center gap-1.5">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase leading-none tracking-wider">F</span>
                  <span className="text-sm font-extrabold text-white leading-none">{product.macro_fat || 0}g</span>
                </div>
                <div className="flex flex-col items-center gap-1.5">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase leading-none tracking-wider">C</span>
                  <span className="text-sm font-extrabold text-white leading-none">{product.macro_carbs || 0}g</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Room Specific UI: Amenities / Quick Info */}
        {product.type === 'room' && (
          <div className="mb-8 grid grid-cols-3 gap-3 animate-in fade-in zoom-in duration-700">
            <div className="bg-card/60 rounded-2xl p-3 border border-border/50 text-center">
              <Bed className="w-5 h-5 text-zinc-500 dark:text-zinc-400 mx-auto mb-1" />
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
                {product.beds || 1} {product.beds === 1 ? 'Bed' : 'Beds'}
              </p>
            </div>
            <div className="bg-card/60 rounded-2xl p-3 border border-border/50 text-center">
              <Users className="w-5 h-5 text-zinc-500 dark:text-zinc-400 mx-auto mb-1" />
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
                {product.max_guests || 2} Guests
              </p>
            </div>
            <div className="bg-card/60 rounded-2xl p-3 border border-border/50 text-center">
              <Sofa className="w-5 h-5 text-zinc-500 dark:text-zinc-400 mx-auto mb-1" />
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Luxury</p>
            </div>
          </div>
        )}

        {/* Add-Ons - Only for non-room and non-drink services */}
        {product.type !== 'room' && product.type !== 'drink' && (
          <div className="mb-8">
            <h2 className="text-base font-bold text-[#1E2022] dark:text-white mb-3">Add-Ons</h2>
            <div className="space-y-2.5">
              {addOns.map((addon, index) => (
                <div key={index} className="flex items-center justify-between text-sm font-medium">
                  <div className="flex items-center w-full group">
                    <div className="w-5 h-5 rounded-md border border-border/60 flex items-center justify-center mr-2 group-hover:bg-accent transition-colors">
                      <Plus className="w-3 h-3 text-muted-foreground" strokeWidth={3} />
                    </div>
                    <span className="text-muted-foreground whitespace-nowrap">{addon.name}</span>
                    <span className="flex-1 border-b border-dashed border-muted-foreground/30 mx-2 relative top-[2px]"></span>
                    <span className="text-zinc-900 dark:text-white font-extrabold ms-auto">{addon.price}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quantity and Action Area (Combined) */}
        {isRoomMode && (
          <div className="flex flex-col gap-4 mb-6 pt-2">
            <div className="flex items-center justify-between bg-muted/30 p-2 rounded-2xl border border-border/50">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  className="w-10 h-10 rounded-xl bg-background border border-border/50 flex items-center justify-center shadow-sm active:scale-95 transition-transform"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="text-lg font-bold w-4 text-center">{quantity}</span>
                <button 
                  onClick={() => setQuantity(q => q + 1)}
                  className="w-10 h-10 rounded-xl bg-background border border-border/50 flex items-center justify-center shadow-sm active:scale-95 transition-transform"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <Button 
                onClick={() => addToCart({ ...product, quantity })}
                className="flex-1 ml-4 bg-primary text-primary-foreground h-12 rounded-xl font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all active:scale-[0.98]"
              >
                {product.type === 'room' ? 'Add To Service' : 'Add To Cart'}
              </Button>
            </div>
          </div>
        )}

        <button
          onClick={() => navigate('/feedback')}
          className="w-full bg-zinc-900 text-white dark:bg-white dark:text-black font-bold text-sm py-[18px] rounded-2xl mt-2 mb-6 shadow-xl shadow-black/10 hover:shadow-black/20 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2"
        >
          <Info className="w-4 h-4" />
          Give us feedback
        </button>
      </div>

    </div>
  );
};

export default ProductDetail;
