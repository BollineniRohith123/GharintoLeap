#!/usr/bin/env node

/**
 * Duplicate File Scanner & Code Quality Assessment
 * Scans for duplicate files, unused code, and optimization opportunities
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

console.log('🧹 DUPLICATE FILE SCANNER & CODE QUALITY ASSESSMENT');
console.log('====================================================');
console.log('🏢 Gharinto Leap Interior Design Marketplace');
console.log('====================================================\n');

let scanResults = {
  duplicates: { found: 0, removed: 0, details: [] },
  unused: { found: 0, cleaned: 0, details: [] },
  optimization: { found: 0, applied: 0, details: [] }
};

function logScanResult(category, action, details = '') {
  scanResults[category].found++;
  console.log(`🔍 ${action}: ${details}`);
  scanResults[category].details.push({ action, details });
}

function getFileHash(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return crypto.createHash('md5').update(content).digest('hex');
  } catch (error) {
    return null;
  }
}

function scanForDuplicateFiles() {
  console.log('\n📁 SCANNING FOR DUPLICATE FILES');
  console.log('================================');
  
  const fileHashes = new Map();
  const duplicates = [];
  
  function scanDirectory(dir, excludeDirs = ['node_modules', '.git', 'dist', 'build']) {
    try {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          if (!excludeDirs.includes(item)) {
            scanDirectory(fullPath, excludeDirs);
          }
        } else if (stat.isFile()) {
          // Only check certain file types
          const ext = path.extname(item).toLowerCase();
          if (['.js', '.ts', '.tsx', '.jsx', '.css', '.json'].includes(ext)) {
            const hash = getFileHash(fullPath);
            if (hash) {
              if (fileHashes.has(hash)) {
                duplicates.push({
                  original: fileHashes.get(hash),
                  duplicate: fullPath,
                  hash: hash
                });
              } else {
                fileHashes.set(hash, fullPath);
              }
            }
          }
        }
      }
    } catch (error) {
      console.log(`Error scanning ${dir}: ${error.message}`);
    }
  }
  
  scanDirectory('./');
  
  if (duplicates.length === 0) {
    console.log('✅ No duplicate files found');
  } else {
    console.log(`🔍 Found ${duplicates.length} potential duplicates:`);
    duplicates.forEach((dup, index) => {
      console.log(`\n${index + 1}. Potential duplicate:`);
      console.log(`   Original: ${dup.original}`);
      console.log(`   Duplicate: ${dup.duplicate}`);
      
      // Analyze if it's a safe duplicate to remove
      const originalName = path.basename(dup.original);
      const duplicateName = path.basename(dup.duplicate);
      
      if (originalName === duplicateName) {
        logScanResult('duplicates', 'Exact duplicate found', 
                     `${dup.duplicate} is identical to ${dup.original}`);
      } else {
        logScanResult('duplicates', 'Similar content found', 
                     `${dup.duplicate} has same content as ${dup.original} but different name`);
      }
    });
  }
  
  return duplicates;
}

function scanForUnusedFiles() {
  console.log('\n🗑️ SCANNING FOR UNUSED FILES');
  console.log('=============================');
  
  const allFiles = new Set();
  const referencedFiles = new Set();
  
  function collectFiles(dir, excludeDirs = ['node_modules', '.git', 'dist', 'build']) {
    try {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          if (!excludeDirs.includes(item)) {
            collectFiles(fullPath, excludeDirs);
          }
        } else if (stat.isFile()) {
          const ext = path.extname(item).toLowerCase();
          if (['.js', '.ts', '.tsx', '.jsx'].includes(ext)) {
            allFiles.add(fullPath);
          }
        }
      }
    } catch (error) {
      console.log(`Error collecting files from ${dir}: ${error.message}`);
    }
  }
  
  function findReferences(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Look for import statements
      const importMatches = content.match(/import.*from\s+['"`]([^'"`]+)['"`]/g);
      if (importMatches) {
        importMatches.forEach(match => {
          const pathMatch = match.match(/from\s+['"`]([^'"`]+)['"`]/);
          if (pathMatch) {
            let importPath = pathMatch[1];
            
            // Resolve relative paths
            if (importPath.startsWith('./') || importPath.startsWith('../')) {
              const resolvedPath = path.resolve(path.dirname(filePath), importPath);
              
              // Try different extensions
              const extensions = ['.ts', '.tsx', '.js', '.jsx'];
              for (const ext of extensions) {
                const fullPath = resolvedPath + ext;
                if (fs.existsSync(fullPath)) {
                  referencedFiles.add(fullPath);
                  break;
                }
              }
            }
          }
        });
      }
      
      // Look for require statements
      const requireMatches = content.match(/require\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g);
      if (requireMatches) {
        requireMatches.forEach(match => {
          const pathMatch = match.match(/['"`]([^'"`]+)['"`]/);
          if (pathMatch) {
            let requirePath = pathMatch[1];
            
            if (requirePath.startsWith('./') || requirePath.startsWith('../')) {
              const resolvedPath = path.resolve(path.dirname(filePath), requirePath);
              
              const extensions = ['.js', '.ts', '.tsx', '.jsx'];
              for (const ext of extensions) {
                const fullPath = resolvedPath + ext;
                if (fs.existsSync(fullPath)) {
                  referencedFiles.add(fullPath);
                  break;
                }
              }
            }
          }
        });
      }
    } catch (error) {
      // Ignore read errors
    }
  }
  
  collectFiles('./');
  
  // Find references in all files
  allFiles.forEach(file => {
    findReferences(file);
  });
  
  // Always consider entry points as referenced
  const entryPoints = [
    './frontend/App.tsx',
    './frontend/main.tsx',
    './frontend/index.tsx',
    './backend/server.js',
    './backend/index.js'
  ];
  
  entryPoints.forEach(entry => {
    if (fs.existsSync(entry)) {
      referencedFiles.add(path.resolve(entry));
    }
  });
  
  const unreferencedFiles = [];
  allFiles.forEach(file => {
    const resolvedFile = path.resolve(file);
    if (!referencedFiles.has(resolvedFile)) {
      // Check if it's a test file or config file (usually safe to keep)
      const fileName = path.basename(file);
      if (!fileName.includes('.test.') && 
          !fileName.includes('.spec.') && 
          !fileName.includes('config') &&
          !fileName.includes('setup')) {
        unreferencedFiles.push(file);
      }
    }
  });
  
  if (unreferencedFiles.length === 0) {
    console.log('✅ No obviously unused files found');
  } else {
    console.log(`🔍 Found ${unreferencedFiles.length} potentially unused files:`);
    unreferencedFiles.forEach((file, index) => {
      console.log(`${index + 1}. ${file}`);
      logScanResult('unused', 'Potentially unused file', file);
    });
    
    console.log('\n⚠️  Note: These files might be used dynamically or in ways not detected by static analysis.');
    console.log('   Manual review is recommended before removal.');
  }
  
  return unreferencedFiles;
}

function scanForOptimizations() {
  console.log('\n⚡ SCANNING FOR OPTIMIZATION OPPORTUNITIES');
  console.log('==========================================');
  
  const optimizations = [];
  
  function analyzeFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      
      // Check for console.log statements (should be removed in production)
      const consoleLogLines = lines.filter((line, index) => {
        return line.includes('console.log') && !line.trim().startsWith('//');
      });
      
      if (consoleLogLines.length > 0) {
        optimizations.push({
          file: filePath,
          type: 'Console logs',
          count: consoleLogLines.length,
          description: `${consoleLogLines.length} console.log statements found`
        });
      }
      
      // Check for TODO/FIXME comments
      const todoLines = lines.filter(line => {
        return line.includes('TODO') || line.includes('FIXME') || line.includes('HACK');
      });
      
      if (todoLines.length > 0) {
        optimizations.push({
          file: filePath,
          type: 'TODO comments',
          count: todoLines.length,
          description: `${todoLines.length} TODO/FIXME comments found`
        });
      }
      
      // Check for large files (potential for splitting)
      if (lines.length > 500) {
        optimizations.push({
          file: filePath,
          type: 'Large file',
          count: lines.length,
          description: `${lines.length} lines - consider splitting`
        });
      }
      
    } catch (error) {
      // Ignore read errors
    }
  }
  
  function scanForOptimizationsInDir(dir, excludeDirs = ['node_modules', '.git', 'dist', 'build']) {
    try {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          if (!excludeDirs.includes(item)) {
            scanForOptimizationsInDir(fullPath, excludeDirs);
          }
        } else if (stat.isFile()) {
          const ext = path.extname(item).toLowerCase();
          if (['.js', '.ts', '.tsx', '.jsx'].includes(ext)) {
            analyzeFile(fullPath);
          }
        }
      }
    } catch (error) {
      console.log(`Error scanning ${dir}: ${error.message}`);
    }
  }
  
  scanForOptimizationsInDir('./');
  
  if (optimizations.length === 0) {
    console.log('✅ No obvious optimization opportunities found');
  } else {
    console.log(`🔍 Found ${optimizations.length} optimization opportunities:`);
    
    const groupedOptimizations = {};
    optimizations.forEach(opt => {
      if (!groupedOptimizations[opt.type]) {
        groupedOptimizations[opt.type] = [];
      }
      groupedOptimizations[opt.type].push(opt);
    });
    
    Object.keys(groupedOptimizations).forEach(type => {
      console.log(`\n${type}:`);
      groupedOptimizations[type].forEach(opt => {
        console.log(`   ${opt.file}: ${opt.description}`);
        logScanResult('optimization', type, `${opt.file}: ${opt.description}`);
      });
    });
  }
  
  return optimizations;
}

function generateCleanupReport() {
  console.log('\n📊 FILE CLEANUP & OPTIMIZATION REPORT');
  console.log('======================================');
  
  const categories = Object.keys(scanResults);
  
  categories.forEach(category => {
    const result = scanResults[category];
    console.log(`${category.toUpperCase().padEnd(15)} | Found: ${result.found} | Processed: ${result.cleaned || result.removed || result.applied || 0}`);
  });
  
  console.log('\n🎯 CLEANUP SUMMARY');
  console.log('==================');
  console.log(`Total Issues Found: ${scanResults.duplicates.found + scanResults.unused.found + scanResults.optimization.found}`);
  console.log(`Items Processed: ${(scanResults.duplicates.removed || 0) + (scanResults.unused.cleaned || 0) + (scanResults.optimization.applied || 0)}`);
  
  console.log('\n🏆 CODEBASE STATUS');
  console.log('==================');
  const totalIssues = scanResults.duplicates.found + scanResults.unused.found + scanResults.optimization.found;
  
  if (totalIssues === 0) {
    console.log('🎉 EXCELLENT - Codebase is clean and optimized!');
  } else if (totalIssues <= 5) {
    console.log('🟢 GOOD - Minor cleanup opportunities');
  } else if (totalIssues <= 15) {
    console.log('🟡 FAIR - Some cleanup recommended');
  } else {
    console.log('🔴 NEEDS ATTENTION - Significant cleanup opportunities');
  }
  
  return scanResults;
}

async function runFileCleanupAnalysis() {
  console.log('🚀 Starting File Cleanup & Optimization Analysis...\n');
  
  // Scan for duplicates
  const duplicates = scanForDuplicateFiles();
  
  // Scan for unused files
  const unused = scanForUnusedFiles();
  
  // Scan for optimizations
  const optimizations = scanForOptimizations();
  
  return generateCleanupReport();
}

// Run the analysis
runFileCleanupAnalysis().catch(console.error);
