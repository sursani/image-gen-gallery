// Define the base URL for the backend API.
// When the code is executed within a Vite powered browser build the value
// is provided via `import.meta.env`.  However, when the same module is
// imported directly in a Node.js environment (for instance while running
// unit-tests) `import.meta.env` is `undefined` and trying to read a property
// from it would throw.  The defensive check below makes sure we fall back
// to the default value when the module is evaluated outside of Vite.

// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
const viteEnv = (typeof import.meta !== 'undefined' ? (import.meta as any).env : undefined) as
  | Record<string, string>
  | undefined;

const API_BASE_URL = viteEnv?.VITE_API_BASE_URL ?? 'http://localhost:8000';

// Define the structure of the ImageMetadata based on the backend model
// (Adjust based on actual fields returned by backend/app/models/image_metadata.py)
export interface ImageMetadata {
    id: string;
    prompt: string;
    parameters: Record<string, any> | string | null;
    filename: string; // We might not use this directly in frontend if we use the ID endpoint
    timestamp: string; // ISO 8601 date string
}

// Define parameters for fetching images
export interface FetchImagesParams {
    limit?: number;
    offset?: number;
    sort?: 'newest' | 'oldest';
}

/**
 * Fetches a list of image metadata from the backend API.
 * 
 * @param params - Optional parameters for pagination and sorting.
 * @returns A promise that resolves to an array of ImageMetadata.
 * @throws Will throw an error if the network request fails or the API returns an error status.
 */
export const fetchImageMetadata = async (params: FetchImagesParams = {}): Promise<ImageMetadata[]> => {
    const { limit = 12, offset = 0, sort = 'newest' } = params;
    const queryParams = new URLSearchParams({
        limit: String(limit),
        offset: String(offset),
        sort: sort,
    });

    const url = `${API_BASE_URL}/api/images?${queryParams.toString()}`;
    console.log(`Fetching image metadata from: ${url}`); // Log the URL being fetched

    try {
        const response = await fetch(url);

        if (!response.ok) {
            // Attempt to read error details from the response body
            let errorDetail = `API request failed with status ${response.status}`;
            try {
                const errorData = await response.json();
                errorDetail = errorData.detail || errorDetail;
            } catch (jsonError) {
                // Ignore if response body is not valid JSON
                console.error("Could not parse error response body:", jsonError);
            }
            console.error("API Error Detail:", errorDetail);
            throw new Error(errorDetail);
        }

        const data: ImageMetadata[] = await response.json();
        console.log(`Successfully fetched ${data.length} image metadata items.`);
        return data;
    } catch (error) {
        console.error("Error fetching image metadata:", error);
        // Re-throw the error to be handled by the calling component
        throw error; 
    }
};

/**
 * Constructs the URL for retrieving a specific image file.
 * 
 * @param imageId - The unique ID of the image.
 * @returns The full URL to the image file endpoint.
 */
export const getImageUrl = (imageId: string): string => {
    return `${API_BASE_URL}/api/images/${imageId}`;
}; 