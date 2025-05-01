import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

interface ImageUploaderProps {
  onImageUpload: (file: File, previewUrl: string) => void;
}

const MAX_SIZE_MB = 10;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = {
  'image/jpeg': ['.jpeg', '.jpg'],
  'image/png': ['.png'],
  'image/webp': ['.webp']
};

function ImageUploader({ onImageUpload }: ImageUploaderProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[], fileRejections: any[]) => {
    setError(null); // Clear previous error
    setPreview(null); // Clear previous preview

    if (fileRejections.length > 0) {
      const firstRejection = fileRejections[0];
      const firstError = firstRejection.errors[0];
      if (firstError.code === 'file-invalid-type') {
        setError('Invalid file type. Please upload a JPG, PNG, or WebP image.');
      } else if (firstError.code === 'file-too-large') {
        setError(`File is too large. Maximum size is ${MAX_SIZE_MB}MB.`);
      } else {
        setError(firstError.message || 'File upload failed.');
      }
      return;
    }

    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      const previewUrl = URL.createObjectURL(file);
      setPreview(previewUrl);
      onImageUpload(file, previewUrl); // Pass file and preview to parent
    }
  }, [onImageUpload]);

  const { getRootProps, getInputProps, isDragActive, isDragAccept, isDragReject } = useDropzone({
    onDrop,
    accept: ACCEPTED_IMAGE_TYPES,
    maxSize: MAX_SIZE_BYTES,
    multiple: false // Only allow single file upload
  });

  const baseStyle = "flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors duration-200 ease-in-out";
  const activeStyle = "border-blue-500 bg-blue-900 bg-opacity-50";
  const acceptStyle = "border-green-500 bg-green-900 bg-opacity-50";
  const rejectStyle = "border-red-500 bg-red-900 bg-opacity-50";

  const style = React.useMemo(() => (
    `${baseStyle} border-gray-600 hover:border-blue-400 ` +
    `${isDragActive ? activeStyle : ''} ` +
    `${isDragAccept ? acceptStyle : ''} ` +
    `${isDragReject ? rejectStyle : ''}`
  ), [isDragActive, isDragAccept, isDragReject]);

  // Clean up the preview URL when the component unmounts
  React.useEffect(() => () => {
    if (preview) {
      URL.revokeObjectURL(preview);
    }
  }, [preview]);

  return (
    <div className="w-full">
      <div {...getRootProps({ className: style })}>
        <input {...getInputProps()} />
        {preview ? (
          <div className="text-center">
            <img src={preview} alt="Preview" className="max-h-48 max-w-full rounded-lg mb-4 mx-auto border border-gray-700" />
            <p className="text-sm text-gray-400">Drag 'n' drop another image here, or click to replace</p>
          </div>
        ) : (
          <div className="text-center text-gray-400">
            <svg className="mx-auto h-12 w-12 text-gray-500" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
              <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {isDragActive ? (
              <p className="mt-2">Drop the image here...</p>
            ) : (
              <p className="mt-2">Drag 'n' drop an image here, or click to select file</p>
            )}
            <p className="text-xs mt-1">JPG, PNG, WEBP up to {MAX_SIZE_MB}MB</p>
          </div>
        )}
      </div>
      {error && (
        <div className="mt-3 p-3 bg-red-900 border border-red-700 text-red-100 rounded-lg text-sm">
          <p>{error}</p>
        </div>
      )}
    </div>
  );
}

export default ImageUploader; 