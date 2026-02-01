/**
 * Build script for the Node.js bot
 * 
 * Compiles TypeScript files in src/main/modules/bot to JavaScript
 * This is needed because Electron main process loads JavaScript files
 * 
 * Key features:
 * - Adds .js extensions to relative imports (required for ESM in Node.js)
 * - Preserves source maps for debugging
 * - Skips test files
 */

import * as esbuild from 'esbuild';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const botDir = path.join(rootDir, 'src/main/modules/bot');

/**
 * Find all TypeScript files in a directory recursively
 */
function findTsFiles(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      // Skip test directories and node_modules
      if (entry.name === '__tests__' || entry.name === 'node_modules') {
        continue;
      }
      findTsFiles(fullPath, files);
    } else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts') && !entry.name.endsWith('.spec.ts')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

/**
 * Post-process JavaScript files to add .js extension to relative imports
 * Required for ESM in Node.js
 * 
 * This function handles two cases:
 * 1. Direct file imports: ./foo -> ./foo.js
 * 2. Directory imports (index): ./field-handlers -> ./field-handlers/index.js
 */
function addJsExtensionsToFile(filePath) {
  const fileDir = path.dirname(filePath);
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Match import statements: import ... from "./path" or import ... from '../path'
  // Match export statements: export ... from "./path" or export * from "./path"
  // Capture the quote style and path, then add .js if missing
  const importExportRegex = /((?:import|export)\s+(?:[\s\S]*?from\s+)?)(["'])(\.\.?\/[^"']+)(\2)/g;
  
  content = content.replace(importExportRegex, (match, prefix, quote, importPath, closingQuote) => {
    // Skip if already has .js or .json extension
    if (importPath.endsWith('.js') || importPath.endsWith('.json')) {
      return match;
    }
    
    // Resolve the full path to check if it's a directory or file
    const resolvedPath = path.resolve(fileDir, importPath);
    
    // Check if it's a directory with an index.js file
    if (fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isDirectory()) {
      const indexPath = path.join(resolvedPath, 'index.js');
      if (fs.existsSync(indexPath)) {
        // Import from directory - append /index.js
        return `${prefix}${quote}${importPath}/index.js${closingQuote}`;
      }
    }
    
    // Regular file import - just add .js
    return `${prefix}${quote}${importPath}.js${closingQuote}`;
  });
  
  fs.writeFileSync(filePath, content);
}

/**
 * Find all JavaScript files in a directory recursively
 */
function findJsFiles(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      if (entry.name === '__tests__' || entry.name === 'node_modules') {
        continue;
      }
      findJsFiles(fullPath, files);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

async function build() {
  console.log('🔨 Building Node.js bot...');
  console.log(`Bot directory: ${botDir}`);

  try {
    // Find all TypeScript files
    const tsFiles = findTsFiles(botDir);
    console.log(`Found ${tsFiles.length} TypeScript files to compile`);

    if (tsFiles.length === 0) {
      console.warn('⚠️ No TypeScript files found');
      return;
    }

    // Build all bot TypeScript files
    const _result = await esbuild.build({
      entryPoints: tsFiles,
      bundle: false, // Don't bundle - keep individual files
      outdir: botDir,
      outbase: botDir,
      platform: 'node',
      target: 'node18',
      format: 'esm',
      sourcemap: true,
      outExtension: { '.js': '.js' },
      // No plugins needed - we'll post-process the files
    });

    console.log('✅ esbuild compilation complete');
    console.log(`   Compiled ${tsFiles.length} TypeScript files`);
    
    // Post-process: Add .js extensions to all imports in generated JS files
    console.log('📝 Adding .js extensions to imports...');
    const jsFiles = findJsFiles(botDir);
    for (const jsFile of jsFiles) {
      addJsExtensionsToFile(jsFile);
    }
    console.log(`   Fixed imports in ${jsFiles.length} JavaScript files`);
    
    console.log('✅ Bot build complete');
    
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

build();
