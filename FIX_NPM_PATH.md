# Fixing npm "not recognized" Issue on Windows

## Quick Fix (Temporary - Current Session Only)

If npm is installed but not recognized, add it to PATH for this session:

**In PowerShell, run:**
```powershell
$env:Path += ";C:\Program Files\nodejs"
```

Then verify:
```powershell
node --version
npm --version
```

## Permanent Fix (Recommended)

### Option 1: Restart Your Terminal
The simplest fix - **close and reopen** your PowerShell/terminal window. Node.js installer should have added it to PATH, but you need to restart for changes to take effect.

### Option 2: Add to PATH Manually

1. **Open System Environment Variables:**
   - Press `Win + R`
   - Type: `sysdm.cpl` and press Enter
   - Click "Environment Variables" button

2. **Edit PATH:**
   - Under "System variables", find and select `Path`
   - Click "Edit"
   - Click "New"
   - Add: `C:\Program Files\nodejs`
   - Click "OK" on all dialogs

3. **Restart your terminal** for changes to take effect

### Option 3: Verify Node.js Installation

Check if Node.js is actually installed:

**In PowerShell:**
```powershell
Test-Path "C:\Program Files\nodejs\npm.cmd"
```

If this returns `True`, Node.js is installed but just needs to be in PATH.

If `False`, you need to:
1. Download Node.js from https://nodejs.org/
2. Install it (make sure to check "Add to PATH" during installation)
3. Restart your terminal

## Verify Installation

After fixing PATH, verify with:
```powershell
node --version
npm --version
```

You should see version numbers (e.g., `v20.10.0` and `10.2.3`).

## Alternative: Use Full Path

If you can't fix PATH right now, you can use the full path:

```powershell
& "C:\Program Files\nodejs\npm.cmd" --version
```

To run npm commands:
```powershell
& "C:\Program Files\nodejs\npm.cmd" install
& "C:\Program Files\nodejs\npm.cmd" run prisma:generate
```

But fixing PATH is much easier! 😊
