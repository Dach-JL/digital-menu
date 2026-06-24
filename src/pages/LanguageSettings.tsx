import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Check, Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Header } from '@/components/Header';
import { BottomNavigation } from '@/components/BottomNavigation';

const LanguageSettings = () => {
    const navigate = useNavigate();
    const { i18n } = useTranslation();

    const languages = [
        { id: 'en', name: 'English', native: 'English' },
        { id: 'am', name: 'Amharic', native: 'አማርኛ' },
        { id: 'om', name: 'Oromo', native: 'Afaan Oromoo' },
    ];

    const handleSelect = (id: string) => {
        i18n.changeLanguage(id);
        // Automatically navigate back as requested
        setTimeout(() => navigate('/profile'), 150); 
    };

    return (
        <div className="bg-background flex max-w-[480px] md:max-w-full w-full flex-col overflow-hidden items-center mx-auto min-h-screen relative pb-24 page-transition">
            <Header />

            <main className="flex flex-col w-full px-6 md:px-12 lg:px-20 xl:px-28 py-6 pt-2">
                <div className="flex items-center gap-4 mb-10">
                    <button
                        onClick={() => navigate('/profile')}
                        className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-foreground hover:scale-110 active:scale-95 transition-transform shadow-sm"
                        aria-label="Go back"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <h1 className="text-2xl font-bold text-foreground tracking-tight">Language</h1>
                </div>

                <div className="space-y-4">
                    {languages.map((lang) => (
                        <div
                            key={lang.id}
                            onClick={() => handleSelect(lang.id)}
                            className={`flex items-center justify-between p-5 rounded-[2rem] border-2 transition-all cursor-pointer active:scale-[0.98] ${
                                i18n.language === lang.id
                                    ? 'bg-zinc-900 border-zinc-900 text-white dark:bg-white dark:border-white dark:text-zinc-950 shadow-xl shadow-zinc-900/10 dark:shadow-white/5'
                                    : 'bg-card border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900'
                            }`}
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                                    i18n.language === lang.id ? 'bg-white/10 dark:bg-zinc-950/5' : 'bg-zinc-100 dark:bg-zinc-800'
                                }`}>
                                    <Languages className={`w-6 h-6 ${i18n.language === lang.id ? 'text-inherit' : 'text-zinc-400'}`} />
                                </div>
                                <div className="flex flex-col">
                                    <p className="font-extrabold text-base leading-none mb-1">{lang.native}</p>
                                    <p className={`text-[10px] uppercase font-bold tracking-[0.1em] opacity-50`}>
                                        {lang.name}
                                    </p>
                                </div>
                            </div>
                            {i18n.language === lang.id && (
                                <div className="w-7 h-7 rounded-full bg-current flex items-center justify-center">
                                    <Check className={`w-4 h-4 ${i18n.language === lang.id ? (i18n.language === 'en' || i18n.language === 'am' || i18n.language === 'om' ? 'text-white dark:text-zinc-950' : '') : ''}`} strokeWidth={4} />
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <div className="mt-12 p-8 rounded-[2.5rem] bg-zinc-50 dark:bg-zinc-900/30 border border-zinc-100 dark:border-zinc-800/50 text-center">
                    {/* Auto-Translation Activated Badge */}
                    <div className="flex items-center gap-2 py-2 px-4 bg-muted/30 text-muted-foreground/60 rounded-full justify-center w-fit mx-auto border border-border/40 mb-2">
                        <div className="w-1.5 h-1.5 bg-green-500/30 rounded-full" />
                        <span className="text-[9px] font-bold uppercase tracking-[0.1em]">Global Auto-Translation Active</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-widest leading-relaxed">
                        Artificial Intelligence powered translation is active for dynamic content.
                    </p>
                </div>
            </main>

            <BottomNavigation />
        </div>
    );
};

export default LanguageSettings;
