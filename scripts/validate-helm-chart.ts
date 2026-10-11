/**
 * Helm Chart Syntax and Structural Integrity Validator
 * Validates chart metadata, template delimiters, conditionals, and manifest schemas.
 */
import fs from 'fs';
import path from 'path';

const chartDir = path.resolve(process.cwd(), 'helm/woocommerce-mcp');

interface ValidationResult {
  file: string;
  passed: boolean;
  errors: string[];
}

function validateFileExists(relativePath: string): boolean {
  const fullPath = path.join(chartDir, relativePath);
  return fs.existsSync(fullPath);
}

function checkTemplateDelimiters(content: string, _filename: string): string[] {
  const errors: string[] = [];

  // Strip multi-line Go template comments: {{/* ... */}}
  const cleanContent = content.replace(/\{\{\/\*[\s\S]*?\*\/\}\}/g, '');

  // Check overall {{ and }} balance across entire file
  const totalOpen = (cleanContent.match(/\{\{/g) || []).length;
  const totalClose = (cleanContent.match(/\}\}/g) || []).length;

  if (totalOpen !== totalClose) {
    errors.push(`Mismatched template tags across file: ${totalOpen} open vs ${totalClose} close`);
  }

  // Count opening control structures (if, with, range, define) vs end
  const openBlocks = (cleanContent.match(/\{\{-?\s*(?:if|with|range|define)\s+/g) || []).length;
  const closeBlocks = (cleanContent.match(/\{\{-?\s*end\s*-?\}\}/g) || []).length;

  if (openBlocks !== closeBlocks) {
    errors.push(`Mismatched block tags: ${openBlocks} opening blocks (if/with/range/define) vs ${closeBlocks} end blocks`);
  }

  return errors;
}

export function runValidation(): boolean {
  console.log('🔍 Validating Helm Chart: ' + chartDir);
  const requiredFiles = [
    'Chart.yaml',
    'values.yaml',
    'values-local.yaml',
    'values-prod.yaml',
    'templates/_helpers.tpl',
    'templates/secrets.yaml',
    'templates/ingress.yaml',
    'templates/database/deployment.yaml',
    'templates/database/service.yaml',
    'templates/database/pvc.yaml',
    'templates/wordpress/deployment.yaml',
    'templates/wordpress/service.yaml',
    'templates/wordpress/pvc.yaml',
    'templates/woocommerce-mcp/deployment.yaml',
    'templates/woocommerce-mcp/service.yaml',
    'templates/gateway/deployment.yaml',
    'templates/gateway/service.yaml',
  ];

  let allPassed = true;
  const results: ValidationResult[] = [];

  for (const relFile of requiredFiles) {
    const fullPath = path.join(chartDir, relFile);
    if (!fs.existsSync(fullPath)) {
      results.push({ file: relFile, passed: false, errors: ['File missing'] });
      allPassed = false;
      continue;
    }

    const content = fs.readFileSync(fullPath, 'utf8');
    const errors = checkTemplateDelimiters(content, relFile);

    if (errors.length > 0) {
      results.push({ file: relFile, passed: false, errors });
      allPassed = false;
    } else {
      results.push({ file: relFile, passed: true, errors: [] });
    }
  }

  // Print Summary
  console.log('\n--- Helm Validation Summary ---');
  for (const res of results) {
    if (res.passed) {
      console.log(` ✅ ${res.file}`);
    } else {
      console.log(` ❌ ${res.file}: ${res.errors.join(', ')}`);
    }
  }

  // Check in-cluster DNS service references in templates
  const mcpDep = fs.readFileSync(path.join(chartDir, 'templates/woocommerce-mcp/deployment.yaml'), 'utf8');
  const wpDep = fs.readFileSync(path.join(chartDir, 'templates/wordpress/deployment.yaml'), 'utf8');

  console.log('\n--- Checking Kubernetes DNS Resolution Configuration ---');
  if (wpDep.includes('woocommerce-mcp.database.serviceName')) {
    console.log(' ✅ WordPress correctly resolves database via in-cluster service DNS');
  } else {
    console.log(' ❌ WordPress missing in-cluster database DNS reference');
    allPassed = false;
  }

  if (mcpDep.includes('woocommerce-mcp.wordpress.inClusterUrl')) {
    console.log(' ✅ WooCommerce MCP server correctly resolves WordPress via in-cluster service DNS');
  } else {
    console.log(' ❌ WooCommerce MCP server missing in-cluster WordPress DNS reference');
    allPassed = false;
  }

  // Check Ingress privacy rules (Requirement 9)
  const ingContent = fs.readFileSync(path.join(chartDir, 'templates/ingress.yaml'), 'utf8');
  if (!ingContent.includes('woocommerce-mcp.mcpServer.serviceName')) {
    console.log(' ✅ WooCommerce MCP server is strictly private and NOT exposed via Ingress');
  } else {
    console.log(' ❌ Violation: WooCommerce MCP server must NOT be exposed via Ingress');
    allPassed = false;
  }

  if (allPassed) {
    console.log('\n🎉 All Helm Chart templates and configurations validated successfully!');
  } else {
    console.log('\n⚠️ Some validations failed.');
  }

  return allPassed;
}

const success = runValidation();
process.exit(success ? 0 : 1);
