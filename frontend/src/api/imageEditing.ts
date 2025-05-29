import apiClient from './axiosSetup'; // Import the configured client

// Base URL is now handled by apiClient
// const API_BASE_URL = 'http://localhost:8000/api'; 

// Interface for the response - matches the ImageMetadata from backend
interface EditImageResponse {
  id: string;
  prompt: string;
  parameters: Record<string, any> | string | null;
  filename: string;
  timestamp: string; // ISO 8601 date string
}

/**
 * Sends a request to the backend to edit an image.
 * @param prompt The editing prompt.
 * @param imageFile The original image file (PNG).
 * @param maskFile Optional mask file (PNG).
 * @param size The desired output size (must match DALL-E 2 requirements).
 * @returns The metadata of the edited image.
 */
export const editImage = async (
  prompt: string,
  imageFile: File,
  maskFile: File | null,
  size: string = "1024x1024" // Default size, consider making this configurable
): Promise<EditImageResponse> => {
  const formData = new FormData();
  formData.append('prompt', prompt);
  formData.append('image', imageFile);
  formData.append('size', size);
  if (maskFile) {
    formData.append('mask', maskFile);
  }

  try {
    // Use apiClient instead of axios
    const response = await apiClient.post(`/edit/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    // Error is now pre-processed by the interceptor
    console.error('Error in editImage API call:', error); 
    // Re-throw the error (which should now be an Error with a user-friendly message)
    throw error;
    // The specific check for AxiosError might not be needed if the interceptor standardizes the error message
    /*
    if (axios.isAxiosError(error) && error.response?.data?.detail) {
      throw new Error(error.response.data.detail);
    }
    throw error; 
    */
  }
};

export async function editImageStream(
  prompt: string,
  imageFile: File,
  maskFile: File | null,
  size: string = '1024x1024',
  onMessage?: (data: any) => void
): Promise<void> {
  const formData = new FormData();
  formData.append('prompt', prompt);
  formData.append('image', imageFile);
  formData.append('size', size);
  if (maskFile) formData.append('mask', maskFile);

  const resp = await fetch(`/api/edit/stream`, { method: 'POST', body: formData });
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
      if (line.startsWith('data:') && onMessage) {
        onMessage(JSON.parse(line.slice(5)));
      }
    }
  }
}
