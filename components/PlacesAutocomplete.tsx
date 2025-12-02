import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Navigation } from 'lucide-react';

interface PlacesAutocompleteProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    getSuggestions: (query: string) => Promise<string[]>;
    placeholder?: string;
}

export const PlacesAutocomplete: React.FC<PlacesAutocompleteProps> = ({ label, value, onChange, getSuggestions, placeholder }) => {
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const debounceTimeoutRef = useRef<number | null>(null);

    useEffect(() => {
        const handler = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => {
            document.removeEventListener('mousedown', handler);
        };
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const query = e.target.value;
        onChange(query);

        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }

        // Wymagane minimum 2 znaki do wyświetlenia sugestii
        if (query.length < 2) {
            setIsLoading(false);
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        setShowSuggestions(true);
        setIsLoading(true);
        
        // Debounce 500ms dla szybszej odpowiedzi
        debounceTimeoutRef.current = window.setTimeout(async () => {
            try {
                const newSuggestions = await getSuggestions(query);
                setSuggestions(newSuggestions);
            } catch (error) {
                console.error("Error fetching place suggestions:", error);
                setSuggestions([]);
            } finally {
                setIsLoading(false);
            }
        }, 500);
    };

    const handleSelect = (suggestion: string) => {
        onChange(suggestion);
        setSuggestions([]);
        setShowSuggestions(false);
    };

    return (
        <div className="relative" ref={containerRef}>
            <label htmlFor={label} className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
                {label.includes('Skąd') ? <MapPin className="w-4 h-4 text-teal-400" /> : <Navigation className="w-4 h-4 text-teal-400" />}
                {label}
            </label>
            <input
                type="text"
                id={label}
                value={value}
                onChange={handleChange}
                onFocus={() => value.length >= 2 && (suggestions.length > 0 || isLoading) && setShowSuggestions(true)}
                placeholder={placeholder}
                autoComplete="off"
                className="w-full backdrop-blur-lg bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-white/[0.15] focus:bg-white/[0.05] transition-all duration-300"
            />
            {showSuggestions && (
                <ul className="absolute z-20 w-full mt-2 backdrop-blur-xl bg-white/[0.05] border border-white/[0.08] rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.16)] max-h-60 overflow-auto">
                    {isLoading ? (
                        <li className="px-4 py-3 text-sm text-white/60 italic">Loading...</li>
                    ) : suggestions.length > 0 ? (
                        suggestions.map((suggestion, index) => (
                            <li
                                key={index}
                                onClick={() => handleSelect(suggestion)}
                                className="px-4 py-3 text-sm text-white hover:bg-white/[0.05] cursor-pointer transition-all duration-200 border-b border-white/[0.05] last:border-0"
                            >
                                {suggestion}
                            </li>
                        ))
                    ) : (
                         <li className="px-4 py-3 text-sm text-white/60 italic">No suggestions.</li>
                    )}
                </ul>
            )}
        </div>
    );
};