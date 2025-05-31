import axios from 'axios';

// Determine the base URL for the API. During normal browser execution the
// value is injected by Vite via `import.meta.env`.  When the same code runs
// under Node (e.g. during the test-suite) `import.meta.env` is undefined,
// therefore we need a safe fallback to avoid `TypeError: Cannot read
// properties of undefined`.

// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
const viteEnv = (typeof import.meta !== 'undefined' ? (import.meta as any).env : undefined) as
  | Record<string, string>
  | undefined;

const API_BASE_URL = viteEnv?.VITE_API_URL ?? 'http://localhost:8000'; // Default to local FastAPI server

console.log('Using API Base URL:', API_BASE_URL); // For debugging

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    // Add other default headers if needed, e.g., Authorization
  },
});

// Optional: Add interceptors for request/response handling (e.g., logging, error handling)
apiClient.interceptors.response.use(
  (response) => response, // Pass through successful responses
  (error) => {
    // Handle errors globally
    console.error('API call failed:', error.response || error.message || error);
    // You might want to show a user-friendly error message here
    return Promise.reject(error);
  }
);

export default apiClient; 