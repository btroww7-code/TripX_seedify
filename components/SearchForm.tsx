import React, { useState } from 'react';
import { PlacesAutocomplete } from './PlacesAutocomplete';

interface SearchFormProps {
    onSearch: (from: string, to: string, dateTime: string) => void;
    isLoading: boolean;
    getSuggestions: (query: string) => Promise<string[]>;
}

export const SearchForm: React.FC<SearchFormProps> = ({ onSearch, isLoading, getSuggestions }) => {
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [dateTime, setDateTime] = useState(new Date().toISOString().slice(0, 16));
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!from || !to) {
            setError('Proszę wypełnić pole "Skąd" i "Dokąd".');
            return;
        }
        setError('');
        onSearch(from, to, dateTime);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <PlacesAutocomplete
                label="Skąd"
                value={from}
                onChange={setFrom}
                getSuggestions={getSuggestions}
                placeholder="np. Warszawa, Dworzec Centralny"
            />
            <PlacesAutocomplete
                label="Dokąd"
                value={to}
                onChange={setTo}
                getSuggestions={getSuggestions}
                placeholder="np. Kraków, Rynek Główny"
            />
            <div>
                <label htmlFor="datetime" className="block text-sm font-medium text-gray-300">Data i godzina</label>
                <input
                    type="datetime-local"
                    id="datetime"
                    value={dateTime}
                    onChange={(e) => setDateTime(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm text-gray-200"
                />
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}
            
            <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 disabled:bg-slate-500 disabled:cursor-not-allowed transition-colors"
            >
                {isLoading ? (
                    <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Szukanie...
                    </>
                ) : 'Znajdź połączenie'}
            </button>
        </form>
    );
};
