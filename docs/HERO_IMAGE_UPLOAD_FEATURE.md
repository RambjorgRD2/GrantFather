# 🖼️ Hero Image Upload Feature

## Overview

The Hero Image Upload feature has been added to the SuperAdmin page, allowing superadmin users to manage the hero image displayed on the landing page. This feature provides a user-friendly interface for uploading, previewing, and managing hero images.

## 🎯 Features

### **Upload New Hero Image**
- **File Selection**: Choose image files (JPG, PNG, SVG, WebP)
- **File Size Limit**: Maximum 5MB per file
- **Auto-fill**: Automatically fills title from filename
- **Preview**: Real-time preview of selected image
- **Metadata**: Set custom title and alt text for accessibility

### **Current Hero Image Management**
- **Live Preview**: See the currently active hero image
- **Image Details**: View file size, type, and last updated date
- **Delete Option**: Remove current hero image if needed
- **Status Indicator**: Shows if image is active

### **Smart Fallback System**
- **Database Record**: Primary source for hero image
- **Local SVG**: Fallback to `/hero-platform-preview.svg`
- **Placeholder**: Final fallback to `/placeholder.svg`

## 🚀 How to Use

### **Accessing the Feature**
1. Navigate to the **SuperAdmin Dashboard**
2. Click on the **"Content"** tab
3. You'll see the **Hero Image Management** section

### **Uploading a New Hero Image**
1. **Select File**: Click "Choose File" and select an image
2. **Preview**: Review the image preview
3. **Set Metadata**: 
   - **Title**: Descriptive title for the image
   - **Alt Text**: Accessibility description (important for SEO)
4. **Upload**: Click "Upload Hero Image" button
5. **Success**: You'll see a success message and the new image will be active

### **Managing Current Hero Image**
- **View Details**: See file information and metadata
- **Delete**: Remove the current image (use with caution)
- **Status**: Check if the image is currently active

## 🔧 Technical Implementation

### **Storage System**
- **Bucket**: `landing-assets` (public bucket)
- **Path**: `hero-images/hero-image-{timestamp}.{extension}`
- **Public URLs**: Automatically generated for web access

### **Database Schema**
```sql
landing_page_assets table:
- id: UUID (primary key)
- asset_type: 'hero_image'
- title: Image title
- alt_text: Accessibility description
- storage_path: File path in storage
- public_url: Public access URL
- file_size: File size in bytes
- mime_type: File MIME type
- is_active: Boolean (only one active at a time)
- created_at: Timestamp
- updated_at: Timestamp
```

### **Security Policies**
- **SuperAdmin Only**: Only users with superadmin role can access
- **Storage Policies**: Upload, update, delete permissions for superadmin
- **Database Policies**: Full CRUD access for superadmin users

## 🎨 Image Guidelines

### **Recommended Specifications**
- **Format**: SVG (preferred), PNG, JPG, WebP
- **Size**: Maximum 5MB
- **Dimensions**: 16:9 aspect ratio recommended
- **Quality**: High quality, professional appearance

### **Content Guidelines**
- **Branding**: Should reflect GrantFather branding
- **Professional**: Clean, modern design
- **Accessibility**: Include descriptive alt text
- **Purpose**: Show platform interface or relevant imagery

## 🔍 Troubleshooting

### **Common Issues**

#### **Upload Fails**
- **Check File Size**: Ensure file is under 5MB
- **Check Format**: Use supported image formats
- **Check Permissions**: Ensure you have superadmin role
- **Check Storage**: Verify storage bucket exists

#### **Image Not Displaying**
- **Check Database**: Verify record exists and is active
- **Check URL**: Ensure public URL is accessible
- **Check Fallbacks**: Verify local SVG and placeholder exist

#### **Policy Errors**
- **Storage Policies**: May need to apply migration
- **Database Policies**: Check RLS policies are configured
- **User Role**: Verify superadmin role is assigned

### **Error Messages**
- **"Storage policies not configured"**: Contact administrator to apply migration
- **"Database operation failed"**: Check database permissions
- **"File too large"**: Reduce file size or compress image
- **"Invalid file type"**: Use supported image format

## 📊 Performance Considerations

### **Optimization Tips**
- **Use SVG**: Scalable vector graphics for best performance
- **Compress Images**: Reduce file size while maintaining quality
- **Optimize Dimensions**: Use appropriate image dimensions
- **Cache Headers**: Images are cached for 1 hour

### **Loading Strategy**
1. **Database Query**: Fetch active hero image record
2. **Image Loading**: Load from public URL
3. **Fallback Chain**: Database → Local SVG → Placeholder
4. **Error Handling**: Graceful degradation if image fails

## 🔄 Migration Requirements

### **Storage Policies**
The following migration needs to be applied:
```sql
-- File: supabase/migrations/20250829160000_add_hero_image_upload_policies.sql
-- Adds storage and database policies for superadmin users
```

### **Apply Migration**
```bash
supabase db push
```

## 🎯 Future Enhancements

### **Planned Features**
- **Image Cropping**: Built-in image editing tools
- **Multiple Variants**: Different images for different screen sizes
- **Version History**: Track image changes over time
- **Bulk Upload**: Upload multiple images at once
- **Image Optimization**: Automatic compression and optimization

### **Analytics**
- **Upload Tracking**: Monitor image upload frequency
- **Performance Metrics**: Track image loading times
- **Usage Statistics**: Monitor which images are most effective

## 📝 Support

For technical support or questions about the Hero Image Upload feature:
1. Check the troubleshooting section above
2. Review the browser console for error messages
3. Verify superadmin permissions are correctly set
4. Contact the development team for assistance

---

**Note**: This feature is only available to users with superadmin role. Regular users and organization admins cannot access this functionality.
