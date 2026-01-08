# Render Build Issue - Fixed

## Problem

The build was failing with:
```
TypeError [ERR_UNKNOWN_FILE_EXTENSION]: Unknown file extension ".ts" for /opt/render/project/src/packages/shared/src/index.ts
```

## Root Cause

The `@coordi/shared` package exports were pointing to TypeScript source files (`.ts`), but Node.js at runtime can't execute TypeScript files. The shared package needed to be compiled to JavaScript first.

## Solution Applied

### 1. Updated `packages/shared/package.json`
- Changed exports from `./src/index.ts` to `./dist/index.js`
- Added build script: `"build": "tsc"`
- Set proper exports with types and default fields

### 2. Updated Build Command in `render.yaml`
- Build shared package FIRST: `npm run build --workspace=@coordi/shared`
- Then build API: `npm run build`
- This ensures `packages/shared/dist/` exists before API imports it

### 3. Fixed TypeScript Configuration
- Changed `moduleResolution` from `"bundler"` to `"node"` in `apps/api/tsconfig.json`
- Updated base `module` from `"commonjs"` to `"ESNext"` in root `tsconfig.json`

## Build Command Order

```bash
npm install                                    # Install all dependencies
npm run build --workspace=@coordi/shared      # Build shared package (creates dist/)
npm run build                                  # Build API (can now import compiled shared)
npm run prisma:generate                        # Generate Prisma client
npx prisma migrate deploy                      # Run migrations
```

## Next Steps

1. **Commit these changes**
2. **Push to GitHub**
3. **Render will auto-deploy** (or trigger manual deploy)
4. **Check build logs** - should see:
   - ✅ Shared package building
   - ✅ API building
   - ✅ No `.ts` file errors
   - ✅ Server starting successfully

## Verification

After successful deployment:
- Visit `/health` endpoint - should return `{"status":"ok"}`
- Check logs for "Server listening on..."
- Try API endpoints to verify functionality
