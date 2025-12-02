import React from 'react';
import { TransportOperator } from '../types/transport';
import { getOperatorById } from '../data/operators';

interface OperatorInfoProps {
    operatorId?: string;
    operatorName: string;
}

export const OperatorInfo: React.FC<OperatorInfoProps> = ({ operatorId, operatorName }) => {
    const operator = operatorId ? getOperatorById(operatorId) : null;

    if (!operator) {
        return (
            <div className="text-sm text-gray-400">
                {operatorName}
            </div>
        );
    }

    const typeLabels: Record<string, string> = {
        'railway': 'Kolej',
        'urban': 'Transport miejski',
        'intercity': 'Autobusy międzymiastowe',
        'regional': 'Transport regionalny',
        'airline': 'Linie lotnicze'
    };

    return (
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-700/50 rounded-full text-sm">
            <div className="w-2 h-2 rounded-full bg-cyan-400"></div>
            <span className="text-white font-medium">{operator.name}</span>
            {operator.type && (
                <span className="text-gray-400 text-xs">
                    • {typeLabels[operator.type] || operator.type}
                </span>
            )}
        </div>
    );
};

interface OperatorLogoProps {
    operatorId?: string;
    operatorName: string;
    size?: 'sm' | 'md' | 'lg';
}

export const OperatorLogo: React.FC<OperatorLogoProps> = ({ operatorId, operatorName, size = 'md' }) => {
    const operator = operatorId ? getOperatorById(operatorId) : null;
    
    const sizes = {
        sm: 'w-6 h-6 text-xs',
        md: 'w-10 h-10 text-sm',
        lg: 'w-16 h-16 text-base'
    };

    // Jeśli mamy logo URL, użyj go
    if (operator?.logo) {
        return (
            <img 
                src={operator.logo} 
                alt={operator.name}
                className={`${sizes[size]} object-contain rounded`}
            />
        );
    }

    // W przeciwnym razie użyj placeholdera z inicjałami
    const initials = operatorName
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    return (
        <div className={`${sizes[size]} flex items-center justify-center bg-gradient-to-br from-cyan-600 to-blue-600 rounded font-bold text-white`}>
            {initials}
        </div>
    );
};
