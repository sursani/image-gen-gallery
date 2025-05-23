import { useState, useRef } from 'react';
import ImageUploader from '../components/ImageUploader';
import ImageEditForm from '../components/ImageEditForm';
import { editImage } from '../api/imageEditing'; // Import the new API function
import { getImageUrl } from '../api/client'; // Import the getImageUrl function
import Button from '../components/Button'; // Import Button
import ErrorMessage from '../components/ErrorMessage'; // Import the new component
import LoadingSpinner from '../components/LoadingSpinner'; // Import themed spinner
import Card from '../components/Card';

interface EditImageViewProps {
  navigate?: (view: string) => void;
}

function EditImageView({ navigate }: EditImageViewProps) {
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
  const [selectedSize, setSelectedSize] = useState<string>("1024x1024");

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
      const response = await editImage(
        prompt,
        originalFile,
        maskFile, // Pass the mask file state
        selectedSize
      );

      console.log('Image edit successful:', response);
      // Construct the image URL from the response ID
      const imageUrl = getImageUrl(response.id);
      setEditResultUrl(imageUrl);

    } catch (error) {
      console.error('Image edit failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to edit image';
      
      // Provide more user-friendly error messages
      if (errorMessage.includes('rate limit')) {
        setEditError('Too many requests. Please wait a moment and try again.');
      } else if (errorMessage.includes('content policy')) {
        setEditError('Your prompt was rejected due to content policy violations.');
      } else if (errorMessage.includes('timeout')) {
        setEditError('The request timed out. Please try again.');
      } else {
        setEditError(errorMessage || 'Failed to edit image. Please try again.');
      }
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

  // Navigate to gallery (image is already saved)
  const handleViewInGallery = () => {
    if (navigate) {
      navigate('gallery');
    } else {
      console.warn('Navigate function not provided to EditImageView');
    }
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
           <h2 className={sectionHeadingClasses}>2. Configure Edit Settings</h2>
           
           <div className="mb-6">
             <label htmlFor="size-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
               Output Size
             </label>
             <select
               id="size-select"
               value={selectedSize}
               onChange={(e) => setSelectedSize(e.target.value)}
               className="w-full md:w-auto px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
               disabled={isLoading}
             >
               <option value="1024x1024">Square (1024x1024)</option>
               <option value="1792x1024">Landscape (1792x1024)</option>
               <option value="1024x1792">Portrait (1024x1792)</option>
             </select>
           </div>
           
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

      {/* Show result section even before editing for better UX */}
      {originalFile && originalPreviewUrl && (
        <Card padding="p-10" className="mt-10 text-center mb-16">
          <h2 className={`${sectionHeadingClasses} mb-6`}>3. Your Edited Image</h2>
          
          {editResultUrl ? (
            <>
              <div className="mb-6 bg-gray-100 dark:bg-gray-900 p-2 rounded-lg shadow-inner inline-block">
                <img
                  src={editResultUrl}
                  alt="Edited result"
                  className="max-w-full h-auto md:max-h-[512px] rounded-md border border-gray-300 dark:border-gray-700"
                />
              </div>
              <p className="text-sm text-green-600 dark:text-green-400 mb-4">✓ Image has been saved to the gallery</p>
              <div className="flex justify-center space-x-4">
                <Button onClick={handleDownload} variant="outline">
                  Download Image
                </Button>
                <Button onClick={handleViewInGallery} variant="primary">
                  View in Gallery
                </Button>
              </div>
            </>
          ) : (
            <div className="py-12">
              <p className="text-gray-500 dark:text-gray-400 mb-4">Your edited image will appear here</p>
              <div className="flex justify-center space-x-4">
                <Button variant="outline" disabled>
                  Download Image
                </Button>
                <Button variant="primary" disabled>
                  View in Gallery
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

export default EditImageView; 