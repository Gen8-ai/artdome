
import { e2bExecutor } from './e2bExecutor';
import { E2BConfig } from './e2bConfig';

export interface SandboxEnvironment {
  id: string;
  language: 'python' | 'javascript' | 'typescript' | 'node' | 'react';
  tools: string[];
  dependencies: string[];
  isReady: boolean;
  lastActivity: Date;
}

export interface DevToolsConfig {
  enableDebugger: boolean;
  enableLinting: boolean;
  enableFormatting: boolean;
  enableTypeChecking: boolean;
  enableHotReload: boolean;
}

export class E2BSandboxManager {
  private static instance: E2BSandboxManager;
  private activeSandboxes = new Map<string, SandboxEnvironment>();
  private devToolsConfigs = new Map<string, DevToolsConfig>();

  static getInstance(): E2BSandboxManager {
    if (!E2BSandboxManager.instance) {
      E2BSandboxManager.instance = new E2BSandboxManager();
    }
    return E2BSandboxManager.instance;
  }

  async createDevelopmentSandbox(
    language: SandboxEnvironment['language'],
    projectId?: string
  ): Promise<string> {
    const sandboxId = projectId || `dev-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`Creating development sandbox for ${language}...`);

    try {
      // Install development tools based on language
      const devPackages = this.getDevPackages(language);
      const runtimePackages = this.getRuntimePackages(language);
      
      // Setup sandbox environment
      const result = await e2bExecutor.executeCode(
        this.getSetupScript(language, [...devPackages, ...runtimePackages]),
        {
          language: language === 'react' ? 'javascript' : language,
          timeout: 120000, // 2 minutes for setup
          enableFileSystem: true,
          packages: [...devPackages, ...runtimePackages]
        }
      );

      if (!result.success) {
        throw new Error(`Failed to setup development environment: ${result.error}`);
      }

      // Create sandbox environment record
      const sandbox: SandboxEnvironment = {
        id: sandboxId,
        language,
        tools: devPackages,
        dependencies: runtimePackages,
        isReady: true,
        lastActivity: new Date()
      };

      this.activeSandboxes.set(sandboxId, sandbox);

      // Setup default dev tools configuration
      this.devToolsConfigs.set(sandboxId, {
        enableDebugger: true,
        enableLinting: true,
        enableFormatting: true,
        enableTypeChecking: language === 'typescript' || language === 'react',
        enableHotReload: true
      });

      console.log(`Development sandbox ${sandboxId} created successfully`);
      return sandboxId;

    } catch (error) {
      console.error(`Failed to create development sandbox:`, error);
      throw error;
    }
  }

  private getDevPackages(language: SandboxEnvironment['language']): string[] {
    const common = ['git', 'curl', 'wget', 'vim', 'nano'];
    
    switch (language) {
      case 'python':
        return [...common, 'pip', 'black', 'flake8', 'pytest', 'ipython', 'jupyter'];
      case 'javascript':
      case 'typescript':
      case 'node':
        return [...common, 'npm', 'yarn', 'eslint', 'prettier', 'jest', 'nodemon'];
      case 'react':
        return [...common, 'npm', 'yarn', 'eslint', 'prettier', 'jest', '@types/react', '@types/react-dom'];
      default:
        return common;
    }
  }

  private getRuntimePackages(language: SandboxEnvironment['language']): string[] {
    switch (language) {
      case 'python':
        return ['requests', 'numpy', 'pandas', 'matplotlib', 'seaborn', 'scikit-learn'];
      case 'javascript':
      case 'node':
        return ['lodash', 'axios', 'express', 'cors'];
      case 'typescript':
        return ['lodash', 'axios', 'express', 'cors', '@types/node', '@types/lodash'];
      case 'react':
        return ['react', 'react-dom', 'styled-components', 'axios', 'react-router-dom'];
      default:
        return [];
    }
  }

  private getSetupScript(language: SandboxEnvironment['language'], packages: string[]): string {
    switch (language) {
      case 'python':
        return `
import subprocess
import sys

print("Setting up Python development environment...")

# Update pip
subprocess.run([sys.executable, '-m', 'pip', 'install', '--upgrade', 'pip'])

# Install packages
packages = ${JSON.stringify(packages.filter(p => !['git', 'curl', 'wget', 'vim', 'nano'].includes(p)))}
for package in packages:
    try:
        subprocess.run([sys.executable, '-m', 'pip', 'install', package], check=True)
        print(f"✓ Installed {package}")
    except subprocess.CalledProcessError:
        print(f"✗ Failed to install {package}")

print("Python development environment ready!")
`;

      case 'javascript':
      case 'typescript':
      case 'node':
      case 'react':
        return `
console.log("Setting up Node.js development environment...");

const { execSync } = require('child_process');
const fs = require('fs');

// Create package.json if it doesn't exist
if (!fs.existsSync('package.json')) {
  const packageJson = {
    "name": "sandbox-project",
    "version": "1.0.0",
    "description": "E2B Development Sandbox",
    "main": "index.js",
    "scripts": {
      "start": "node index.js",
      "dev": "nodemon index.js",
      "test": "jest",
      "lint": "eslint .",
      "format": "prettier --write ."
    },
    "dependencies": {},
    "devDependencies": {}
  };
  fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
}

// Install packages
const packages = ${JSON.stringify(packages.filter(p => !['git', 'curl', 'wget', 'vim', 'nano'].includes(p)))};
packages.forEach(pkg => {
  try {
    execSync(\`npm install \${pkg}\`, { stdio: 'inherit' });
    console.log(\`✓ Installed \${pkg}\`);
  } catch (error) {
    console.log(\`✗ Failed to install \${pkg}\`);
  }
});

console.log("Node.js development environment ready!");
`;

      default:
        return 'echo "Basic environment setup complete"';
    }
  }

  async executeInSandbox(
    sandboxId: string,
    code: string,
    filename?: string
  ): Promise<any> {
    const sandbox = this.activeSandboxes.get(sandboxId);
    if (!sandbox) {
      throw new Error(`Sandbox ${sandboxId} not found`);
    }

    // Update last activity
    sandbox.lastActivity = new Date();

    try {
      const devConfig = this.devToolsConfigs.get(sandboxId);
      let processedCode = code;

      // Apply linting and formatting if enabled
      if (devConfig?.enableLinting) {
        processedCode = await this.applyLinting(processedCode, sandbox.language);
      }

      if (devConfig?.enableFormatting) {
        processedCode = await this.applyFormatting(processedCode, sandbox.language);
      }

      // Execute code with enhanced error handling
      const result = await e2bExecutor.executeCode(processedCode, {
        language: sandbox.language === 'react' ? 'javascript' : sandbox.language,
        timeout: 60000,
        enableFileSystem: true
      });

      return {
        ...result,
        sandboxId,
        environment: sandbox,
        formattedCode: processedCode
      };

    } catch (error) {
      console.error(`Execution error in sandbox ${sandboxId}:`, error);
      throw error;
    }
  }

  private async applyLinting(code: string, language: SandboxEnvironment['language']): Promise<string> {
    // Simplified linting - in a real implementation, this would use actual linters
    switch (language) {
      case 'javascript':
      case 'typescript':
      case 'react':
        // Basic JavaScript/TypeScript linting rules
        return code
          .replace(/;+/g, ';') // Remove duplicate semicolons
          .replace(/\s+;/g, ';') // Remove spaces before semicolons
          .replace(/\n\n+/g, '\n\n'); // Limit to double newlines
      case 'python':
        // Basic Python formatting
        return code
          .replace(/\t/g, '    ') // Convert tabs to spaces
          .replace(/\n\n+/g, '\n\n'); // Limit to double newlines
      default:
        return code;
    }
  }

  private async applyFormatting(code: string, language: SandboxEnvironment['language']): Promise<string> {
    // Simplified formatting - in a real implementation, this would use prettier/black
    switch (language) {
      case 'javascript':
      case 'typescript':
      case 'react':
        // Basic formatting
        return code
          .replace(/\{/g, ' {\n')
          .replace(/\}/g, '\n}')
          .replace(/,/g, ',\n');
      default:
        return code;
    }
  }

  getSandboxInfo(sandboxId: string): SandboxEnvironment | null {
    return this.activeSandboxes.get(sandboxId) || null;
  }

  listActiveSandboxes(): SandboxEnvironment[] {
    return Array.from(this.activeSandboxes.values());
  }

  async destroySandbox(sandboxId: string): Promise<void> {
    try {
      await e2bExecutor.closeSession(sandboxId);
      this.activeSandboxes.delete(sandboxId);
      this.devToolsConfigs.delete(sandboxId);
      console.log(`Sandbox ${sandboxId} destroyed`);
    } catch (error) {
      console.error(`Failed to destroy sandbox ${sandboxId}:`, error);
    }
  }

  async cleanupInactiveSandboxes(maxIdleTimeMs: number = 30 * 60 * 1000): Promise<void> {
    const now = new Date();
    const sandboxesToCleanup: string[] = [];

    for (const [id, sandbox] of this.activeSandboxes.entries()) {
      const idleTime = now.getTime() - sandbox.lastActivity.getTime();
      if (idleTime > maxIdleTimeMs) {
        sandboxesToCleanup.push(id);
      }
    }

    for (const sandboxId of sandboxesToCleanup) {
      await this.destroySandbox(sandboxId);
    }
  }
}

export const e2bSandboxManager = E2BSandboxManager.getInstance();
