/**
 * Image optimization utilities for hero image uploads
 * Handles resizing, compression, and format conversion
 */

export interface ImageOptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png';
  maxFileSize?: number; // in bytes
}

export interface OptimizedImage {
  file: File;
  originalSize: number;
  optimizedSize: number;
  compressionRatio: number;
  dimensions: { width: number; height: number };
}

/**
 * Optimize an image file for web display
 */
export async function optimizeImage(
  file: File,
  options: ImageOptimizationOptions = {}
): Promise<OptimizedImage> {
  const {
    maxWidth = 1920,
    maxHeight = 1080,
    quality = 0.8,
    format = 'webp',
    maxFileSize = 2 * 1024 * 1024, // 2MB default
  } = options;

  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      try {
        // Calculate new dimensions while maintaining aspect ratio
        const { width: newWidth, height: newHeight } = calculateDimensions(
          img.width,
          img.height,
          maxWidth,
          maxHeight
        );

        // Set canvas dimensions
        canvas.width = newWidth;
        canvas.height = newHeight;

        // Draw and resize image
        ctx?.drawImage(img, 0, 0, newWidth, newHeight);

        // Convert to desired format
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to create optimized image'));
              return;
            }

            // Check if optimized size is acceptable
            if (blob.size > maxFileSize) {
              // If still too large, reduce quality further
              const reducedQuality = Math.max(0.1, quality * 0.7);
              canvas.toBlob(
                (reducedBlob) => {
                  if (!reducedBlob) {
                    reject(new Error('Failed to create optimized image with reduced quality'));
                    return;
                  }

                  const optimizedFile = new File([reducedBlob], file.name, {
                    type: `image/${format}`,
                  });

                  resolve({
                    file: optimizedFile,
                    originalSize: file.size,
                    optimizedSize: reducedBlob.size,
                    compressionRatio: (file.size - reducedBlob.size) / file.size,
                    dimensions: { width: newWidth, height: newHeight },
                  });
                },
                `image/${format}`,
                reducedQuality
              );
            } else {
              const optimizedFile = new File([blob], file.name, {
                type: `image/${format}`,
              });

              resolve({
                file: optimizedFile,
                originalSize: file.size,
                optimizedSize: blob.size,
                compressionRatio: (file.size - blob.size) / file.size,
                dimensions: { width: newWidth, height: newHeight },
              });
            }
          },
          `image/${format}`,
          quality
        );
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    // Load the image
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Calculate optimal dimensions while maintaining aspect ratio
 */
function calculateDimensions(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  const { width, height } = { width: originalWidth, height: originalHeight };

  // Calculate scaling factor
  const widthScale = maxWidth / width;
  const heightScale = maxHeight / height;
  const scale = Math.min(widthScale, heightScale, 1); // Don't upscale

  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}

/**
 * Validate image file before optimization
 */
export function validateImageFile(file: File): { isValid: boolean; error?: string } {
  // Check file type
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml'];
  if (!validTypes.includes(file.type)) {
    return {
      isValid: false,
      error: 'Invalid file type. Please upload a JPEG, PNG, WebP, or SVG image.',
    };
  }

  // Check file size (10MB max before optimization)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    return {
      isValid: false,
      error: 'File too large. Please upload an image smaller than 10MB.',
    };
  }

  return { isValid: true };
}

/**
 * Get file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Get compression statistics
 */
export function getCompressionStats(original: OptimizedImage): string {
  const sizeReduction = formatFileSize(original.originalSize - original.optimizedSize);
  const compressionPercent = Math.round(original.compressionRatio * 100);
  
  return `Optimized: ${formatFileSize(original.optimizedSize)} (${compressionPercent}% smaller, saved ${sizeReduction})`;
}
