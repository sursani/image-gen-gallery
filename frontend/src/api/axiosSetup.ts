import axios, { AxiosError } from 'axios';
import axiosRetry from 'axios-retry'; // Import axios-retry

// Base URL for API requests
const API_BASE_URL = 'http://localhost:8000/api';

// Create a configured axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  // You can add other default settings here like headers or timeout
  // timeout: 10000, 
});

// --- Configure Retry Logic --- 
axiosRetry(apiClient, {
  retries: 3, // Number of retries
  retryDelay: (retryCount) => {
    console.log(`Retry attempt: ${retryCount}`);
    return retryCount * 1000; // Exponential backoff (1s, 2s, 3s)
  },
  retryCondition: (error: AxiosError) => {
    // Retry on network errors or 5xx server errors
    return (
      axiosRetry.isNetworkOrIdempotentRequestError(error) || 
      (error.response ? error.response.status >= 500 : false)
    );
  },
});

// --- Response Interceptor --- 
apiClient.interceptors.response.use(
  // Function for successful responses (status code 2xx)
  (response) => {
    // Any status code that lie within the range of 2xx cause this function to trigger
    // Simply return the response
    return response;
  },
  // Function for error responses (status code outside 2xx)
  (error: AxiosError) => {
    // Any status codes that falls outside the range of 2xx cause this function to trigger
    console.error('API Error Interceptor Caught:', error);

    let errorMessage = 'An unexpected error occurred.';

    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      const apiErrorData = error.response.data as any; // Type assertion might be needed
      errorMessage = apiErrorData?.detail || `Server responded with status ${error.response.status}`;
      console.error('API Response Error Data:', apiErrorData);
      console.error('Status:', error.response.status);
      console.error('Headers:', error.response.headers);
    } else if (error.request) {
      // The request was made but no response was received
      // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
      // http.ClientRequest in node.js
      errorMessage = 'No response received from server. Check network connection.';
      console.error('API Request Error:', error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      errorMessage = error.message;
      console.error('API Setup Error:', error.message);
    }

    // It's often better to throw a new Error with a consistent message structure
    // rather than the original error, especially for UI display.
    // The original error is logged above for debugging.
    return Promise.reject(new Error(errorMessage));
  }
);

export default apiClient; 