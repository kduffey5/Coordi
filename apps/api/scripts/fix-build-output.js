import { existsSync, renameSync, rmSync, readdirSync, statSync, copyFileSync, mkdirSync } from 'fs';
import { join } from 'path';

// If TypeScript output files to dist/apps/api/src/, move them to dist/
const nestedPath = 'dist/apps/api/src';
const targetPath = 'dist';

if (existsSync(nestedPath)) {
  // Move index.js to root of dist
  if (existsSync(join(nestedPath, 'index.js'))) {
    if (!existsSync(targetPath)) {
      mkdirSync(targetPath, { recursive: true });
    }
    renameSync(join(nestedPath, 'index.js'), join(targetPath, 'index.js'));
  }

  // Copy other files/directories
  const entries = readdirSync(nestedPath);
  for (const entry of entries) {
    const srcPath = join(nestedPath, entry);
    const destPath = join(targetPath, entry);
    
    if (statSync(srcPath).isDirectory()) {
      // Recursively copy directory
      copyDirectory(srcPath, destPath);
    } else if (entry !== 'index.js') {
      copyFileSync(srcPath, destPath);
    }
  }

  // Clean up nested structure
  rmSync('dist/apps', { recursive: true, force: true });
  if (existsSync('dist/packages')) {
    rmSync('dist/packages', { recursive: true, force: true });
  }
}

function copyDirectory(src, dest) {
  if (!existsSync(dest)) {
    mkdirSync(dest, { recursive: true });
  }
  
  const entries = readdirSync(src);
  for (const entry of entries) {
    const srcPath = join(src, entry);
    const destPath = join(dest, entry);
    
    if (statSync(srcPath).isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}
