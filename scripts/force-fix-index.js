const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, '..', 'index.html');
const projectRoot = path.join(__dirname, '..');

console.log('🔧 FORCE FIX: Ensuring index.html is a proper file');
console.log('📍 Project root:', projectRoot);
console.log('📍 Index path:', indexPath);

// List of all possible cache directories
const cacheDirs = [
  path.join(projectRoot, 'node_modules', '.vite'),
  path.join(projectRoot, 'node_modules', '.cache'),
  path.join(projectRoot, '.vite'),
  path.join(projectRoot, 'dist'),
  path.join(projectRoot, '.cache'),
];

// Force remove all caches
console.log('\n🗑️  Removing ALL caches...');
for (const dir of cacheDirs) {
  if (fs.existsSync(dir)) {
    try {
      fs.rmSync(dir, { recursive: true, force: true, maxRetries: 3 });
      console.log(`✅ Removed: ${path.relative(projectRoot, dir)}`);
    } catch (err) {
      console.warn(`⚠️  Could not remove ${path.relative(projectRoot, dir)}:`, err.message);
    }
  }
}

// Force remove index.html (file or directory)
console.log('\n🔥 Force removing index.html...');
if (fs.existsSync(indexPath)) {
  try {
    const stats = fs.lstatSync(indexPath);
    if (stats.isDirectory()) {
      console.log('⚠️  index.html IS A DIRECTORY! Removing...');
      fs.rmSync(indexPath, { recursive: true, force: true, maxRetries: 3 });
    } else {
      console.log('📄 index.html is a file, removing for clean slate...');
      fs.unlinkSync(indexPath);
    }
    console.log('✅ Removed index.html');
  } catch (err) {
    console.error('❌ Error removing index.html:', err.message);
    // Try one more time with extreme prejudice
    try {
      fs.rmSync(indexPath, { recursive: true, force: true, maxRetries: 5 });
      console.log('✅ Force removed on retry');
    } catch (finalErr) {
      console.error('❌ FINAL ERROR:', finalErr.message);
      process.exit(1);
    }
  }
}

// Wait a moment for filesystem to sync
console.log('\n⏳ Waiting for filesystem...');
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
await wait(100);

// Create fresh index.html
console.log('\n📝 Creating fresh index.html...');
const htmlContent = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>GrantFather – Global AI grant writing platform</title>
    <meta name="description" content="GrantFather helps organizations worldwide discover grants, draft winning applications with AI, and track submissions in one place. Specialized expertise in Norwegian and Nordic funding opportunities." />
    <meta name="author" content="GrantFather" />
    <meta name="keywords" content="grant writing, AI grants, Norwegian organizations, volunteer groups, funding applications, grant tracker" />
    <meta name="robots" content="index, follow" />
    <link rel="canonical" href="/" />

    <!-- Inter font -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">

    <meta property="og:title" content="GrantFather – Global AI grant writing platform" />
    <meta property="og:description" content="GrantFather helps organizations worldwide discover grants, draft winning applications with AI, and track submissions in one place. Specialized expertise in Norwegian and Nordic funding opportunities." />
    <meta property="og:type" content="website" />
    <meta property="og:image" content="https://lovable.dev/opengraph-image-p98pqg.png" />

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:site" content="@lovable_dev" />
    <meta name="twitter:image" content="https://lovable.dev/opengraph-image-p98pqg.png" />
  </head>

  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`;

try {
  fs.writeFileSync(indexPath, htmlContent, { 
    encoding: 'utf8', 
    mode: 0o644,
    flag: 'w' // Force overwrite
  });
  console.log('✅ index.html created');
} catch (err) {
  console.error('❌ Failed to write index.html:', err.message);
  process.exit(1);
}

// Verify it's a file
try {
  const stats = fs.statSync(indexPath);
  if (stats.isFile()) {
    console.log('✅ Verified: index.html is a FILE');
    console.log('📏 Size:', stats.size, 'bytes');
  } else {
    console.error('❌ ERROR: index.html is NOT a file!');
    process.exit(1);
  }
} catch (err) {
  console.error('❌ Verification failed:', err.message);
  process.exit(1);
}

console.log('\n✅ FORCE FIX COMPLETE\n');
