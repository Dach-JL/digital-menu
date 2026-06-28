import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Coffee, Utensils, MoonStar, Cake, Check, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface OnboardingWizardProps {
  onComplete: (selections: { language: string; subcategory: string }) => void;
}

const languages = [
  { id: 'en', name: 'English', native: 'English' },
  { id: 'am', name: 'Amharic', native: 'አማርኛ' },
  { id: 'om', name: 'Oromo', native: 'Afaan Oromoo' },
];

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ onComplete }) => {
  const { t, i18n } = useTranslation();
  const [step, setStep] = useState(1);
  const [selectedLanguage, setSelectedLanguage] = useState(i18n.language || 'en');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const handleLanguageSelect = (langId: string) => {
    setSelectedLanguage(langId);
    i18n.changeLanguage(langId);
    // Smooth transition to category selection
    setTimeout(() => {
      setStep(2);
    }, 300);
  };

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    setTimeout(() => {
      onComplete({
        language: selectedLanguage,
        subcategory: category,
      });
    }, 450);
  };

  const categoriesList = [
    {
      id: 'Breakfast',
      labelKey: 'onboarding.categories.Breakfast',
      descriptionKey: 'Breakfast & morning beverages',
      icon: <Coffee className="w-7 h-7 text-amber-500" />,
      bg: 'from-amber-500/10 to-orange-500/10 border-amber-500/20 hover:border-amber-500/50'
    },
    {
      id: 'Meal',
      labelKey: 'onboarding.categories.Meal',
      descriptionKey: 'Lunch, main courses & traditional specialties',
      icon: <Utensils className="w-7 h-7 text-emerald-500" />,
      bg: 'from-emerald-500/10 to-teal-500/10 border-emerald-500/20 hover:border-emerald-500/50'
    },
    {
      id: 'Dinner',
      labelKey: 'onboarding.categories.Dinner',
      descriptionKey: 'Elegant evening courses & night delights',
      icon: <MoonStar className="w-7 h-7 text-indigo-500" />,
      bg: 'from-indigo-500/10 to-violet-500/10 border-indigo-500/20 hover:border-indigo-500/50'
    },
    {
      id: 'Dessert',
      labelKey: 'onboarding.categories.Dessert',
      descriptionKey: 'Sweet desserts, cakes & specialty treats',
      icon: <Cake className="w-7 h-7 text-pink-500" />,
      bg: 'from-pink-500/10 to-rose-500/10 border-pink-500/20 hover:border-pink-500/50'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-md px-4 animate-in fade-in duration-300">
      <div className="relative w-full max-w-[480px] bg-background/95 border border-border/40 backdrop-blur-xl rounded-[2.5rem] p-6 shadow-[0_24px_50px_-12px_rgba(0,0,0,0.15)] flex flex-col min-h-[480px] justify-between overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* Decorative Top Glow */}
        <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

        {/* Header Section */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground font-montserrat">
                Royal Dining Guide
              </span>
            </div>
            
            {/* Step indicator */}
            <div className="flex gap-1">
              <div className={`w-6 h-1 rounded-full transition-all duration-300 ${step === 1 ? 'bg-primary' : 'bg-muted'}`} />
              <div className={`w-6 h-1 rounded-full transition-all duration-300 ${step === 2 ? 'bg-primary' : 'bg-muted'}`} />
            </div>
          </div>

          <h2 className="text-2xl font-extrabold text-foreground tracking-tight mb-1 font-montserrat">
            {step === 1 ? t('onboarding.choose_language') : t('onboarding.choose_category')}
          </h2>
          <p className="text-xs text-muted-foreground font-medium mb-6 leading-relaxed">
            {step === 1 ? t('onboarding.choose_language_desc') : t('onboarding.choose_category_desc')}
          </p>
        </div>

        {/* Content Section */}
        <div className="flex-1 flex flex-col justify-center py-2">
          
          {/* STEP 1: Language selection */}
          {step === 1 && (
            <div className="space-y-3.5 animate-in slide-in-from-right duration-300">
              {languages.map((lang) => {
                const isSelected = selectedLanguage === lang.id;
                return (
                  <button
                    key={lang.id}
                    onClick={() => handleLanguageSelect(lang.id)}
                    className={`flex items-center justify-between p-4.5 rounded-[1.8rem] border-2 transition-all duration-200 w-full text-left cursor-pointer active:scale-[0.98] ${
                      isSelected
                        ? 'bg-foreground border-foreground text-background shadow-lg shadow-foreground/10'
                        : 'bg-card border-border hover:bg-accent/40 text-foreground'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isSelected ? 'bg-background/15' : 'bg-muted'}`}>
                        <Globe className="w-5 h-5 text-current" strokeWidth={2} />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-extrabold text-sm">{lang.native}</span>
                        <span className="text-[10px] uppercase font-bold tracking-wider opacity-60">{lang.name}</span>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="w-6 h-6 rounded-full bg-background flex items-center justify-center">
                        <Check className="w-3.5 h-3.5 text-foreground" strokeWidth={3.5} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* STEP 2: Category selection */}
          {step === 2 && (
            <div className="grid grid-cols-2 gap-3.5 animate-in slide-in-from-right duration-300">
              {categoriesList.map((cat) => {
                const isSelected = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => handleCategorySelect(cat.id)}
                    className={`relative p-4 rounded-[2rem] border-2 bg-gradient-to-br flex flex-col justify-between text-left h-[140px] transition-all duration-300 cursor-pointer active:scale-[0.97] group ${cat.bg} ${
                      isSelected 
                        ? 'border-primary ring-2 ring-primary/20 scale-[0.98]' 
                        : ''
                    }`}
                  >
                    <div className="flex justify-between items-start w-full">
                      <div className="w-11 h-11 rounded-2xl bg-background border border-border/30 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                        {cat.icon}
                      </div>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                          <Check className="w-3 h-3 text-primary-foreground" strokeWidth={3.5} />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-[15px] leading-tight text-foreground">
                        {t(cat.labelKey)}
                      </span>
                      <span className="text-[9px] text-muted-foreground font-medium leading-tight mt-1 opacity-80 group-hover:opacity-100 transition-opacity truncate">
                        {cat.descriptionKey}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

        </div>

        {/* Footer Section */}
        <div className="pt-6 mt-4 border-t border-border/40 flex items-center justify-between">
          {step === 2 ? (
            <Button
              variant="ghost"
              onClick={() => setStep(1)}
              className="text-xs font-bold text-muted-foreground hover:text-foreground rounded-full px-4 h-9"
            >
              Back
            </Button>
          ) : (
            <div />
          )}

          <span className="text-[10px] text-muted-foreground font-bold font-montserrat">
            Step {step} of 2
          </span>
        </div>

      </div>
    </div>
  );
};
