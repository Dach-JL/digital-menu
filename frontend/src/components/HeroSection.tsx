import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const languages = [
  { code: 'en', name: 'Eng' },
  { code: 'am', name: 'አማ' },
  { code: 'om', name: 'Oro' },
];

export const HeroSection: React.FC = () => {
  const { t, i18n } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  const currentLangLabel = languages.find(l => l.code === i18n.language)?.name || 'Eng';

  return (
    <section className="relative w-full" style={{ height: '360px' }}>
      {/* Background image */}
      <img
        src="/hero-bg-new.jpg"
        className="absolute inset-0 w-full h-full object-cover"
        style={{ objectPosition: 'center 30%' }}
        alt="Delicious food spread"
      />

      {/* Content Layer */}
      <div className="relative flex flex-col px-5 pt-[30px] h-full z-10">
        {/* Top bar: Hotel Logo and Language */}
        <div className="flex items-center justify-between w-full">
          <div className="flex-1 flex items-center gap-3">
            {/* Instagram Link */}
            <a 
              href="https://www.instagram.com/darosinternational?igsh=emx2am10Mjh4M3ll" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:scale-110 active:scale-95 transition-all"
              aria-label="Instagram"
            >
              <img 
                src="/instagram.png" 
                alt="Instagram" 
                className="w-5 h-5 object-contain"
              />
            </a>

            {/* TikTok Link */}
            <a 
              href="https://www.tiktok.com/@daros.internationalhotel" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:scale-110 active:scale-95 transition-all"
              aria-label="TikTok"
            >
              <img 
                src="/tiktok.png" 
                alt="TikTok" 
                className="w-5 h-5 object-contain"
              />
            </a>
          </div>
          
          <div className="flex items-center gap-2 justify-center flex-[2]">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 16h18l-2.5-7-3.5 4-3-6-3 6-3.5-4L3 16Z" fill="white" />
              <rect x="3" y="17.5" width="18" height="2" fill="white" />
              <circle cx="3" cy="8" r="1.5" fill="white" />
              <circle cx="12" cy="3.5" r="1.5" fill="white" />
              <circle cx="21" cy="8" r="1.5" fill="white" />
            </svg>
            <span className="text-white font-medium tracking-wide text-[16px]">Royal Hotel</span>
          </div>

          <div className="flex-1 flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1.5 text-white/90 hover:text-white transition-colors text-[11px] font-light">
                  <span className="opacity-90">{currentLangLabel}</span>
                  <Globe className="h-3.5 w-3.5 opacity-90" strokeWidth={1.5} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-background border border-border shadow-lg min-w-[120px]">
                {languages.map((lang) => (
                  <DropdownMenuItem key={lang.code} onSelect={() => changeLanguage(lang.code)} className="hover:bg-muted cursor-pointer">
                    {lang.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Tagline */}
        <div className="mt-[70px]">
          <h1
            className="text-[36px] font-bold leading-[1.1] tracking-tight text-white drop-shadow-md"
          >
            Your Table,<br />
            <span className="italic">Your Taste</span>
          </h1>
        </div>
      </div>
    </section>
  );
};
