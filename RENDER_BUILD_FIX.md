# Fixing Render Build Error

## Problem

The error shows:
```
TypeError [ERR_UNKNOWN_FILE_EXTENSION]: Unknown file extension ".ts" for /opt/render/project/src/packages/shared/src/index.ts
```

This happens because:
1. The compiled code still imports `@coordi/shared`
2. Node.js tries to resolve it via package.json exports
3. But the exports point to `./dist/index.js` which doesn't exist yet
4. So it falls back to trying the source `.ts` file

## Solution

The shared package must be built BEFORE the API is built. The render.yaml has been updated to:

1. Build the shared package first: `cd ../../packages/shared && npm run build`
2. Then build the API: `cd ../../apps/api && npm run build`
3. This ensures `packages/shared/dist/` exists before the API tries to import it

## Verification

After the next deployment, check:
1. `packages/shared/dist/index.js` should exist
2. The API imports should resolve to the compiled JavaScript files
3. No `.ts` file imports at runtime
