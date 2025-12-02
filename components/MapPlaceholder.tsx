import React from 'react';

export const MapPlaceholder: React.FC = () => {
    return (
        <div className="w-full h-full flex items-center justify-center bg-slate-900">
            <div className="text-center text-gray-500">
                <i className="fa-solid fa-map-location-dot text-6xl mb-4 text-slate-700"></i>
                <p className="text-lg">Twoja trasa zostanie wyświetlona tutaj.</p>
                <p>Wprowadź miejsce startu i cel, aby rozpocząć.</p>
            </div>
        </div>
    );
};
