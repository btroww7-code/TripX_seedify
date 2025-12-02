import React, { useState } from 'react';
import { Journey, Leg, Stop } from '../types/transport';
import { TransportIcon } from './icons/TransportIcon';

interface DetailedJourneyViewProps {
    journey: Journey;
}

export const DetailedJourneyView: React.FC<DetailedJourneyViewProps> = ({ journey }) => {
    const [expandedLegIndex, setExpandedLegIndex] = useState<number | null>(null);

    const toggleLegDetails = (index: number) => {
        setExpandedLegIndex(expandedLegIndex === index ? null : index);
    };

    return (
        <div className="bg-slate-800 rounded-lg p-6">
            {/* Nagłówek z podsumowaniem */}
            <div className="border-b border-slate-700 pb-4 mb-4">
                <h2 className="text-2xl font-bold text-white mb-2">{journey.summary}</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                        <p className="text-gray-400">Czas podróży</p>
                        <p className="text-white font-semibold">{journey.totalDuration}</p>
                    </div>
                    {journey.totalPrice && (
                        <div>
                            <p className="text-gray-400">Szacunkowy koszt</p>
                            <p className="text-white font-semibold">{journey.totalPrice}</p>
                        </div>
                    )}
                    {journey.transferCount !== undefined && (
                        <div>
                            <p className="text-gray-400">Przesiadki</p>
                            <p className="text-white font-semibold">
                                {journey.transferCount === 0 ? 'Bez przesiadek' : journey.transferCount}
                            </p>
                        </div>
                    )}
                    {journey.walkingDistance && (
                        <div>
                            <p className="text-gray-400">Dystans pieszy</p>
                            <p className="text-white font-semibold">{journey.walkingDistance}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Szczegółowa lista etapów */}
            <div className="space-y-3">
                {journey.legs.map((leg, index) => (
                    <LegDetailCard
                        key={index}
                        leg={leg}
                        index={index}
                        isExpanded={expandedLegIndex === index}
                        onToggle={() => toggleLegDetails(index)}
                    />
                ))}
            </div>
        </div>
    );
};

interface LegDetailCardProps {
    leg: Leg;
    index: number;
    isExpanded: boolean;
    onToggle: () => void;
}

const LegDetailCard: React.FC<LegDetailCardProps> = ({ leg, index, isExpanded, onToggle }) => {
    const hasDetailedStops = leg.stops && leg.stops.length > 2;

    return (
        <div className="bg-slate-700/50 rounded-lg overflow-hidden border border-slate-600">
            {/* Główny nagłówek etapu */}
            <div 
                className="p-4 cursor-pointer hover:bg-slate-700/70 transition-colors"
                onClick={onToggle}
            >
                <div className="flex items-start gap-4">
                    {/* Ikona transportu */}
                    <div className="flex-shrink-0">
                        <div className="bg-cyan-600/20 p-3 rounded-lg">
                            <TransportIcon mode={leg.mode} className="w-6 h-6 text-cyan-400" />
                        </div>
                    </div>

                    {/* Informacje o etapie */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold text-white text-lg">
                                {leg.mode === 'Walk' ? '🚶 Przejście pieszo' : `${leg.lineNumber || leg.details}`}
                            </h3>
                            <span className="text-gray-300 font-mono text-sm whitespace-nowrap ml-2">
                                {leg.duration}
                            </span>
                        </div>

                        {/* Trasa: od - do */}
                        <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-green-500 flex-shrink-0"></div>
                                <div className="flex-1">
                                    <p className="text-gray-300">
                                        <span className="font-semibold text-white">{leg.departureTime}</span> - {leg.from}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-red-500 flex-shrink-0"></div>
                                <div className="flex-1">
                                    <p className="text-gray-300">
                                        <span className="font-semibold text-white">{leg.arrivalTime}</span> - {leg.to}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Dodatkowe informacje */}
                        <div className="mt-3 flex flex-wrap gap-2 text-xs">
                            {leg.operator && (
                                <span className="bg-slate-600 px-2 py-1 rounded text-gray-200">
                                    🚍 {leg.operator}
                                </span>
                            )}
                            {leg.vehicleType && (
                                <span className="bg-slate-600 px-2 py-1 rounded text-gray-200">
                                    {leg.vehicleType}
                                </span>
                            )}
                            {leg.distance && (
                                <span className="bg-slate-600 px-2 py-1 rounded text-gray-200">
                                    📏 {leg.distance}
                                </span>
                            )}
                            {leg.price && (
                                <span className="bg-green-600 px-2 py-1 rounded text-white font-semibold">
                                    💰 {leg.price}
                                </span>
                            )}
                        </div>

                        {/* Przycisk zakupu biletu */}
                        {leg.bookingUrl && (
                            <div className="mt-3">
                                <a
                                    href={leg.bookingUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm font-semibold transition-colors"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    🎫 Kup bilet
                                </a>
                            </div>
                        )}
                    </div>

                    {/* Strzałka rozwijania */}
                    {hasDetailedStops && (
                        <div className="flex-shrink-0">
                            <svg
                                className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    )}
                </div>
            </div>

            {/* Rozwinięte szczegóły - lista wszystkich przystanków */}
            {isExpanded && hasDetailedStops && (
                <div className="px-4 pb-4 border-t border-slate-600 bg-slate-800/50">
                    <div className="pt-4">
                        <h4 className="text-sm font-semibold text-gray-300 mb-3">
                            📍 Wszystkie przystanki ({leg.stops!.length})
                        </h4>
                        <div className="space-y-2">
                            {leg.stops!.map((stop, stopIndex) => (
                                <StopItem 
                                    key={stopIndex} 
                                    stop={stop} 
                                    isFirst={stopIndex === 0}
                                    isLast={stopIndex === leg.stops!.length - 1}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

interface StopItemProps {
    stop: Stop;
    isFirst: boolean;
    isLast: boolean;
}

const StopItem: React.FC<StopItemProps> = ({ stop, isFirst, isLast }) => {
    return (
        <div className="flex items-center gap-3 py-2 px-3 bg-slate-700/30 rounded hover:bg-slate-700/50 transition-colors">
            {/* Marker */}
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                isFirst ? 'bg-green-500' : isLast ? 'bg-red-500' : 'bg-gray-400'
            }`}></div>

            {/* Informacje o przystanku */}
            <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{stop.name}</p>
                {stop.platform && (
                    <p className="text-gray-400 text-xs">Peron {stop.platform}</p>
                )}
            </div>

            {/* Czas */}
            {stop.time && (
                <div className="text-gray-300 text-sm font-mono flex-shrink-0">
                    {stop.time}
                </div>
            )}

            {/* Typ przystanku */}
            {stop.stopType && (
                <div className="text-xs text-gray-400 flex-shrink-0">
                    {formatStopTypeIcon(stop.stopType)}
                </div>
            )}
        </div>
    );
};

// Funkcja pomocnicza do formatowania ikon typów przystanków
const formatStopTypeIcon = (stopType: string): string => {
    const icons: Record<string, string> = {
        'bus_stop': '🚏',
        'tram_stop': '🚊',
        'train_station': '🚉',
        'metro_station': '🚇',
        'airport': '✈️'
    };
    return icons[stopType] || '📍';
};
