import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Check, DollarSign, Coins } from 'lucide-react';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Header } from '@/components/Header';
import { BottomNavigation } from '@/components/BottomNavigation';

const CurrencySettings = () => {
    const navigate = useNavigate();
    const { currency, setCurrency } = useCurrency();

    const currencies = [
        { id: 'ETB', name: 'Ethiopian Birr', symbol: 'ETB', icon: <Coins className="w-5 h-5" /> },
        { id: 'USD', name: 'United States Dollar', symbol: 'USD', icon: <DollarSign className="w-5 h-5" /> },
    ];

    const handleSelect = (id: 'ETB' | 'USD') => {
        setCurrency(id);
        // Automatically navigate back as requested
        setTimeout(() => navigate('/profile'), 150); 
    };

    return (
        <div className="bg-background flex max-w-[480px] md:max-w-full w-full flex-col overflow-hidden items-center mx-auto min-h-screen relative pb-24 page-transition">
            <Header />

            <main className="flex flex-col w-full px-6 md:px-12 lg:px-20 xl:px-28 py-6 pt-2">
                <div className="flex items-center gap-4 mb-8">
                    <button
                        onClick={() => navigate('/profile')}
                        className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-foreground hover:scale-110 active:scale-95 transition-transform shadow-sm"
                        aria-label="Go back"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <h1 className="text-2xl font-bold text-foreground">Currency</h1>
                </div>

                <div className="space-y-3">
                    {currencies.map((curr) => (
                        <div
                            key={curr.id}
                            onClick={() => handleSelect(curr.id as 'ETB' | 'USD')}
                            className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer active:scale-[0.98] ${
                                currency === curr.id
                                    ? 'bg-zinc-900 border-zinc-900 text-white dark:bg-white dark:border-white dark:text-black shadow-lg shadow-black/10'
                                    : 'bg-card border-border hover:bg-muted text-foreground'
                            }`}
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                    currency === curr.id ? 'bg-white/20 dark:bg-black/10' : 'bg-muted'
                                }`}>
                                    {curr.icon}
                                </div>
                                <div>
                                    <p className="font-bold text-sm tracking-tight">{curr.name}</p>
                                    <p className={`text-[10px] uppercase font-bold tracking-widest opacity-60`}>
                                        {curr.symbol}
                                    </p>
                                </div>
                            </div>
                            {currency === curr.id && (
                                <div className="w-6 h-6 rounded-full bg-current flex items-center justify-center">
                                    <Check className={`w-3.5 h-3.5 ${currency === curr.id ? 'text-zinc-900 dark:text-white' : ''}`} strokeWidth={4} />
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <div className="mt-12 p-6 rounded-2xl bg-muted/40 border border-border/50 text-center">
                    <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                        Prices are converted in real-time based on global market rates. Base prices are stored in ETB.
                    </p>
                </div>
            </main>

            <BottomNavigation />
        </div>
    );
};

export default CurrencySettings;
