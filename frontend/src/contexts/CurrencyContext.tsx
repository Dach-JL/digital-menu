import React, { createContext, useContext, useState, useEffect } from 'react';

type Currency = 'ETB' | 'USD';

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  exchangeRate: number; // 1 ETB = X USD
  formatPrice: (priceETB: number | string) => string;
  isLoading: boolean;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currency, setCurrencyState] = useState<Currency>(() => {
    return (localStorage.getItem('user-currency') as Currency) || 'ETB';
  });
  const [exchangeRate, setExchangeRate] = useState<number>(1 / 157.50); // Default fallback: 1 USD = 157.50 ETB
  const [isLoading, setIsLoading] = useState(true);

  const setCurrency = (newCurrency: Currency) => {
    setCurrencyState(newCurrency);
    localStorage.setItem('user-currency', newCurrency);
  };

  useEffect(() => {
    const fetchRate = async () => {
      try {
        const response = await fetch('https://api.exchangerate-api.com/v4/latest/ETB');
        const data = await response.json();
        if (data && data.rates && data.rates.USD) {
          setExchangeRate(data.rates.USD);
          console.log(`Live Exchange Rate Fetched: 1 ETB = ${data.rates.USD} USD (1 USD = ${1 / data.rates.USD} ETB)`);
        }
      } catch (error) {
        console.error("Failed to fetch live exchange rate, using fallback.", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRate();
  }, []);

  const formatPrice = (priceETB: number | string): string => {
    const numPrice = typeof priceETB === 'string' ? parseFloat(priceETB) : priceETB;
    if (isNaN(numPrice)) return 'N/A';

    if (currency === 'ETB') {
      return `${Math.round(numPrice).toLocaleString()} ETB`;
    } else {
      const usdPrice = numPrice * exchangeRate;
      // Show 2 decimal places for USD
      return `$${usdPrice.toFixed(2)}`;
    }
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, exchangeRate, formatPrice, isLoading }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};
