import React, { useState, useEffect, useCallback } from 'react';
import { fetchImageMetadata, ImageMetadata } from '../api/client';
import ImageCard from './ImageCard';
import LoadingSpinner from './LoadingSpinner'; // Assuming a simple spinner component exists

const ITEMS_PER_PAGE = 12; // Number of images to load per page

const GalleryView: React.FC = () => {
    const [images, setImages] = useState<ImageMetadata[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState<number>(0); // 0-indexed page
    const [hasMore, setHasMore] = useState<boolean>(true); // Assume there might be more pages initially
    const [totalFetched, setTotalFetched] = useState<number>(0);

    // Function to load images, useCallback to prevent recreation on every render
    const loadImages = useCallback(async (page: number) => {
        setIsLoading(true);
        setError(null);
        console.log(`Loading page: ${page}`);

        try {
            const offset = page * ITEMS_PER_PAGE;
            const fetchedImages = await fetchImageMetadata({ 
                limit: ITEMS_PER_PAGE, 
                offset: offset, 
                sort: 'newest' 
            });
            
            setImages(prevImages => page === 0 ? fetchedImages : [...prevImages, ...fetchedImages]);
            setTotalFetched(prevTotal => page === 0 ? fetchedImages.length : prevTotal + fetchedImages.length);
            // If we received fewer items than requested, we've reached the end
            setHasMore(fetchedImages.length === ITEMS_PER_PAGE);
            
        } catch (err) {
            console.error("Failed to load images:", err);
            setError(err instanceof Error ? err.message : "An unknown error occurred");
            setHasMore(false); // Stop trying to load more if an error occurs
        } finally {
            setIsLoading(false);
        }
    }, []); // Empty dependency array means this function is created once

    // Initial load
    useEffect(() => {
        loadImages(0);
    }, [loadImages]); // Depend on loadImages

    const handleLoadMore = () => {
        if (!isLoading && hasMore) {
            const nextPage = currentPage + 1;
            setCurrentPage(nextPage);
            loadImages(nextPage); // Load the next page
        }
    };
    
    // Basic pagination controls (could be improved with page numbers, etc.)
    // Let's implement an "infinite scroll" style Load More button for simplicity

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold text-white mb-8 text-center">Image Gallery</h1>
            
            {error && (
                <div className="text-center text-red-500 bg-red-900/50 p-4 rounded-md mb-6">
                    <p>Error loading images:</p>
                    <p className="text-sm">{error}</p>
                </div>
            )}

            {images.length === 0 && !isLoading && !error && (
                 <p className="text-center text-gray-400">No images found.</p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
                {images.map(metadata => (
                    <ImageCard key={metadata.id} metadata={metadata} />
                ))}
            </div>

            {isLoading && (
                 <div className="text-center py-4">
                      <LoadingSpinner />
                 </div>
            )}

            {!isLoading && hasMore && (
                <div className="text-center">
                    <button 
                        onClick={handleLoadMore}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded transition duration-150 ease-in-out"
                        disabled={isLoading}
                    >
                        Load More
                    </button>
                </div>
            )}
            
            {!isLoading && !hasMore && images.length > 0 && (
                 <p className="text-center text-gray-500">End of gallery.</p>
            )}
        </div>
    );
};

export default GalleryView; 