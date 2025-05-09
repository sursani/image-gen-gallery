import React, { useState, useEffect, useCallback } from 'react';
import { fetchImageMetadata, ImageMetadata } from '../api/client';
import ImageCard from './ImageCard';
import LoadingSpinner from './LoadingSpinner';
import Button from './Button'; // Import the updated Button component

const ITEMS_PER_PAGE = 12;

const GalleryView: React.FC = () => {
    const [images, setImages] = useState<ImageMetadata[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState<number>(0);
    const [hasMore, setHasMore] = useState<boolean>(true);
    const [totalFetched, setTotalFetched] = useState<number>(0); // Kept for potential future use, not directly used in this refactor

    const loadImages = useCallback(async (page: number) => {
        setIsLoading(true);
        setError(null);
        // console.log(`Loading page: ${page}`); // Keep for debugging if needed

        try {
            const offset = page * ITEMS_PER_PAGE;
            const fetchedImages = await fetchImageMetadata({ 
                limit: ITEMS_PER_PAGE, 
                offset: offset, 
                sort: 'newest' 
            });
            
            setImages(prevImages => page === 0 ? fetchedImages : [...prevImages, ...fetchedImages]);
            setTotalFetched(prevTotal => page === 0 ? fetchedImages.length : prevTotal + fetchedImages.length);
            setHasMore(fetchedImages.length === ITEMS_PER_PAGE);
            
        } catch (err) {
            console.error("Failed to load images:", err);
            setError(err instanceof Error ? err.message : "An unknown error occurred");
            setHasMore(false);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadImages(0);
    }, [loadImages]);

    const handleLoadMore = () => {
        if (!isLoading && hasMore) {
            const nextPage = currentPage + 1;
            setCurrentPage(nextPage);
            loadImages(nextPage);
        }
    };
    
    return (
        // Removed container, mx-auto, px-4, py-8 as these are handled by .page-container in App.tsx
        // Added some vertical padding for content separation within the main view
        <div className="py-6">
            {/* Removed redundant h1 "Image Gallery" */}
            
            {error && (
                // Updated error message styling for better visual consistency
                <div className="mb-6 p-4 text-center text-red-300 bg-red-800 bg-opacity-30 border border-red-700 rounded-md shadow-md">
                    <p className="font-semibold">Oops! Something went wrong while fetching images.</p>
                    <p className="text-sm mt-1">{error}</p>
                </div>
            )}

            {images.length === 0 && !isLoading && !error && (
                 // Enhanced styling for "No images found" message
                 <div className="text-center py-10">
                    <svg className="mx-auto h-12 w-12 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <h3 className="mt-2 text-lg font-medium text-gray-400">No Images Yet</h3>
                    <p className="mt-1 text-sm text-gray-500">It looks like there are no images in the gallery. Try creating some!</p>
                 </div>
            )}

            {/* Adjusted gap for the grid, mb-8 for spacing below grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-8 mb-10">
                {images.map(metadata => (
                    <ImageCard key={metadata.id} metadata={metadata} />
                ))}
            </div>

            {isLoading && (
                 <div className="text-center py-6">
                      <LoadingSpinner />
                      <p className="mt-2 text-sm text-gray-400">Loading images...</p>
                 </div>
            )}

            {!isLoading && hasMore && (
                // Using the Button component for "Load More"
                <div className="text-center mt-8 mb-4">
                    <Button 
                        onClick={handleLoadMore}
                        variant="primary" // Using primary variant for emphasis
                        disabled={isLoading}
                    >
                        Load More Images
                    </Button>
                </div>
            )}
            
            {!isLoading && !hasMore && images.length > 0 && (
                 // Enhanced styling for "End of gallery" message
                 <div className="text-center py-10">
                    <svg className="mx-auto h-12 w-12 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <h3 className="mt-2 text-lg font-medium text-gray-400">You've Reached the End</h3>
                    <p className="mt-1 text-sm text-gray-500">All images have been loaded.</p>
                 </div>
            )}
        </div>
    );
};

export default GalleryView; 