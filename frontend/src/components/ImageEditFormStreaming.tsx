import React, { useState, useRef, useCallback } from 'react';
import { editImageStream } from '../api/imageEditing';
import type { StreamEvent } from '../api/imageGeneration';

interface ProgressStage {
  id: string;
  label: string;
  description: string;
  completed: boolean;
  active: boolean;
}

function ImageEditFormStreaming() {
  const [formState, setFormState] = useState({
    prompt: '',
    quality: 'auto',
    size: '1024x1024',
  });

  const [originalImage, setOriginalImage] = useState<File | null>(null);
  const [maskImage, setMaskImage] = useState<File | null>(null);
  const [originalPreview, setOriginalPreview] = useState<string | null>(null);

  const [errors, setErrors] = useState({
    prompt: '',
    image: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [partialImages, setPartialImages] = useState<string[]>([]);
  const [currentImageData, setCurrentImageData] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [currentStage, setCurrentStage] = useState<string>('');
  const [startTime, setStartTime] = useState<number | null>(null);
  const [estimatedTime, setEstimatedTime] = useState<string>('');
  
  const abortControllerRef = useRef<(() => void) | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const maskInputRef = useRef<HTMLInputElement>(null);

  // Progress stages for better UX
  const [progressStages, setProgressStages] = useState<ProgressStage[]>([
    { id: 'started', label: 'Starting', description: 'Initializing edit request', completed: false, active: false },
    { id: 'processing', label: 'Processing', description: 'Analyzing your prompt and image', completed: false, active: false },
    { id: 'generating', label: 'Editing', description: 'Applying edits with AI', completed: false, active: false },
    { id: 'complete', label: 'Complete', description: 'Edit ready!', completed: false, active: false }
  ]);

  // Update estimated time
  React.useEffect(() => {
    if (!isLoading || !startTime) return;

    const interval = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      const estimated = Math.max(40 - elapsed, 0); // Estimate 40 seconds for editing
      
      if (estimated > 0) {
        setEstimatedTime(`~${Math.ceil(estimated)}s remaining`);
      } else {
        setEstimatedTime('Almost done...');
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isLoading, startTime]);

  const updateProgressStage = (stageId: string) => {
    setProgressStages(prev => prev.map(stage => {
      if (stage.id === stageId) {
        return { ...stage, active: true, completed: false };
      } else if (prev.find(s => s.id === stageId)?.id && prev.indexOf(prev.find(s => s.id === stageId)!) > prev.indexOf(stage)) {
        return { ...stage, active: false, completed: true };
      } else {
        return { ...stage, active: false };
      }
    }));
    setCurrentStage(stageId);
  };

  const completeAllStages = () => {
    setProgressStages(prev => prev.map(stage => ({
      ...stage,
      active: false,
      completed: true
    })));
  };

  const resetProgress = () => {
    setProgressStages(prev => prev.map(stage => ({
      ...stage,
      active: false,
      completed: false
    })));
    setCurrentStage('');
    setStartTime(null);
    setEstimatedTime('');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));

    if (name === 'prompt' && value.trim().length > 0) {
      setErrors(prev => ({ ...prev, prompt: '' }));
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrors(prev => ({ ...prev, image: 'Please select a valid image file.' }));
      return;
    }

    setOriginalImage(file);
    setErrors(prev => ({ ...prev, image: '' }));

    // Create preview URL
    const reader = new FileReader();
    reader.onload = (e) => {
      setOriginalPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const validateForm = () => {
    let isValid = true;
    const newErrors = { prompt: '', image: '' };

    if (!formState.prompt.trim()) {
      newErrors.prompt = 'Edit prompt is required.';
      isValid = false;
    } else if (formState.prompt.length < 10) {
      newErrors.prompt = 'Prompt must be at least 10 characters long.';
      isValid = false;
    } else if (formState.prompt.length > 1000) {
      newErrors.prompt = 'Prompt must not exceed 1000 characters.';
      isValid = false;
    }

    if (!originalImage) {
      newErrors.image = 'Please select an image to edit.';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleStreamEvent = (event: StreamEvent) => {
    console.log('Stream event:', event.type, event);
    
    switch (event.type) {
      case 'progress':
        const status = event.data?.status;
        console.log('Progress status:', status);
        if (status === 'started') {
          updateProgressStage('started');
        } else if (status === 'processing') {
          updateProgressStage('processing');
        } else if (status === 'generating') {
          updateProgressStage('generating');
        }
        break;
        
      case 'partial_image':
        console.log('Received partial image, index:', event.index);
        if (event.data) {
          const partialImageUrl = `data:image/png;base64,${event.data}`;
          setPartialImages(prev => {
            console.log('Previous partial images count:', prev.length);
            return [...prev, partialImageUrl];
          });
          setCurrentImageData(partialImageUrl);
          console.log('Set current image to partial');
        }
        break;
        
      case 'image':
        console.log('Received final image');
        if (event.data) {
          const fullImageUrl = `data:image/png;base64,${event.data}`;
          setCurrentImageData(fullImageUrl);
          setIsLoading(false);
          completeAllStages();
          setCurrentStage('complete');
        }
        break;
        
      case 'complete':
        console.log('Received complete event');
        if (event.metadata && event.image_data) {
          completeAllStages();
          const fullImageUrl = `data:image/png;base64,${event.image_data}`;
          setCurrentImageData(fullImageUrl);
          setIsLoading(false);
          setCurrentStage('complete');
        }
        break;
        
      case 'error':
        console.error('Stream error:', event.error);
        setApiError(event.error || 'An unknown error occurred');
        setIsLoading(false);
        resetProgress();
        break;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);
    setPartialImages([]);
    setCurrentImageData(null);
    resetProgress();
    
    if (validateForm() && originalImage) {
      setIsLoading(true);
      setStartTime(Date.now());
      
      try {
        const abort = await editImageStream(
          formState.prompt,
          originalImage,
          maskImage, // null for now, can be enhanced later
          formState.size,
          formState.quality,
          handleStreamEvent
        );
        abortControllerRef.current = abort;
      } catch (error: any) {
        setApiError(error.message || 'An unknown error occurred editing the image.');
        setIsLoading(false);
        resetProgress();
      }
    }
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current();
      abortControllerRef.current = null;
      setIsLoading(false);
      resetProgress();
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="min-h-screen bg-dark-bg px-4 py-20">
      <div className="max-w-3xl mx-auto">
        {/* Header Section */}
        <div className="text-center mb-20">
          <h1 className="text-5xl md:text-6xl font-bold text-dark-text-primary mb-4 tracking-tight">
            Edit Your Image
          </h1>
          <p className="text-lg text-dark-text-muted">
            Upload an image and describe the changes you want to make
          </p>
        </div>

        {/* Form Section */}
        <form onSubmit={handleSubmit} className="space-y-12">
          {/* Image Upload Section */}
          <div className="space-y-4">
            <label className="block text-base font-medium text-dark-text-primary">
              Select Image to Edit
            </label>
            
            <div className="relative">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                disabled={isLoading}
              />
              
              <div 
                onClick={triggerFileInput}
                className={`
                  w-full h-64 border-2 border-dashed border-dark-border/50 
                  rounded-2xl flex items-center justify-center cursor-pointer
                  transition-all duration-300
                  hover:border-dark-accent/50 hover:bg-dark-surface/30
                  ${originalPreview ? 'bg-dark-surface/20' : 'bg-dark-surface/10'}
                  ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
                  ${errors.image ? 'border-red-500/50' : ''}
                `}
              >
                {originalPreview ? (
                  <img 
                    src={originalPreview} 
                    alt="Selected image" 
                    className="max-h-full max-w-full object-contain rounded-xl"
                  />
                ) : (
                  <div className="text-center">
                    <svg className="w-12 h-12 text-dark-text-muted mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-dark-text-muted">Click to select an image</p>
                    <p className="text-sm text-dark-text-muted/60 mt-1">PNG, JPG, JPEG up to 4MB</p>
                  </div>
                )}
              </div>
              
              {errors.image && (
                <p className="absolute -bottom-6 left-0 text-sm text-red-500">
                  {errors.image}
                </p>
              )}
            </div>
          </div>

          {/* Prompt Section */}
          <div className="space-y-4">
            <label htmlFor="prompt" className="block text-base font-medium text-dark-text-primary">
              Describe the changes you want to make
            </label>
            <div className="relative">
              <textarea
                id="prompt"
                name="prompt"
                value={formState.prompt}
                onChange={handleChange}
                placeholder="Add a hat to the person, change the background to a beach, remove the object..."
                rows={6}
                aria-required="true"
                aria-invalid={!!errors.prompt}
                aria-describedby={errors.prompt ? 'prompt-error' : undefined}
                disabled={isLoading}
                className={`
                  w-full px-6 py-4 
                  bg-dark-surface/50 backdrop-blur 
                  text-dark-text-primary text-base
                  border-2 border-dark-border/50 
                  rounded-2xl 
                  placeholder:text-dark-text-muted/60
                  focus:outline-none focus:border-dark-accent/50 focus:bg-dark-surface/70
                  transition-all duration-300 resize-none
                  ${errors.prompt ? 'border-red-500/50' : ''}
                  ${isLoading ? 'opacity-50' : ''}
                `}
                style={{ minHeight: '160px' }}
              />
              {errors.prompt && (
                <p id="prompt-error" className="absolute -bottom-6 left-0 text-sm text-red-500">
                  {errors.prompt}
                </p>
              )}
            </div>
            <div className="flex justify-between items-center text-sm text-dark-text-muted">
              <span>Be specific about the changes you want</span>
              <span>{formState.prompt.length}/1000</span>
            </div>
          </div>

          {/* Options Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Quality Card */}
            <div className="space-y-3">
              <label htmlFor="quality" className="block text-base font-medium text-dark-text-primary">
                Image Quality
              </label>
              <div className="relative">
                <select
                  id="quality"
                  name="quality"
                  value={formState.quality}
                  onChange={handleChange}
                  className={`
                    w-full px-6 py-4 
                    bg-dark-surface/50 backdrop-blur
                    text-dark-text-primary text-base
                    border-2 border-dark-border/50 
                    rounded-2xl 
                    appearance-none cursor-pointer
                    focus:outline-none focus:border-dark-accent/50 focus:bg-dark-surface/70
                    transition-all duration-300
                    hover:bg-dark-surface/70
                    ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                  disabled={isLoading}
                >
                  <option value="auto">Auto (Recommended)</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-6 pointer-events-none">
                  <svg className="w-5 h-5 text-dark-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Size Card */}
            <div className="space-y-3">
              <label htmlFor="size" className="block text-base font-medium text-dark-text-primary">
                Image Dimensions
              </label>
              <div className="relative">
                <select
                  id="size"
                  name="size"
                  value={formState.size}
                  onChange={handleChange}
                  className={`
                    w-full px-6 py-4 
                    bg-dark-surface/50 backdrop-blur
                    text-dark-text-primary text-base
                    border-2 border-dark-border/50 
                    rounded-2xl 
                    appearance-none cursor-pointer
                    focus:outline-none focus:border-dark-accent/50 focus:bg-dark-surface/70
                    transition-all duration-300
                    hover:bg-dark-surface/70
                    ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                  disabled={isLoading}
                >
                  <option value="1024x1024">Square (1024×1024)</option>
                  <option value="1536x1024">Landscape (1536×1024)</option>
                  <option value="1024x1536">Portrait (1024×1536)</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-6 pointer-events-none">
                  <svg className="w-5 h-5 text-dark-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-8 flex gap-4">
            <button 
              type="submit" 
              className={`
                flex-1 py-5 px-8
                bg-dark-accent text-white 
                text-lg font-semibold
                rounded-2xl
                transition-all duration-300
                hover:bg-dark-accent/90 hover:scale-[1.02]
                active:scale-[0.98]
                disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
                flex items-center justify-center gap-3
              `}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Editing...</span>
                </>
              ) : (
                'Edit Image'
              )}
            </button>
            {isLoading && (
              <button
                type="button"
                onClick={handleCancel}
                className="
                  px-8 py-5
                  bg-red-500/20 text-red-500
                  text-lg font-semibold
                  rounded-2xl
                  transition-all duration-300
                  hover:bg-red-500/30
                  border-2 border-red-500/50
                "
              >
                Cancel
              </button>
            )}
          </div>
        </form>

        {/* Enhanced Progress Section with Image Preview */}
        {(isLoading || currentImageData) && (
          <div className="mt-16 space-y-8">
            {/* Show image preview if we have any data */}
            {currentImageData && (
              <div className="mb-8">
                <div className="text-center space-y-4 mb-6">
                  <h2 className="text-3xl font-bold text-dark-text-primary">
                    {isLoading ? 'Editing Your Image' : 'Your Edited Image'}
                  </h2>
                </div>

                <div className="relative overflow-hidden rounded-3xl bg-dark-surface/50 backdrop-blur p-2 transform hover:scale-[1.02] transition-transform duration-300">
                  {/* Show the current image data directly - this will update as partial images come in */}
                  <img
                    src={currentImageData}
                    alt="AI Edited"
                    className="w-full rounded-2xl transition-all duration-300"
                    style={{
                      filter: isLoading ? 'blur(8px)' : 'blur(0px)',
                      transform: isLoading ? 'scale(1.05)' : 'scale(1)',
                    }}
                  />
                  
                  {/* Download button overlay - only show when complete */}
                  {!isLoading && currentImageData && (
                    <div className="absolute inset-2 bg-black/0 hover:bg-black/20 rounded-2xl transition-colors duration-300 flex items-end justify-end p-4 opacity-0 hover:opacity-100">
                      <button 
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = currentImageData;
                          link.download = `ai-edited-${Date.now()}.png`;
                          link.click();
                        }}
                        className="bg-dark-accent/90 text-white px-4 py-2 rounded-xl font-medium hover:bg-dark-accent transition-colors duration-200 backdrop-blur"
                      >
                        Download
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Progress Header - Only show when still loading */}
            {isLoading && (
              <>
                <div className="text-center space-y-4">
                  <p className="text-dark-text-muted">
                    {progressStages.find(s => s.active)?.description || 'Preparing...'}
                  </p>
                  {estimatedTime && (
                    <p className="text-sm text-dark-accent font-medium">
                      {estimatedTime}
                    </p>
                  )}
                </div>

                {/* Visual Progress Steps */}
                <div className="relative">
                  {/* Progress Line */}
                  <div className="absolute top-6 left-0 right-0 h-0.5 bg-dark-border rounded-full">
                    <div 
                      className="h-full bg-gradient-to-r from-dark-accent to-dark-accent/80 rounded-full transition-all duration-1000 ease-out"
                      style={{ 
                        width: `${(progressStages.filter(s => s.completed).length / progressStages.length) * 100}%` 
                      }}
                    />
                  </div>

                  {/* Progress Steps */}
                  <div className="relative flex justify-between">
                    {progressStages.map((stage, index) => (
                      <div key={stage.id} className="flex flex-col items-center space-y-3">
                        {/* Step Circle */}
                        <div className={`
                          relative w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all duration-500
                          ${stage.completed 
                            ? 'bg-dark-accent border-dark-accent' 
                            : stage.active 
                              ? 'bg-dark-accent/20 border-dark-accent animate-pulse'
                              : 'bg-dark-surface border-dark-border'
                          }
                        `}>
                          {stage.completed ? (
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : stage.active ? (
                            <div className="w-4 h-4 bg-dark-accent rounded-full animate-ping" />
                          ) : (
                            <div className="w-2 h-2 bg-dark-text-muted rounded-full" />
                          )}
                        </div>

                        {/* Step Label */}
                        <div className="text-center">
                          <p className={`
                            text-sm font-medium transition-colors duration-300
                            ${stage.completed || stage.active 
                              ? 'text-dark-text-primary' 
                              : 'text-dark-text-muted'
                            }
                          `}>
                            {stage.label}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Error Message */}
        {apiError && (
          <div className="mt-12 p-6 bg-red-500/10 border-2 border-red-500/30 rounded-2xl">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-red-500 mb-2">Edit Failed</h3>
                <p className="text-dark-text-secondary">{apiError}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ImageEditFormStreaming; 