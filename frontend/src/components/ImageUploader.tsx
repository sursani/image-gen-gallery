import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';

interface ImageUploaderProps {
  onImageUpload: (file: File, previewUrl: string) => void;
  disabled?: boolean;
}

const MAX_SIZE_MB = 10;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = {
  'image/jpeg': ['.jpeg', '.jpg'],
  'image/png': ['.png'],
  'image/webp': ['.webp']
};

function ImageUploader({ onImageUpload, disabled = false }: ImageUploaderProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[], fileRejections: any[]) => {
    if (disabled) return;
    setError(null);
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
      if (preview) URL.revokeObjectURL(preview); // Clean up old preview on error
      setPreview(null);
      return;
    }
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      if (preview) URL.revokeObjectURL(preview);
      const newPreviewUrl = URL.createObjectURL(file);
      setPreview(newPreviewUrl);
      onImageUpload(file, newPreviewUrl);
    }
  }, [onImageUpload, disabled, preview]);

  const { getRootProps, getInputProps, isDragActive, isDragAccept, isDragReject } = useDropzone({
    onDrop,
    accept: ACCEPTED_IMAGE_TYPES,
    maxSize: MAX_SIZE_BYTES,
    multiple: false,
    disabled
  });

  const baseDropzoneClasses = "flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg transition-colors duration-200 ease-in-out";
  const lightModeBase = "border-gray-400 hover:border-purple-500 bg-gray-50 text-gray-600";
  const darkModeBase = "dark:border-gray-600 dark:hover:border-purple-400 dark:bg-gray-700 dark:text-gray-400";

  const activeClasses = "border-purple-500 dark:border-purple-400 bg-purple-100 dark:bg-purple-900 dark:bg-opacity-30";
  const acceptClasses = "border-green-500 dark:border-green-400 bg-green-100 dark:bg-green-900 dark:bg-opacity-30";
  const rejectClasses = "border-red-500 dark:border-red-400 bg-red-100 dark:bg-red-900 dark:bg-opacity-30";
  const disabledClasses = "border-gray-300 dark:border-gray-500 bg-gray-100 dark:bg-gray-800 opacity-60 cursor-not-allowed";

  const computedDropzoneStyle = useMemo(() => {
    if (disabled) {
      return `${baseDropzoneClasses} ${disabledClasses}`;
    }
    let dynamicClasses = `${lightModeBase} ${darkModeBase}`;
    if (isDragActive) dynamicClasses += ` ${activeClasses}`;
    if (isDragAccept) dynamicClasses += ` ${acceptClasses}`;
    if (isDragReject) dynamicClasses += ` ${rejectClasses}`;
    return `${baseDropzoneClasses} ${dynamicClasses}`;
  }, [isDragActive, isDragAccept, isDragReject, disabled]);

  useEffect(() => {
    // Cleanup function to revoke object URL
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  return (
    <div className="w-full">
      <div {...getRootProps({ className: computedDropzoneStyle })}>
        <input {...getInputProps()} disabled={disabled} />
        {preview && !disabled ? (
          <div className="text-center">
            <img
              src={preview}
              alt="Preview"
              className="max-h-48 max-w-full rounded-lg mb-3 mx-auto border border-gray-300 dark:border-gray-600 shadow-sm"
            />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {disabled ? 'Image uploaded' : 'Drag \'n\' drop or click to replace'}
            </p>
          </div>
        ) : (
          <div className={`text-center ${disabled ? 'text-gray-500 dark:text-gray-600' : 'text-gray-600 dark:text-gray-400'}`}>
            <svg
                className={`mx-auto h-12 w-12 mb-2 ${disabled ? 'text-gray-400 dark:text-gray-500' : 'text-gray-500 dark:text-gray-400'}`}
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
                aria-hidden="true"
            >
              <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {isDragActive && !disabled ? (
              <p className="mt-1">Drop the image here...</p>
            ) : (
              <p className="mt-1">
                {disabled ? 'Uploader disabled' : "Drag 'n' drop or click to upload"}
              </p>
            )}
            <p className="text-xs mt-1">JPG, PNG, WEBP up to {MAX_SIZE_MB}MB</p>
          </div>
        )}
      </div>
      {error && (
        <div className="mt-3 p-3 border rounded-md text-sm
                        bg-red-50 border-red-300 text-red-700
                        dark:bg-red-800 dark:bg-opacity-30 dark:border-red-600 dark:text-red-200"
        >
          {error}
        </div>
      )}
    </div>
  );
}

export default ImageUploader;
