import React, { useState, useRef, useEffect } from 'react';
import ImageUploader from '../components/ImageUploader';
import ImageEditForm from '../components/ImageEditForm';
import { editImage } from '../api/imageEditing'; // Import the new API function
import Button from '../components/Button'; // Import Button
import ErrorMessage from '../components/ErrorMessage'; // Import the new component

function EditImageView() {
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [originalPreviewUrl, setOriginalPreviewUrl] = useState<string | null>(null);
  const [maskFile, setMaskFile] = useState<File | null>(null);
  const [maskPreviewUrl, setMaskPreviewUrl] = useState<string | null>(null); 
  const [maskError, setMaskError] = useState<string | null>(null);

  const originalImageRef = useRef<HTMLImageElement>(null);
  const maskImageRef = useRef<HTMLImageElement>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [editResultUrl, setEditResultUrl] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  // Helper to check image dimensions
  const getImageDimensions = (url: string): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = (err) => reject(err);
      img.src = url;
    });
  };

  const handleOriginalImageUpload = (file: File, previewUrl: string) => {
    setOriginalFile(file);
    setOriginalPreviewUrl(previewUrl);
    setMaskFile(null); // Clear mask if original changes
    setMaskPreviewUrl(null);
    setMaskError(null);
    setEditResultUrl(null); // Clear previous results
    setEditError(null);
  };

  const handleMaskImageUpload = async (file: File, previewUrl: string) => {
    setMaskError(null); // Clear previous mask error
    if (!originalPreviewUrl) {
      setMaskError('Please upload the original image first.');
      return;
    }

    try {
      const [originalDims, maskDims] = await Promise.all([
        getImageDimensions(originalPreviewUrl),
        getImageDimensions(previewUrl)
      ]);

      if (originalDims.width !== maskDims.width || originalDims.height !== maskDims.height) {
        setMaskError(`Mask dimensions (${maskDims.width}x${maskDims.height}) must match the original image dimensions (${originalDims.width}x${originalDims.height}).`);
        setMaskFile(null);
        setMaskPreviewUrl(null);
      } else {
        setMaskFile(file);
        setMaskPreviewUrl(previewUrl);
      }
    } catch (error) {
      console.error("Error checking image dimensions:", error);
      setMaskError("Could not verify mask dimensions. Please try uploading again.");
      setMaskFile(null);
      setMaskPreviewUrl(null);
    }
  };

  const handleEditSubmit = async (prompt: string) => {
    if (!originalFile) {
      setEditError('Original image is missing.');
      return;
    }

    setIsLoading(true);
    setEditResultUrl(null);
    setEditError(null);

    console.log('Submitting edit request:', { prompt, originalFile, maskFile });

    try {
      // Determine the size parameter (needs UI later, default for now)
      const size = "1024x1024"; 
      
      const response = await editImage(
        prompt,
        originalFile,
        maskFile, // Pass the mask file state
        size
      );

      console.log('Image edit successful:', response);
      setEditResultUrl(response.image_url); // Set the result URL from the API response

    } catch (error: any) {
      console.error('Image edit failed:', error);
      setEditError(error.message || 'Failed to edit image.'); // Use the error message potentially passed from the API client
    } finally {
      setIsLoading(false);
    }
  };

  // Function to handle image download
  const handleDownload = () => {
    if (!editResultUrl) return;
    const link = document.createElement('a');
    link.href = editResultUrl; 
    // Try to get a filename from the URL, or use a generic name
    const filename = editResultUrl.substring(editResultUrl.lastIndexOf('/') + 1) || `edited-image-${Date.now()}.png`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Placeholder function for saving to gallery
  const handleSaveToGallery = () => {
    if (!editResultUrl || !originalFile) return;
    console.log('Saving to gallery (placeholder):', {
      imageUrl: editResultUrl,
      originalPrompt: (document.getElementById('editPrompt') as HTMLTextAreaElement)?.value || 'N/A', // Get prompt from form
      // Add other relevant metadata if available
    });
    // In a real implementation, this would likely involve:
    // 1. Calling a backend endpoint to confirm save (if backend manages gallery)
    // 2. Or updating a shared state (e.g., Context API, Redux) if frontend manages gallery
    alert('Image saved to gallery! (Placeholder)');
  };

  return (
    <div className="container mx-auto p-4 md:p-8">
      <h1 className="text-3xl font-bold mb-8 text-white text-center">Edit Image</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div>
          <h2 className="text-xl font-semibold mb-4 text-white">1. Upload Original Image</h2>
          <ImageUploader 
            key="original-uploader" // Add key to force re-render on change if needed
            onImageUpload={handleOriginalImageUpload} 
          />
          {/* Hidden img tag to help get dimensions */}
          {originalPreviewUrl && <img ref={originalImageRef} src={originalPreviewUrl} alt="" style={{ display: 'none' }} />}
        </div>
        
        <div>
          <h2 className="text-xl font-semibold mb-4 text-white">2. Upload Mask (Optional)</h2>
          <ImageUploader 
            key="mask-uploader"
            onImageUpload={handleMaskImageUpload} 
            // Ensure mask uploader is reset if original changes
            // You might need to manage its internal state more directly or use the key prop effectively
          />
           {maskError && (
            <div className="mt-3 p-3 bg-red-900 border border-red-700 text-red-100 rounded-lg text-sm">
              <p>{maskError}</p>
            </div>
          )}
          {/* Hidden img tag to help get dimensions */}
          {maskPreviewUrl && <img ref={maskImageRef} src={maskPreviewUrl} alt="" style={{ display: 'none' }} />}
           <p className="text-xs text-gray-400 mt-2">Upload a black and white image where white indicates areas to edit. Must match original image dimensions.</p>
        </div>
      </div>

      {originalFile && originalPreviewUrl && (
        <div className="mt-8 border-t border-gray-700 pt-8">
           <h2 className="text-xl font-semibold mb-4 text-white">3. Apply Edits</h2>
           <ImageEditForm 
             uploadedFile={originalFile}
             previewUrl={originalPreviewUrl}
             onSubmit={handleEditSubmit}
             isLoading={isLoading}
             // Pass mask info if needed by the form in the future
             // maskPreviewUrl={maskPreviewUrl} 
           />
        </div>
      )}

      {/* Loading indicator for edit process */}
      {isLoading && (
          <div className="mt-6 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-blue-500"></div>
            <p className="mt-2 text-sm text-gray-300">Editing in progress...</p>
          </div>
        )}

      {/* Display Edit Error - Use ErrorMessage component */}
      {editError && !isLoading && (
         <ErrorMessage message={editError} title="Edit Failed" />
        /* <div className="mt-6 p-4 bg-red-900 border border-red-700 text-red-100 rounded-lg">
          <p className="font-bold">Edit Failed:</p>
          <p>{editError}</p>
        </div> */
      )}

      {/* Display Edit Result */}
      {editResultUrl && !isLoading && (
        <div className="mt-8 border-t border-gray-700 pt-8">
          <h2 className="text-xl font-semibold mb-4 text-white">Edit Result:</h2>
          <div className="flex justify-center mb-4">
            <img 
              src={editResultUrl} 
              alt="Edited result" 
              className="w-full max-w-xl mx-auto rounded-lg shadow-lg border border-gray-700"
            />
          </div>
          {/* Action Buttons */}
          <div className="flex justify-center space-x-4 mt-4">
            <Button onClick={handleDownload} variant="secondary">
              Download Image
            </Button>
            <Button onClick={handleSaveToGallery} variant="primary"> 
              Save to Gallery
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default EditImageView; 