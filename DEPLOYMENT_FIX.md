# Deployment Build Fix

## Issue Fixed

The error `Unknown file extension ".ts"` was caused by:
1. The shared package wasn't being built before the API build
2. Node.js tried to import TypeScript source files at runtime

## Solution Applied

### 1. Updated `render.yaml` build command:
```yaml
buildCommand: npm install && npm run build --workspace=packages/shared && npm run build && npm run prisma:generate && npx prisma migrate deploy --schema=./prisma/schema.prisma
```

This ensures:
- Shared package is built first (`packages/shared/dist/` is created)
- Then the API is built (which can now import from the compiled shared package)
- Prisma client is generated
- Migrations are run

### 2. Updated shared package.json:
- Changed exports to point to `./dist/index.js` instead of `./src/index.ts`
- Added build script

### 3. Updated TypeScript configs:
- Changed `moduleResolution` from `"bundler"` to `"node"` for proper Node.js resolution
- Updated base `module` to `ESNext`

## Next Steps

1. **Commit and push** these changes to GitHub
2. **Trigger a new deployment** on Render (or push to trigger auto-deploy)
3. **Monitor the build logs** - you should see:
   - `packages/shared` building successfully
   - `apps/api` building successfully
   - No `.ts` file import errors

## Verification

After deployment succeeds:
- Check logs for "Server listening on..."
- Visit `/health` endpoint - should return `{"status":"ok"}`
- Try registering/login to verify API works
