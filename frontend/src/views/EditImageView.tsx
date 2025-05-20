import React, { useState, useRef, useEffect } from 'react';
import ImageUploader from '../components/ImageUploader';
import ImageEditForm from '../components/ImageEditForm';
import { editImage } from '../api/imageEditing'; // Import the new API function
import Button from '../components/Button'; // Import Button
import ErrorMessage from '../components/ErrorMessage'; // Import the new component
import LoadingSpinner from '../components/LoadingSpinner'; // Import themed spinner
import Card from '../components/Card';

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

  const sectionHeadingClasses = "text-2xl font-semibold mb-6 text-gray-800 dark:text-gray-100";

  return (
    <div className="py-16 space-y-16">
      <h2 className={sectionHeadingClasses}>Edit Image</h2>
      
      <Card padding="p-10" className="space-y-8 mb-16">
        <h2 className={sectionHeadingClasses}>1. Upload Images</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-10">
          <div>
            <h3 className="text-lg font-medium mb-3 text-gray-700 dark:text-gray-300">Original Image <span className="text-red-500 dark:text-red-400">*</span></h3>
            <ImageUploader 
              key={`original-uploader-${originalFile?.name || 'empty'}`}
              onImageUpload={handleOriginalImageUpload} 
            />
            {originalPreviewUrl && <img ref={originalImageRef} src={originalPreviewUrl} alt="" className="hidden" />}
          </div>
          
          <div>
            <h3 className="text-lg font-medium mb-3 text-gray-700 dark:text-gray-300">Mask Image (Optional)</h3>
            <ImageUploader 
              key={`mask-uploader-${maskFile?.name || 'empty'}`}
              onImageUpload={handleMaskImageUpload} 
              disabled={!originalFile} // Disable if no original image
            />
            {maskError && (
              <div className="mt-3 p-3 bg-red-50 dark:bg-red-800 dark:bg-opacity-30 border border-red-300 dark:border-red-600 text-red-700 dark:text-red-200 rounded-md text-sm">
                {maskError}
              </div>
            )}
            {maskPreviewUrl && <img ref={maskImageRef} src={maskPreviewUrl} alt="" className="hidden" />}
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Upload a black and white PNG. White areas indicate parts to edit. Must match original dimensions.</p>
          </div>
        </div>
      </Card>

      {originalFile && originalPreviewUrl && (
        <Card padding="p-10" className="space-y-6 mb-16">
           <h2 className={sectionHeadingClasses}>2. Describe Your Edit</h2>
           <ImageEditForm
             uploadedFile={originalFile}
             previewUrl={originalPreviewUrl}
             onSubmit={handleEditSubmit}
             isLoading={isLoading}
           />
        </Card>
      )}

      {isLoading && (
          <div className="mt-8 text-center">
            <LoadingSpinner />
            <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">Applying edits, this may take a moment...</p>
          </div>
        )}

      {editError && !isLoading && (
        <div className="mt-8">
          <ErrorMessage message={editError} title="Image Edit Failed" />
        </div>
      )}

      {editResultUrl && !isLoading && (
        <Card padding="p-10" className="mt-10 text-center mb-16">
          <h2 className={`${sectionHeadingClasses} mb-6`}>3. Your Edited Image</h2>
          <div className="mb-6 bg-gray-100 dark:bg-gray-900 p-2 rounded-lg shadow-inner inline-block">
            <img
              src={editResultUrl}
              alt="Edited result"
              className="max-w-full h-auto md:max-h-[512px] rounded-md border border-gray-300 dark:border-gray-700"
            />
          </div>
          <div className="flex justify-center space-x-4">
            <Button onClick={handleDownload} variant="outline">
              Download Image
            </Button>
            <Button onClick={handleSaveToGallery} variant="primary">
              Save to Gallery
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

export default EditImageView; 