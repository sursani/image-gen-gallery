import React, { useState } from 'react';
import { ImageMetadata } from '../api/client';
import { getImageUrl } from '../api/client';

interface ImageCardProps {
    metadata: ImageMetadata;
}

const ImageCard: React.FC<ImageCardProps> = ({ metadata }) => {
    const [imageLoadFailed, setImageLoadFailed] = useState(false);

    // Format the timestamp for display
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
        <div className="ui-hover-lift group relative overflow-hidden rounded-ui-md border border-dark-border bg-dark-surface transition-all duration-300 hover:border-dark-accent">
            <div className="aspect-square overflow-hidden">
                <img
                    src={imageUrl}
                    alt={metadata.prompt || 'Generated image'}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                    onError={handleImageError}
                />
            </div>
            
            {/* Overlay for Prompt */}
            <div className="absolute inset-0 bg-gradient-to-t from-dark-bg via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-sm flex flex-col justify-end">
                <p className="text-dark-text-primary text-sm font-medium truncate" title={metadata.prompt || 'No prompt available'}>
                    {metadata.prompt || 'No prompt available'}
                </p>
                <p className="text-dark-text-muted text-xs mt-1">{formattedDate}</p>
            </div>
        </div>
    );
};

export default ImageCard;
