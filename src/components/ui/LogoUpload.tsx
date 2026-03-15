import React, { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Upload, Loader2, X, AlertCircle } from 'lucide-react';

interface LogoUploadProps {
  organizationId: string;
  currentLogoUrl?: string | null;
  onLogoChange: (logoUrl: string | null) => void;
  disabled?: boolean;
}

export function LogoUpload({ 
  organizationId, 
  currentLogoUrl, 
  onLogoChange, 
  disabled = false 
}: LogoUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(currentLogoUrl);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Update local state when prop changes
  React.useEffect(() => {
    setLogoUrl(currentLogoUrl);
  }, [currentLogoUrl]);

  const uploadLogo = useCallback(async (file: File) => {
    if (!organizationId) {
      throw new Error('Organization ID is required');
    }

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Invalid file type. Please upload PNG, JPG, or WebP images only.');
    }

    // Validate file size (2MB limit)
    if (file.size > 2 * 1024 * 1024) {
      throw new Error('File too large. Please select an image under 2MB.');
    }

    const fileExt = file.name.split('.').pop()?.toLowerCase();
    const fileName = `${organizationId}-${Date.now()}.${fileExt}`;

    console.log('Uploading logo:', { fileName, fileSize: file.size, fileType: file.type });

    // Upload to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('organization-logos')
      .upload(fileName, file, {
        upsert: true,
        contentType: file.type,
        cacheControl: '3600',
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('organization-logos')
      .getPublicUrl(fileName);

    const publicUrl = urlData.publicUrl;
    console.log('Logo uploaded successfully:', { path: uploadData.path, publicUrl });

    // Update organization in database
    const { error: updateError } = await supabase
      .from('organizations')
      .update({ logo_url: publicUrl })
      .eq('id', organizationId);

    if (updateError) {
      console.error('Database update error:', updateError);
      throw new Error(`Failed to update organization: ${updateError.message}`);
    }

    return publicUrl;
  }, [organizationId]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setIsUploading(true);

    try {
      const newLogoUrl = await uploadLogo(file);
      setLogoUrl(newLogoUrl);
      onLogoChange(newLogoUrl);
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      queryClient.invalidateQueries({ queryKey: ['organization', organizationId] });
      
      toast({
        title: 'Success',
        description: 'Logo uploaded successfully',
      });
    } catch (error: any) {
      console.error('Logo upload error:', error);
      setUploadError(error.message);
      toast({
        title: 'Upload failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const removeLogo = async () => {
    if (!organizationId) return;

    try {
      // Update database
      const { error: updateError } = await supabase
        .from('organizations')
        .update({ logo_url: null })
        .eq('id', organizationId);

      if (updateError) {
        throw new Error(`Failed to remove logo: ${updateError.message}`);
      }

      setLogoUrl(null);
      onLogoChange(null);
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      queryClient.invalidateQueries({ queryKey: ['organization', organizationId] });
      
      toast({
        title: 'Success',
        description: 'Logo removed successfully',
      });
    } catch (error: any) {
      console.error('Logo removal error:', error);
      toast({
        title: 'Removal failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-3">
      <Label>Organization Logo</Label>
      <div className="flex items-center gap-4">
        <div
          className="relative w-20 h-20 bg-muted rounded-lg flex items-center justify-center border-2 border-dashed border-border overflow-hidden"
          data-testid="logo-preview"
        >
          {logoUrl ? (
            <>
              <img
                src={logoUrl}
                alt="Organization logo"
                className="w-full h-full object-cover"
                onError={(e) => {
                  console.error('Logo display error:', logoUrl);
                  setLogoUrl(null);
                  onLogoChange(null);
                }}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={removeLogo}
                disabled={disabled || isUploading}
                className="absolute top-1 right-1 h-6 w-6 p-0 bg-background/80 hover:bg-background"
              >
                <X className="h-3 w-3" />
              </Button>
            </>
          ) : (
            <Upload className="h-6 w-6 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1">
          <input
            type="file"
            id="logo-upload"
            accept="image/png,image/jpeg,image/jpg,image/webp"
            onChange={handleFileSelect}
            disabled={disabled || isUploading}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => document.getElementById('logo-upload')?.click()}
            disabled={disabled || isUploading}
            className="w-full"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Change Logo
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground mt-1">
            PNG, JPG up to 2MB
          </p>
          {uploadError && (
            <div className="flex items-center gap-1 mt-1 text-sm text-red-500">
              <AlertCircle className="h-3 w-3" />
              {uploadError}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}