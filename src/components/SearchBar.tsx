import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, SlidersHorizontal } from 'lucide-react';

interface SearchBarProps {
  onSearch?: (query: string) => void;
  onFilterClick?: () => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({ onSearch, onFilterClick }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const { t } = useTranslation();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    onSearch?.(value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(searchQuery);
  };

  return (
    <div className="flex items-center gap-3 w-full md:max-w-xl md:mx-auto mt-5">
      <form
        onSubmit={handleSubmit}
        className="flex-1 flex items-center gap-3 bg-card border border-border rounded-2xl px-4 py-3 transition-shadow focus-within:shadow-md"
      >
        <Search className="h-5 w-5 text-muted-foreground shrink-0" />
        <input
          type="text"
          value={searchQuery}
          onChange={handleInputChange}
          placeholder={t('search.placeholder')}
          className="flex-1 bg-transparent outline-none text-foreground placeholder-muted-foreground text-sm"
          aria-label="Search menu"
        />
      </form>
      <button
        onClick={onFilterClick}
        type="button"
        className="flex items-center justify-center w-12 h-12 rounded-2xl bg-card border border-border hover:bg-accent transition-colors shrink-0"
        aria-label="Filter"
      >
        <SlidersHorizontal className="h-5 w-5 text-foreground" />
      </button>
    </div>
  );
};
