
import React from 'react';
import { Journey } from '../types';
import { ConnectionCard } from './ConnectionCard';

interface ResultsDisplayProps {
    journeys: Journey[];
    isLoading: boolean;
    error: string | null;
    selectedJourney: Journey | null;
    onSelectJourney: (journey: Journey | null) => void;
}

export const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ journeys, isLoading, error, selectedJourney, onSelectJourney }) => {
    if (isLoading) {
        return (
            <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="bg-slate-800 rounded-lg p-4 animate-pulse">
                        <div className="h-4 bg-slate-700 rounded w-3/4 mb-4"></div>
                        <div className="h-3 bg-slate-700 rounded w-1/2"></div>
                    </div>
                ))}
            </div>
        );
    }

    if (error) {
        return <div className="text-center p-8 bg-slate-800 rounded-lg text-red-400">{error}</div>;
    }

    if (journeys.length === 0) {
        return <div className="text-center p-8 bg-slate-800 rounded-lg text-gray-400">Brak wyników. Spróbuj zmienić kryteria wyszukiwania.</div>;
    }

    return (
        <div className="space-y-4">
            {journeys.map((journey, index) => (
                <ConnectionCard 
                    key={index} 
                    journey={journey}
                    onSelect={() => onSelectJourney(journey)}
                    isSelected={selectedJourney === journey}
                />
            ))}
        </div>
    );
};
