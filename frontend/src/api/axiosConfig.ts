import axios from 'axios';

// Determine the base URL for the API
// Use environment variables (prefixed with VITE_ for Vite projects)
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'; // Default to local FastAPI server

console.log("Using API Base URL:", API_BASE_URL); // For debugging

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