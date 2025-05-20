import React, { useState } from 'react';
import { ImageMetadata } from '../api/client';
import { getImageUrl } from '../api/client';

interface ImageCardProps {
    metadata: ImageMetadata;
}

const ImageCard: React.FC<ImageCardProps> = ({ metadata }) => {
    const [imageLoadFailed, setImageLoadFailed] = useState(false);

    // Format the timestamp for display (example: locale date string)
    const formattedDate = new Date(metadata.timestamp).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });

    const handleImageError = () => {
        if (!imageLoadFailed) {
            console.error(`Error loading image: ${getImageUrl(metadata.id)}`);
            setImageLoadFailed(true);
        }
    };

    const imageUrl = imageLoadFailed ? './placeholder.png' : getImageUrl(metadata.id);

    return (
        <div className="group relative overflow-hidden rounded-lg shadow-lg bg-gray-800 border border-gray-700 hover:shadow-xl transition-shadow duration-300">
            <img
                src={imageUrl}
                alt={metadata.prompt || 'Generated image'}
                className="w-full h-64 object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
                onError={handleImageError}
            />
            {/* Overlay for Prompt */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-4 flex flex-col justify-end">
                <p className="text-white text-sm font-medium truncate" title={metadata.prompt || 'No prompt available'}>
                    {metadata.prompt || 'No prompt available'}
                </p>
                <p className="text-gray-400 text-xs mt-1">{formattedDate}</p>
            </div>
        </div>
    );
};

export default ImageCard;
