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

export async function generateImageStream(
  requestData: GenerateImageRequest,
  onMessage: (data: any) => void
): Promise<void> {
  const resp = await fetch(`/api/generate/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestData)
  });

  const reader = resp.body?.getReader();
  if (!reader) return;
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      if (line.startsWith('data:')) {
        onMessage(JSON.parse(line.slice(5)));
      }
    }
  }
}
