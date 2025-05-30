import React, { useState, useRef, useEffect } from 'react';
import { generateImageStream, type StreamEvent } from '../api/imageGeneration';

interface ProgressStage {
  id: string;
  label: string;
  description: string;
  completed: boolean;
  active: boolean;
}

function ImageGenerationFormStreaming() {
  const [formState, setFormState] = useState({
    prompt: '',
    quality: 'auto',
    size: '1024x1024',
    format: 'url'
  });

  const [errors, setErrors] = useState({
    prompt: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [currentImageData, setCurrentImageData] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [estimatedTime, setEstimatedTime] = useState<string>('');
  
  const abortControllerRef = useRef<(() => void) | null>(null);

  // Progress stages for better UX
  const [progressStages, setProgressStages] = useState<ProgressStage[]>([
    { id: 'started', label: 'Starting', description: 'Initializing generation request', completed: false, active: false },
    { id: 'processing', label: 'Processing', description: 'Analyzing your prompt', completed: false, active: false },
    { id: 'generating', label: 'Generating', description: 'Creating your image with AI', completed: false, active: false },
    { id: 'complete', label: 'Complete', description: 'Image ready!', completed: false, active: false }
  ]);

  // Update estimated time
  useEffect(() => {
    if (!isLoading || !startTime) return;

    const interval = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      const estimated = Math.max(30 - elapsed, 0); // Estimate 30 seconds total
      
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

  const validateForm = () => {
    let isValid = true;
    const newErrors = { prompt: '' };

    if (!formState.prompt.trim()) {
      newErrors.prompt = 'Prompt is required.';
      isValid = false;
    } else if (formState.prompt.length < 10) {
      newErrors.prompt = 'Prompt must be at least 10 characters long.';
      isValid = false;
    } else if (formState.prompt.length > 1000) {
      newErrors.prompt = 'Prompt must not exceed 1000 characters.';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleStreamEvent = (event: StreamEvent) => {
    console.log('Stream event:', event); // Debug logging
    
    switch (event.type) {
      case 'progress': {
        const status = event.data?.status;
        if (status === 'started') {
          updateProgressStage('started');
        } else if (status === 'processing') {
          updateProgressStage('processing');
        } else if (status === 'generating') {
          updateProgressStage('generating');
        }
        break;
      }
        
      case 'partial_image':
        // Handle partial images for progressive loading
        if (event.data) {
          const partialImageUrl = `data:image/png;base64,${event.data}`;
          setCurrentImageData(partialImageUrl); // Show the latest partial
        }
        break;
        
      case 'image':
        // We received the complete image - just update currentImageData, don't set imageUrl
        if (event.data) {
          const fullImageUrl = `data:image/png;base64,${event.data}`;
          setCurrentImageData(fullImageUrl);
          setIsLoading(false);
          completeAllStages();
        }
        break;
        
      case 'complete':
        // Legacy support - handle complete event
        if (event.metadata && event.image_data) {
          completeAllStages();
          const fullImageUrl = `data:image/png;base64,${event.image_data}`;
          setCurrentImageData(fullImageUrl);
          setIsLoading(false);
        }
        break;
        
      case 'error':
        setApiError(event.error || 'An unknown error occurred');
        setIsLoading(false);
        resetProgress();
        break;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);
    setCurrentImageData(null);
    resetProgress();
    
    if (validateForm()) {
      setIsLoading(true);
      setStartTime(Date.now());
      
      try {
        const abort = await generateImageStream(
          {
            prompt: formState.prompt,
            size: formState.size,
            quality: formState.quality,
          },
          handleStreamEvent
        );
        abortControllerRef.current = abort;
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred generating the image.';
        setApiError(errorMessage);
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

  return (
    <div className="min-h-screen bg-dark-bg px-4 py-20">
      <div className="max-w-3xl mx-auto">
        {/* Header Section */}
        <div className="text-center mb-20">
          <h1 className="text-5xl md:text-6xl font-bold text-dark-text-primary mb-4 tracking-tight">
            Generate New Image
          </h1>
          <p className="text-lg text-dark-text-muted">
            Create amazing images with AI - Now with real-time progress!
          </p>
        </div>

        {/* Form Section */}
        <form onSubmit={handleSubmit} className="space-y-12">
          {/* Prompt Section */}
          <div className="space-y-4">
            <label htmlFor="prompt" className="block text-base font-medium text-dark-text-primary">
              Describe your image
            </label>
            <div className="relative">
              <textarea
                id="prompt"
                name="prompt"
                value={formState.prompt}
                onChange={handleChange}
                placeholder="A serene mountain landscape at sunset with golden light..."
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
              <span>Be descriptive for best results</span>
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
                  <span>Generating...</span>
                </>
              ) : (
                'Generate Image'
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
                    {isLoading ? 'Creating Your Image' : 'Your Generated Image'}
                  </h2>
                </div>

                <div className="relative overflow-hidden rounded-3xl bg-dark-surface/50 backdrop-blur p-2 transform hover:scale-[1.02] transition-transform duration-300">
                  {/* Show the current image data directly - this will update as partial images come in */}
                  <img
                    src={currentImageData}
                    alt="AI Generated"
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
                          link.download = `ai-generated-${Date.now()}.png`;
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
                    {progressStages.map((stage) => (
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
                <h3 className="text-lg font-semibold text-red-500 mb-2">Generation Failed</h3>
                <p className="text-dark-text-secondary">{apiError}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ImageGenerationFormStreaming;