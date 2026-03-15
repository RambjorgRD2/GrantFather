import React, { useState, useRef } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertCircle } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Upload,
  Image,
  Trash2,
  Save,
  Eye,
  RefreshCw,
  Loader2,
  Zap,
} from 'lucide-react';
import {
  optimizeImage,
  validateImageFile,
  formatFileSize,
  getCompressionStats,
  type OptimizedImage,
} from '@/utils/imageOptimizer';

interface HeroImageLandingPageAsset {
  id: string;
  asset_type: string;
  alt_text?: string;
  asset_url: string; // This is the actual field name in the database
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Additional fields that may not exist in the database
  title?: string;
  storage_path?: string;
  file_size?: number;
  mime_type?: string;
}

export const HeroImageUpload = () => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [altText, setAltText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizedImage, setOptimizedImage] = useState<OptimizedImage | null>(
    null
  );
  const [optimizationError, setOptimizationError] = useState<string | null>(
    null
  );

  // Fetch current hero image
  const { data: currentHeroImage, isLoading: isLoadingHero } = useQuery({
    queryKey: ['hero-image-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('landing_page_assets')
        .select('*')
        .eq('asset_type', 'hero_image')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching hero image:', error);
        throw error;
      }

      return (data || null) as HeroImageLandingPageAsset | null;
    },
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      setIsUploading(true);

      // Check if user is authenticated
      const {
        data: { session: authSession },
        error: sessionError,
      } = await supabase.auth.getSession();
      if (sessionError || !authSession) {
        throw new Error('User not authenticated. Please log in and try again.');
      }

      console.log('User authenticated, proceeding with upload...');
      console.log('User ID:', authSession.user.id);

      // Note: SuperAdmin role validation is handled by the Edge Function
      // The frontend doesn't need to query user_roles due to RLS policies
      console.log(
        'Proceeding with upload - Edge Function will validate SuperAdmin role'
      );

      // Prepare form data for Edge Function
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title);
      formData.append(
        'altText',
        altText || 'GrantFather AI-powered grant writing platform interface'
      );

      console.log(`Uploading file via Edge Function: ${file.name}`);
      console.log('Form data contents:');
      for (const [key, value] of formData.entries()) {
        console.log(`${key}:`, value);
      }

      // Upload using Edge Function
      const {
        data: { session: uploadSession },
        error: uploadSessionError,
      } = await supabase.auth.getSession();

      if (uploadSessionError || !uploadSession) {
        throw new Error(
          'Authentication failed: ' +
            (uploadSessionError?.message || 'No session')
        );
      }

      console.log('Session found:', {
        user: uploadSession.user?.email,
        access_token: uploadSession.access_token ? 'present' : 'missing',
      });

      // Try using Supabase's built-in fetch method first
      let response;
      try {
        const supabaseResponse = await supabase.functions.invoke(
          'hero-image-upload-v2',
          {
            body: formData,
          }
        );

        console.log('Supabase invoke response:', supabaseResponse);

        // Convert Supabase response to standard Response format
        if (supabaseResponse.error) {
          response = {
            ok: false,
            status: 400,
            headers: new Headers(),
            json: async () => ({ error: supabaseResponse.error.message }),
          };
        } else {
          response = {
            ok: true,
            status: 200,
            headers: new Headers(),
            json: async () => supabaseResponse.data,
          };
        }
      } catch (error) {
        console.log(
          'Supabase invoke failed, trying direct fetch:',
          error.message
        );

        // Fallback to direct fetch
        response = await fetch(
          'https://fjlrplhtgknuulqymsse.supabase.co/functions/v1/hero-image-upload-v2',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${uploadSession.access_token}`,
            },
            body: formData,
          }
        );
      }

      let result;
      try {
        result = await response.json();
        console.log('Edge Function response:', result);
      } catch (jsonError) {
        console.error('Failed to parse JSON response:', jsonError);
        throw new Error('Invalid response from server');
      }

      console.log('Response status:', response.status);
      console.log(
        'Response headers:',
        response.headers
          ? Object.fromEntries(response.headers.entries())
          : 'No headers available'
      );

      if (!response.ok) {
        console.error('Edge Function error:', result);
        console.error('Response status:', response.status);
        console.error('Response status text:', response.statusText);
        throw new Error(
          (result && result.error) ||
            `Upload failed with status ${response.status}`
        );
      }

      if (!result || typeof result !== 'object') {
        console.error('Invalid result object:', result);
        throw new Error('Invalid response format from server');
      }

      if (!result.success) {
        console.error('Edge Function returned success: false', result);
        throw new Error((result && result.error) || 'Upload failed');
      }

      console.log('Upload successful via Edge Function:', result);
      return result.data;
    },
    onSuccess: () => {
      toast.success('Hero image uploaded successfully!');
      queryClient.invalidateQueries({ queryKey: ['hero-image-admin'] });
      queryClient.invalidateQueries({ queryKey: ['landing-page-assets'] });
      resetForm();
    },
    onError: (error) => {
      toast.error(`Upload failed: ${error.message}`);
    },
    onSettled: () => {
      setIsUploading(false);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!currentHeroImage) throw new Error('No hero image to delete');

      // Delete from storage (fallback to asset_url if storage_path not available)
      const pathToDelete =
        currentHeroImage.storage_path ||
        currentHeroImage.asset_url.split('/').pop() ||
        '';
      const { error: storageError } = await supabase.storage
        .from('landing-assets')
        .remove([pathToDelete]);

      if (storageError) {
        console.warn('Storage deletion failed:', storageError);
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('landing_page_assets')
        .delete()
        .eq('id', currentHeroImage.id);

      if (dbError)
        throw new Error(`Database deletion failed: ${dbError.message}`);
    },
    onSuccess: () => {
      toast.success('Hero image deleted successfully!');
      queryClient.invalidateQueries({ queryKey: ['hero-image-admin'] });
      queryClient.invalidateQueries({ queryKey: ['landing-page-assets'] });
    },
    onError: (error) => {
      toast.error(`Deletion failed: ${error.message}`);
    },
  });

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    console.log('File selected:', file);
    console.log('File type:', file.type);
    console.log('File size:', file.size);
    console.log('File name:', file.name);

    // Reset previous state
    setOptimizationError(null);
    setOptimizedImage(null);

    // Validate file
    const validation = validateImageFile(file);
    console.log('File validation result:', validation);

    if (!validation.isValid) {
      console.error('File validation failed:', validation.error);
      setOptimizationError(validation.error || 'Invalid file');
      return;
    }

    setSelectedFile(file);

    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    // Auto-fill title if empty
    if (!title) {
      setTitle(file.name.replace(/\.[^/.]+$/, '')); // Remove file extension
    }

    // Optimize image if it's not SVG
    if (file.type !== 'image/svg+xml') {
      setIsOptimizing(true);
      try {
        const optimized = await optimizeImage(file, {
          maxWidth: 1920,
          maxHeight: 1080,
          quality: 0.85,
          format: 'webp',
          maxFileSize: 2 * 1024 * 1024, // 2MB
        });
        setOptimizedImage(optimized);
        toast.success('Image optimized successfully!', {
          description: getCompressionStats(optimized),
        });
      } catch (error) {
        console.error('Image optimization failed:', error);
        setOptimizationError('Failed to optimize image. Will upload original.');
        toast.warning('Image optimization failed', {
          description: 'Will upload the original image.',
        });
      } finally {
        setIsOptimizing(false);
      }
    }
  };

  const handleUpload = () => {
    if (!selectedFile) {
      toast.error('Please select a file to upload');
      return;
    }

    console.log('Starting upload process...');
    console.log('Selected file:', selectedFile);
    console.log('Optimized image:', optimizedImage);

    // Use optimized image if available, otherwise use original
    const fileToUpload = optimizedImage?.file || selectedFile;
    console.log('File to upload:', fileToUpload);

    try {
      uploadMutation.mutate(fileToUpload);
    } catch (error) {
      console.error('Upload mutation error:', error);
      toast.error('Upload failed: ' + error.message);
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setTitle('');
    setAltText('');
    setOptimizedImage(null);
    setOptimizationError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Hero Image Management
          </h2>
          <p className="text-muted-foreground">
            Upload and manage the hero image displayed on the landing page
          </p>
        </div>
        <Badge variant="outline" className="flex items-center gap-2">
          <Image className="h-4 w-4" />
          Landing Page
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload New Hero Image
            </CardTitle>
            <CardDescription>
              Upload a new hero image to replace the current one
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="hero-image">Image File</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="hero-image"
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  disabled={isUploading}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="flex items-center gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Choose File
                </Button>
                <span className="text-sm text-muted-foreground">
                  {selectedFile ? selectedFile.name : 'No file selected'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Supported formats: JPG, PNG, SVG, WebP. Max size: 10MB (will be
                optimized to 2MB)
              </p>
            </div>

            {selectedFile && (
              <div className="space-y-2">
                <Label>File Details</Label>
                <div className="text-sm space-y-1">
                  <p>
                    <strong>Name:</strong> {selectedFile.name}
                  </p>
                  <p>
                    <strong>Size:</strong> {formatFileSize(selectedFile.size)}
                  </p>
                  <p>
                    <strong>Type:</strong> {selectedFile.type}
                  </p>
                </div>

                {/* Optimization Status */}
                {isOptimizing && (
                  <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                    <span className="text-sm text-blue-700 dark:text-blue-300">
                      Optimizing image for web display...
                    </span>
                  </div>
                )}

                {optimizedImage && (
                  <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                    <Zap className="h-4 w-4 text-green-600" />
                    <div className="text-sm">
                      <p className="text-green-700 dark:text-green-300 font-medium">
                        Image optimized successfully!
                      </p>
                      <p className="text-green-600 dark:text-green-400 text-xs">
                        {getCompressionStats(optimizedImage)}
                      </p>
                    </div>
                  </div>
                )}

                {optimizationError && (
                  <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    <div className="text-sm">
                      <p className="text-yellow-700 dark:text-yellow-300 font-medium">
                        Optimization warning
                      </p>
                      <p className="text-yellow-600 dark:text-yellow-400 text-xs">
                        {optimizationError}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="GrantFather Platform Interface"
                disabled={isUploading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="alt-text">Alt Text</Label>
              <Textarea
                id="alt-text"
                value={altText}
                onChange={(e) => setAltText(e.target.value)}
                placeholder="GrantFather AI-powered grant writing platform interface"
                rows={2}
                disabled={isUploading}
              />
              <p className="text-xs text-muted-foreground">
                Important for accessibility and SEO
              </p>
            </div>

            <Button
              onClick={handleUpload}
              disabled={!selectedFile || isUploading}
              className="w-full"
            >
              {isUploading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Upload Hero Image
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Current Hero Image */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Current Hero Image
            </CardTitle>
            <CardDescription>
              The currently active hero image on the landing page
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoadingHero ? (
              <div className="flex items-center justify-center h-32">
                <RefreshCw className="h-6 w-6 animate-spin" />
              </div>
            ) : currentHeroImage ? (
              <>
                <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                  <img
                    src={currentHeroImage.asset_url}
                    alt={currentHeroImage.alt_text || 'Current hero image'}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = '/placeholder.svg';
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Image Details</Label>
                    <Badge variant="secondary">Active</Badge>
                  </div>
                  <div className="text-sm space-y-1">
                    <p>
                      <strong>Title:</strong>{' '}
                      {currentHeroImage.title || 'No title'}
                    </p>
                    <p>
                      <strong>Alt Text:</strong> {currentHeroImage.alt_text}
                    </p>
                    <p>
                      <strong>Size:</strong>{' '}
                      {currentHeroImage.file_size
                        ? formatFileSize(currentHeroImage.file_size)
                        : 'Not available'}
                    </p>
                    <p>
                      <strong>Type:</strong>{' '}
                      {currentHeroImage.mime_type || 'Not available'}
                    </p>
                    <p>
                      <strong>Updated:</strong>{' '}
                      {new Date(
                        currentHeroImage.updated_at
                      ).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <Separator />

                <Button
                  variant="destructive"
                  onClick={() => deleteMutation.mutate()}
                  disabled={deleteMutation.isPending}
                  className="w-full"
                >
                  {deleteMutation.isPending ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Current Image
                    </>
                  )}
                </Button>
              </>
            ) : (
              <div className="text-center py-8">
                <Image className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  No hero image currently set
                </p>
                <p className="text-sm text-muted-foreground">
                  Upload an image to get started
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Preview Section */}
      {previewUrl && (
        <Card>
          <CardHeader>
            <CardTitle>Image Preview</CardTitle>
            <CardDescription>
              Preview of the selected image before upload
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="aspect-video bg-muted rounded-lg overflow-hidden">
              <img
                src={previewUrl}
                alt="Preview"
                className="w-full h-full object-cover"
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
