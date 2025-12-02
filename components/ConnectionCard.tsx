
import React from 'react';
import { Journey, Leg } from '../types';
import { TransportIcon } from './icons/TransportIcon';

interface ConnectionCardProps {
    journey: Journey;
    onSelect: () => void;
    isSelected: boolean;
}

const LegDisplay: React.FC<{ leg: Leg }> = ({ leg }) => {
    return (
        <div className="flex items-start space-x-4">
            <div className="flex flex-col items-center relative h-full">
                <TransportIcon mode={leg.mode} className="w-5 h-5 text-cyan-400 z-10" />
                <div className="absolute top-5 bottom-0 w-px bg-slate-600"></div>
            </div>
            <div className="pb-6 flex-1">
                <p className="font-semibold text-gray-200">{leg.from} → {leg.to}</p>
                <p className="text-sm text-gray-400">
                    {leg.departureTime} - {leg.arrivalTime} ({leg.duration})
                </p>
                <p className="text-sm text-gray-300">{leg.details} ({leg.operator})</p>
                {leg.bookingUrl && (
                    <a href={leg.bookingUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-cyan-500 hover:underline">
                        Zarezerwuj
                    </a>
                )}
            </div>
        </div>
    );
};


export const ConnectionCard: React.FC<ConnectionCardProps> = ({ journey, onSelect, isSelected }) => {
    return (
        <div 
            onClick={onSelect}
            className={`bg-slate-800 rounded-lg p-4 cursor-pointer border-2 transition-all ${isSelected ? 'border-cyan-500 shadow-lg' : 'border-transparent hover:border-slate-600'}`}
        >
            <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-bold text-white">{journey.summary}</h3>
                <div className="text-right">
                    <p className="text-lg font-semibold text-gray-200">{journey.totalDuration}</p>
                    {journey.totalPrice && <p className="text-sm text-gray-400">{journey.totalPrice}</p>}
                </div>
            </div>

            <div>
                {journey.legs.map((leg, index) => (
                    <LegDisplay key={index} leg={leg} />
                ))}
            </div>
        </div>
    );
};
