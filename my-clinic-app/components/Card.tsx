import React from 'react';

interface CardProps {
    children: React.ReactNode;
    className?: string;
    noPadding?: boolean;
    hover?: boolean;
    loading?: boolean;
}

export default function Card({
    children,
    className = '',
    noPadding = false,
    hover = false,
    loading = false
}: CardProps) {
    return (
        <div
            className={`
        bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden
        ${hover ? 'hover:shadow-md hover:-translate-y-0.5 transition-all duration-200' : ''}
        ${loading ? 'animate-pulse' : ''}
        ${className}
      `}
        >
            {loading ? (
                <div className="p-6 space-y-4">
                    <div className="h-4 bg-gray-100 rounded w-1/3"></div>
                    <div className="space-y-2">
                        <div className="h-3 bg-gray-100 rounded"></div>
                        <div className="h-3 bg-gray-100 rounded w-5/6"></div>
                    </div>
                </div>
            ) : (
                <div className={noPadding ? '' : 'p-6'}>
                    {children}
                </div>
            )}
        </div>
    );
}
