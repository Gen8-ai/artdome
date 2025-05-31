
import { e2bExecutor } from './e2bExecutor';
import { E2BConfig, SupportedLanguage } from './e2bConfig';

export interface SandboxEnvironment {
  id: string;
  language: SupportedLanguage;
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
    language: SupportedLanguage,
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
          language: language === 'javascript' ? 'javascript' : language,
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
        enableTypeChecking: language === 'typescript',
        enableHotReload: true
      });

      console.log(`Development sandbox ${sandboxId} created successfully`);
      return sandboxId;

    } catch (error) {
      console.error(`Failed to create development sandbox:`, error);
      throw error;
    }
  }

  private getDevPackages(language: SupportedLanguage): string[] {
    const common = ['git', 'curl', 'wget', 'vim', 'nano'];
    
    switch (language) {
      case 'python':
        return [...common, 'pip', 'black', 'flake8', 'pytest', 'ipython', 'jupyter'];
      case 'javascript':
      case 'typescript':
        return [...common, 'npm', 'yarn', 'eslint', 'prettier', 'jest', 'nodemon'];
      case 'java':
        return [...common, 'maven', 'gradle', 'junit'];
      case 'cpp':
        return [...common, 'gcc', 'g++', 'cmake', 'make'];
      case 'csharp':
        return [...common, 'dotnet'];
      case 'go':
        return [...common, 'go'];
      case 'rust':
        return [...common, 'cargo'];
      case 'php':
        return [...common, 'composer', 'phpunit'];
      case 'ruby':
        return [...common, 'bundler', 'rspec'];
      case 'bash':
        return [...common, 'shellcheck'];
      default:
        return common;
    }
  }

  private getRuntimePackages(language: SupportedLanguage): string[] {
    switch (language) {
      case 'python':
        return ['requests', 'numpy', 'pandas', 'matplotlib', 'seaborn', 'scikit-learn'];
      case 'javascript':
        return ['lodash', 'axios', 'express', 'cors'];
      case 'typescript':
        return ['lodash', 'axios', 'express', 'cors', '@types/node', '@types/lodash'];
      case 'java':
        return ['jackson-core', 'slf4j-api'];
      case 'cpp':
        return ['boost', 'eigen'];
      case 'csharp':
        return ['Newtonsoft.Json'];
      case 'go':
        return ['gin-gonic/gin', 'gorilla/mux'];
      case 'rust':
        return ['serde', 'tokio'];
      case 'php':
        return ['guzzlehttp/guzzle', 'monolog/monolog'];
      case 'ruby':
        return ['rails', 'rspec'];
      case 'bash':
        return [];
      default:
        return [];
    }
  }

  private getSetupScript(language: SupportedLanguage, packages: string[]): string {
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
        language: sandbox.language,
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

  private async applyLinting(code: string, language: SupportedLanguage): Promise<string> {
    // Simplified linting - in a real implementation, this would use actual linters
    switch (language) {
      case 'javascript':
      case 'typescript':
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

  private async applyFormatting(code: string, language: SupportedLanguage): Promise<string> {
    // Simplified formatting - in a real implementation, this would use prettier/black
    switch (language) {
      case 'javascript':
      case 'typescript':
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
