import type { StreamEvent } from './imageGeneration';

// Interface for the response - matches the ImageMetadata from backend
interface EditImageResponse {
  id: string;
  prompt: string;
  parameters: Record<string, any> | string | null;
  filename: string;
  timestamp: string; // ISO 8601 date string
}

/**
 * Edits an image with streaming support for progressive loading.
 * @param prompt The editing prompt.
 * @param imageFile The original image file (PNG).
 * @param maskFile Optional mask file (PNG).
 * @param size The desired output size.
 * @param quality The quality setting for the edited image.
 * @param onEvent Callback function called for each streaming event.
 * @returns A function to abort the stream.
 */
export const editImageStream = async (
  prompt: string,
  imageFile: File,
  maskFile: File | null,
  size: string = "1024x1024",
  quality: string = "auto",
  onEvent: (event: StreamEvent) => void
): Promise<() => void> => {
  const abortController = new AbortController();
  
  const formData = new FormData();
  formData.append('prompt', prompt);
  formData.append('image', imageFile);
  formData.append('size', size);
  formData.append('quality', quality);
  if (maskFile) {
    formData.append('mask', maskFile);
  }

  try {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/edit/stream`, {
      method: 'POST',
      body: formData,
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
    await (async () => {
      let buffer = '';
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          let delimiterIndex;
          while ((delimiterIndex = buffer.indexOf('\n\n')) !== -1) {
            const rawEvent = buffer.slice(0, delimiterIndex).trim();
            buffer = buffer.slice(delimiterIndex + 2);

            if (rawEvent.startsWith('data: ')) {
              const jsonStr = rawEvent.slice(6);
              try {
                const evt: StreamEvent = JSON.parse(jsonStr);
                onEvent(evt);
              } catch (e) {
                console.error('Error parsing SSE JSON:', e);
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
    console.error('Error in editImageStream:', error);
    onEvent({ type: 'error', error: String(error) });
  }

  return () => abortController.abort();
}; 