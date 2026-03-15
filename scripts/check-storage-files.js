import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with service role key
const supabase = createClient(
  'https://fjlrplhtgknuulqymsse.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqbHJwbGh0Z2tudXVscXltc3NlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDY1MjYyMywiZXhwIjoyMDcwMjI4NjIzfQ.9R0rITnLw9HARZtxVxeRa66U1QM8W3S3iHKgeUooL7U',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

async function checkStorageFiles() {
  try {
    console.log('🔍 Checking storage files...');

    // List files in the landing-assets bucket
    const { data: files, error: listError } = await supabase.storage
      .from('landing-assets')
      .list('', {
        limit: 100,
        offset: 0,
      });

    if (listError) {
      console.error('❌ Error listing files:', listError);
      return;
    }

    console.log(`✅ Found ${files.length} files in landing-assets bucket:`);
    files.forEach((file, index) => {
      console.log(
        `  ${index + 1}. ${file.name} (${
          file.metadata?.size || 'unknown size'
        } bytes)`
      );
    });

    // Check specifically for hero-images folder
    console.log('\n🔍 Checking hero-images folder...');
    const { data: heroFiles, error: heroError } = await supabase.storage
      .from('landing-assets')
      .list('hero-images', {
        limit: 100,
        offset: 0,
      });

    if (heroError) {
      console.log('❌ Error listing hero-images folder:', heroError.message);
    } else {
      console.log(`✅ Found ${heroFiles.length} files in hero-images folder:`);
      heroFiles.forEach((file, index) => {
        console.log(
          `  ${index + 1}. ${file.name} (${
            file.metadata?.size || 'unknown size'
          } bytes)`
        );
      });
    }

    // Check if the fallback file exists
    console.log('\n🔍 Checking for fallback files...');
    const fallbackFiles = [
      'hero-platform-preview.svg',
      'hero-platform-preview.png',
      'hero-platform-preview.jpg',
    ];

    for (const fileName of fallbackFiles) {
      const { data: fileData, error: fileError } = await supabase.storage
        .from('landing-assets')
        .download(fileName);

      if (fileError) {
        console.log(`❌ ${fileName}: Not found (${fileError.message})`);
      } else {
        console.log(`✅ ${fileName}: Found`);
      }
    }

    // If no hero images exist, let's create a proper fallback
    if (heroFiles.length === 0) {
      console.log('\n🔧 No hero images found, creating a proper fallback...');

      // Create a simple SVG fallback
      const fallbackSvg = `<svg width="800" height="400" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#f8fafc"/>
  <rect x="50" y="50" width="700" height="300" fill="#e2e8f0" rx="8"/>
  <rect x="100" y="100" width="600" height="40" fill="#cbd5e1" rx="4"/>
  <rect x="100" y="160" width="400" height="20" fill="#cbd5e1" rx="2"/>
  <rect x="100" y="190" width="500" height="20" fill="#cbd5e1" rx="2"/>
  <rect x="100" y="220" width="300" height="20" fill="#cbd5e1" rx="2"/>
  <circle cx="650" cy="150" r="30" fill="#3b82f6"/>
  <text x="400" y="280" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" fill="#64748b">GrantFather Platform Preview</text>
</svg>`;

      const svgFile = new File([fallbackSvg], 'hero-platform-preview.svg', {
        type: 'image/svg+xml',
      });

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('landing-assets')
        .upload('hero-platform-preview.svg', svgFile, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) {
        console.error('❌ Error uploading fallback SVG:', uploadError);
      } else {
        console.log('✅ Fallback SVG uploaded successfully');

        // Get the public URL
        const { data: urlData } = supabase.storage
          .from('landing-assets')
          .getPublicUrl('hero-platform-preview.svg');

        console.log('Public URL:', urlData.publicUrl);

        // Update the active hero image with the correct URL
        const { error: updateError } = await supabase
          .from('landing_page_assets')
          .update({ asset_url: urlData.publicUrl })
          .eq('asset_type', 'hero_image')
          .eq('is_active', true);

        if (updateError) {
          console.error('❌ Error updating hero image URL:', updateError);
        } else {
          console.log('✅ Hero image URL updated with working fallback');
        }
      }
    }
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

checkStorageFiles();
