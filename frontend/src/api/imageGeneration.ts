import apiClient from './axiosSetup.ts'; // Import the configured client

// Base URL is now handled by apiClient
// const API_BASE_URL = 'http://localhost:8000/api'; 

interface GenerateImageRequest {
  prompt: string;
  size: string;
  quality: string;
}

interface GenerateImageResponse {
  id: string;
  prompt: string;
  revised_prompt?: string;
  filename: string;
  timestamp: string;
  parameters: {
    size: string;
    quality: string;
  };
}

/**
 * Sends a request to the backend to generate an image based on the provided parameters.
 * @param requestData The data for image generation including prompt, size, and quality.
 * @returns The metadata of the generated image.
 */
export const generateImage = async (requestData: GenerateImageRequest): Promise<GenerateImageResponse> => {
  try {
    // This matches the server route configuration: app.include_router(generation_router, prefix="/api/generate", tags=["Generation"])
    // with router.post("/") from generation_routes.py
    const response = await apiClient.post(`/generate/`, requestData);
    return response.data;
  } catch (error) {
    // Error is now pre-processed by the interceptor
    console.error('Error in generateImage API call:', error); 
    // Re-throw the error (which should now be an Error with a user-friendly message)
    throw error;
  }
}; 