# Troubleshooting Guide

## Common Issues and Solutions

### 1. Dependency Installation Timeout

**Error**: `bun install failed to complete: ProcessIOError("Process killed due to timeout")`

**Solutions** (try in order):
```bash
# Option 1: Use the smart installer (recommended)
node scripts/install-deps.js

# Option 2: Emergency fix (if Option 1 fails)
node scripts/fix-install.js

# Option 3: Manual fallback to npm
npm install

# Option 4: Clear everything and start fresh
rm -rf node_modules bun.lockb package-lock.json
npm install
```

### 2. Preview Generation Error

**Error**: `An error occurred when trying to generate preview`

**Root Cause**: Usually caused by failed dependency installation

**Solutions**:
1. **First**: Fix dependencies using Option 1 above
2. Check for TypeScript compilation errors
3. Clear Vite cache: `rm -rf node_modules/.vite`
4. Restart development server

### 3. Build Configuration

The project includes optimized configurations:
- `.bunfig.toml` - Conservative Bun settings with fast fallback
- `vite.config.ts` - Optimized build configuration 
- `scripts/install-deps.js` - Smart installer with npm fallback
- `scripts/fix-install.js` - Emergency dependency fix
- `scripts/fix-dependencies.js` - Diagnostic tool

### 4. Quick Fix Command

For most issues, run this first:
```bash
node scripts/install-deps.js
```

This script automatically:
- Tries Bun with conservative settings
- Falls back to npm if Bun fails  
- Cleans and retries if needed

### 4. Database Issues

If experiencing database connectivity issues:
1. Check Supabase project status
2. Verify environment variables
3. Run database migrations
4. Check RLS policies

### 5. Performance Optimization

The project includes several performance optimizations:
- Dependency pre-bundling
- Code splitting with manual chunks
- Tree shaking enabled
- Optimized asset handling
- Database indexes for frequently queried tables

## Development Commands

```bash
# Development server
bun run dev

# Build for production
bun run build

# Run tests
bun run test

# Run Cypress tests
bun run cypress:run

# Diagnostic script
node scripts/fix-dependencies.js
```

## Support

If issues persist, check:
1. Network connectivity
2. Node.js/Bun version compatibility
3. System resources (memory, disk space)
4. Firewall/proxy settings