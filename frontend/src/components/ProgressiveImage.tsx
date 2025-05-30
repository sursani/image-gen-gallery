import React, { useState, useEffect } from 'react';

interface ProgressiveImageProps {
  imageUrl: string | null;
  isLoading?: boolean;
  alt?: string;
  className?: string;
}

const ProgressiveImage: React.FC<ProgressiveImageProps> = ({ 
  imageUrl, 
  isLoading = false,
  alt = "Generated image",
  className = ""
}) => {
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [currentBlur, setCurrentBlur] = useState(20);

  useEffect(() => {
    if (!imageUrl || loadedImages.has(imageUrl)) {
      setCurrentBlur(0);
      return;
    }

    // Start with high blur
    setCurrentBlur(20);

    // Gradually reduce blur
    const blurInterval = setInterval(() => {
      setCurrentBlur(prev => {
        if (prev <= 0) {
          clearInterval(blurInterval);
          return 0;
        }
        return prev - 2;
      });
    }, 100);

    // Load the image
    const img = new Image();
    img.onload = () => {
      setLoadedImages(prev => new Set(prev).add(imageUrl));
      // Ensure blur is removed once loaded
      setTimeout(() => setCurrentBlur(0), 500);
    };
    img.src = imageUrl;

    return () => {
      clearInterval(blurInterval);
    };
  }, [imageUrl, loadedImages]);

  if (!imageUrl && !isLoading) {
    return null;
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={alt}
          className="w-full h-auto transition-all duration-500 ease-out"
          style={{
            filter: `blur(${currentBlur}px)`,
            transform: `scale(${currentBlur > 0 ? 1.1 : 1})`, // Slight zoom during blur
          }}
        />
      ) : (
        <div className="w-full h-full bg-dark-surface animate-pulse flex items-center justify-center min-h-[400px]">
          <div className="text-dark-text-muted">
            <svg className="w-12 h-12 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        </div>
      )}
      
      {/* Optional loading overlay */}
      {isLoading && imageUrl && (
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
          <div className="bg-dark-surface/90 px-4 py-2 rounded-lg">
            <span className="text-dark-text-primary text-sm">Enhancing image...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProgressiveImage;