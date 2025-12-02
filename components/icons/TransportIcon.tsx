
import React from 'react';
// FIX: Importing the updated TransportMode type.
import { TransportMode } from '../../types';

interface TransportIconProps {
    mode: TransportMode;
    className?: string;
}

export const TransportIcon: React.FC<TransportIconProps> = ({ mode, className = "w-6 h-6" }) => {
    // FIX: Updated keys to TitleCase to match the new TransportMode type and added missing transport modes.
    const iconClass = {
        Walk: 'fa-solid fa-person-walking',
        Bus: 'fa-solid fa-bus-simple',
        Subway: 'fa-solid fa-train-subway',
        Train: 'fa-solid fa-train',
        Tram: 'fa-solid fa-train-tram',
        Flight: 'fa-solid fa-plane',
        Scooter: 'fa-solid fa-motorcycle',
        Car: 'fa-solid fa-car',
    }[mode];

    // FIX: Added a fallback icon for unknown transport modes.
    return <i className={`${iconClass || 'fa-solid fa-question-circle'} ${className}`}></i>;
};
