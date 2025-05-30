import apiClient from './axiosSetup'; // Import the configured client

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

// Streaming types
export interface StreamEvent {
  type: 'progress' | 'partial_image' | 'complete' | 'error';
  data?: any;
  metadata?: GenerateImageResponse;
  image_data?: string;
  error?: string;
}

/**
 * Generates an image with streaming support for progressive loading.
 * @param requestData The data for image generation including prompt, size, and quality.
 * @param onEvent Callback function called for each streaming event.
 * @returns A function to abort the stream.
 */
export const generateImageStream = async (
  requestData: GenerateImageRequest,
  onEvent: (event: StreamEvent) => void
): Promise<() => void> => {
  const abortController = new AbortController();
  
  try {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/generate/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
      signal: abortController.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error('No response body');
    }

    // Process the stream
    (async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                onEvent(data);
              } catch (e) {
                console.error('Error parsing SSE data:', e);
              }
            }
          }
        }
      } catch (error) {
        if (!abortController.signal.aborted) {
          onEvent({ type: 'error', error: String(error) });
        }
      }
    })();

  } catch (error) {
    console.error('Error in generateImageStream:', error);
    onEvent({ type: 'error', error: String(error) });
  }

  return () => abortController.abort();
}; 