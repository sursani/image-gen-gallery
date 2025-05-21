import React, { useState, useEffect, useCallback } from 'react';
import { fetchImageMetadata, ImageMetadata } from '../api/client';
import ImageCard from './ImageCard';
import LoadingSpinner from './LoadingSpinner';
import Button from './Button';

const ITEMS_PER_PAGE = 12;

const GalleryView: React.FC = () => {
    const [images, setImages] = useState<ImageMetadata[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState<number>(0);
    const [hasMore, setHasMore] = useState<boolean>(true);
    const [totalFetched, setTotalFetched] = useState<number>(0);

    const loadImages = useCallback(async (page: number) => {
        setIsLoading(true);
        setError(null);

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
        <div className="py-lg">
            {error && (
                <div className="mb-lg p-md text-center bg-dark-elevated border border-red-800 rounded-ui-md">
                    <p className="font-semibold text-red-400">Something went wrong while fetching images</p>
                    <p className="text-sm mt-2 text-dark-text-muted">{error}</p>
                </div>
            )}

            {images.length === 0 && !isLoading && !error && (
                <div className="text-center py-xl">
                    <svg className="mx-auto h-16 w-16 text-dark-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <h3 className="mt-md text-lg font-medium text-dark-text-secondary">No Images Yet</h3>
                    <p className="mt-xs text-sm text-dark-text-muted">It looks like there are no images in the gallery. Try creating some!</p>
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-md gap-y-lg mb-xl">
                {images.map(metadata => (
                    <ImageCard key={metadata.id} metadata={metadata} />
                ))}
            </div>

            {isLoading && (
                <div className="text-center py-lg">
                    <LoadingSpinner size="md" />
                    <p className="mt-sm text-sm text-dark-text-muted">Loading images...</p>
                </div>
            )}

            {!isLoading && hasMore && (
                <div className="text-center mt-lg mb-md">
                    <Button
                        onClick={handleLoadMore}
                        variant="primary"
                        disabled={isLoading}
                    >
                        Load More Images
                    </Button>
                </div>
            )}

            {!isLoading && !hasMore && images.length > 0 && (
                <p className="text-center text-sm text-dark-text-muted py-lg">You've reached the end of the gallery.</p>
            )}
        </div>
    );
};

export default GalleryView;
