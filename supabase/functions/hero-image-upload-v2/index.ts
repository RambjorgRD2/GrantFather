import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the user is authenticated
    const token = authHeader.replace('Bearer ', '');
    console.log('Token received (first 20 chars):', token.substring(0, 20) + '...');
    console.log('Token length:', token.length);
    
    // Validate token format
    if (!token || token.length < 10) {
      console.error('Invalid token format');
      return new Response(
        JSON.stringify({ error: 'Invalid token format' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    console.log('Auth result:', { user: user ? { id: user.id, email: user.email } : null, authError });
    
    if (authError) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ 
          error: 'Authentication failed', 
          details: authError.message,
          code: authError.message 
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!user) {
      console.error('No user found');
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has SuperAdmin role
    console.log('Checking user roles for user:', user.id);
    const { data: userRoles, error: rolesError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'superadmin');
    
    console.log('User roles query result:', { userRoles, rolesError });

    if (rolesError) {
      console.error('User roles query error:', rolesError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to check user roles', 
          details: rolesError.message,
          code: rolesError.code 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!userRoles || userRoles.length === 0) {
      console.log('User does not have SuperAdmin role');
      return new Response(
        JSON.stringify({ error: 'SuperAdmin role required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User has SuperAdmin role, proceeding with upload');

    // Parse the form data
    const formData = await req.formData();
    console.log('Form data keys:', Array.from(formData.keys()));
    
    const file = formData.get('file');
    const title = formData.get('title') || 'Hero Image';
    const altText = formData.get('altText') || 'Hero image';

    console.log('File:', file ? { name: file.name, size: file.size, type: file.type } : 'null');
    console.log('Title:', title);
    console.log('Alt text:', altText);

    if (!file) {
      console.error('No file provided in form data');
      return new Response(
        JSON.stringify({ error: 'No file provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate file type
    if (!(file instanceof File)) {
      console.error('File is not a File object:', typeof file);
      return new Response(
        JSON.stringify({ error: 'Invalid file format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `hero-image-${Date.now()}.${fileExt}`;
    const filePath = `hero-images/${fileName}`;

    // Upload to Supabase Storage using service role
    const { data: uploadData, error: uploadError } = await supabaseClient.storage
      .from('landing-assets')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return new Response(
        JSON.stringify({ error: `Upload failed: ${uploadError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get public URL
    const { data: urlData } = supabaseClient.storage
      .from('landing-assets')
      .getPublicUrl(filePath);

    // Deactivate current hero image
    console.log('Deactivating current hero images...');
    const { error: deactivateError } = await supabaseClient
      .from('landing_page_assets')
      .update({ is_active: false })
      .eq('asset_type', 'hero_image');

    if (deactivateError) {
      console.warn('Warning: Could not deactivate current hero images:', deactivateError.message);
    } else {
      console.log('Current hero images deactivated');
    }

    // Insert new hero image record
    console.log('Inserting new hero image record...');
    const insertData = {
      asset_type: 'hero_image',
      title: title,
      alt_text: altText,
      asset_url: urlData.publicUrl,
      file_size: file.size,
      mime_type: file.type,
      is_active: true,
    };
    
    
    console.log('Insert data:', insertData);
    
    const { data: insertResult, error: insertError } = await supabaseClient
      .from('landing_page_assets')
      .insert(insertData)
      .select()
      .single();

    if (insertError) {
      console.error('Database insert error:', insertError);
      console.error('Error details:', {
        code: insertError.code,
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint
      });
      return new Response(
        JSON.stringify({ 
          error: `Database insert failed: ${insertError.message}`,
          details: insertError.details,
          code: insertError.code
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Hero image record inserted successfully:', insertResult);

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: insertResult,
        publicUrl: urlData.publicUrl 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ error: `Internal server error: ${error.message}` }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});