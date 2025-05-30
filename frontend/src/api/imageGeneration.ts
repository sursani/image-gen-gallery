// Streaming types
export interface StreamEvent {
  type: 'progress' | 'partial_image' | 'image' | 'complete' | 'error';
  data?: any;
  metadata?: GenerateImageResponse;
  image_data?: string;
  error?: string;
  index?: number;
}

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
        'Accept': 'text/event-stream',
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

    // Accumulate text across chunks so we don't break lines mid-way
    (async () => {
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
    console.error('Error in generateImageStream:', error);
    onEvent({ type: 'error', error: String(error) });
  }

  return () => abortController.abort();
}; 