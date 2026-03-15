#!/usr/bin/env node

/**
 * Logo Debug and Test Script
 * 
 * This script helps debug logo upload and display issues.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testLogoUpload() {
  console.log('🧪 Testing logo upload...');
  
  try {
    // Create a test image (1x1 pixel PNG)
    const testImageData = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    const testImageBuffer = Buffer.from(testImageData, 'base64');
    
    const fileName = `test-${Date.now()}.png`;
    
    const { data, error } = await supabase.storage
      .from('organization-logos')
      .upload(fileName, testImageBuffer, {
        contentType: 'image/png',
        upsert: true
      });
    
    if (error) {
      console.error('❌ Upload failed:', error.message);
      return;
    }
    
    console.log('✅ Upload successful:', data);
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from('organization-logos')
      .getPublicUrl(fileName);
    
    console.log('✅ Public URL:', urlData.publicUrl);
    
    // Test URL access
    const response = await fetch(urlData.publicUrl);
    console.log('✅ URL accessible:', response.ok);
    
    // Clean up
    await supabase.storage
      .from('organization-logos')
      .remove([fileName]);
    
    console.log('✅ Test file cleaned up');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

async function checkOrganizations() {
  console.log('\n📊 Checking organizations...');
  
  const { data: orgs, error } = await supabase
    .from('organizations')
    .select('id, name, logo_url')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }
  
  console.log(`Found ${orgs.length} organizations:`);
  orgs.forEach(org => {
    console.log(`- ${org.name}: ${org.logo_url || 'No logo'}`);
  });
}

async function main() {
  console.log('🔍 Logo Debug Script');
  console.log('===================\n');
  
  await checkOrganizations();
  await testLogoUpload();
  
  console.log('\n✅ Debug complete!');
}

main().catch(console.error);