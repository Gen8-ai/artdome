
import { packageResolver, PackageInfo } from './packageResolver';
import { eslintIntegration } from '../eslintIntegration';

export interface InstallationResult {
  success: boolean;
  installedPackages: PackageInfo[];
  failedPackages: string[];
  conflicts: PackageConflict[];
  recommendations: string[];
}

export interface PackageConflict {
  package1: string;
  package2: string;
  conflictType: 'version' | 'dependency' | 'global';
  description: string;
  resolution?: string;
}

export class PackageInstaller {
  private static instance: PackageInstaller;
  private installedPackages = new Map<string, PackageInfo>();
  private packageCache = new Map<string, InstallationResult>();

  static getInstance(): PackageInstaller {
    if (!PackageInstaller.instance) {
      PackageInstaller.instance = new PackageInstaller();
    }
    return PackageInstaller.instance;
  }

  async installPackages(packageNames: string[]): Promise<InstallationResult> {
    const cacheKey = packageNames.sort().join(',');
    
    if (this.packageCache.has(cacheKey)) {
      console.log('Using cached installation result');
      return this.packageCache.get(cacheKey)!;
    }

    try {
      console.log('Installing packages:', packageNames);

      // Resolve dependency tree
      const resolvedPackages = await packageResolver.resolveDependencyTree(packageNames);
      
      // Analyze conflicts
      const conflicts = this.analyzeConflicts(resolvedPackages);
      
      // Install packages in dependency order
      const installationResults = await this.performInstallation(resolvedPackages);
      
      // Validate with ESLint
      const validationResults = await this.validatePackageCompatibility(resolvedPackages);
      
      const result: InstallationResult = {
        success: installationResults.success,
        installedPackages: installationResults.installed,
        failedPackages: installationResults.failed,
        conflicts,
        recommendations: [
          ...this.generateRecommendations(resolvedPackages),
          ...validationResults.recommendations
        ]
      };

      this.packageCache.set(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Package installation failed:', error);
      return {
        success: false,
        installedPackages: [],
        failedPackages: packageNames,
        conflicts: [],
        recommendations: ['Installation failed. Please check package names and try again.']
      };
    }
  }

  private analyzeConflicts(packages: PackageInfo[]): PackageConflict[] {
    const conflicts: PackageConflict[] = [];
    const globalNames = new Map<string, string[]>();

    // Check for global name conflicts
    packages.forEach(pkg => {
      if (pkg.globalName) {
        if (!globalNames.has(pkg.globalName)) {
          globalNames.set(pkg.globalName, []);
        }
        globalNames.get(pkg.globalName)!.push(pkg.name);
      }
    });

    globalNames.forEach((packageNames, globalName) => {
      if (packageNames.length > 1) {
        conflicts.push({
          package1: packageNames[0],
          package2: packageNames[1],
          conflictType: 'global',
          description: `Multiple packages use the same global name: ${globalName}`,
          resolution: 'Use module aliasing or load packages in specific order'
        });
      }
    });

    // Check for version conflicts
    const packageVersions = new Map<string, string[]>();
    packages.forEach(pkg => {
      pkg.dependencies.forEach(dep => {
        if (!packageVersions.has(dep)) {
          packageVersions.set(dep, []);
        }
        packageVersions.get(dep)!.push(pkg.version);
      });
    });

    packageVersions.forEach((versions, packageName) => {
      const uniqueVersions = [...new Set(versions)];
      if (uniqueVersions.length > 1) {
        conflicts.push({
          package1: packageName,
          package2: 'multiple',
          conflictType: 'version',
          description: `Multiple versions required: ${uniqueVersions.join(', ')}`,
          resolution: 'Use latest compatible version'
        });
      }
    });

    return conflicts;
  }

  private async performInstallation(packages: PackageInfo[]): Promise<{
    success: boolean;
    installed: PackageInfo[];
    failed: string[];
  }> {
    const installed: PackageInfo[] = [];
    const failed: string[] = [];

    for (const pkg of packages) {
      try {
        if (this.installedPackages.has(pkg.name)) {
          console.log(`Package ${pkg.name} already installed`);
          installed.push(pkg);
          continue;
        }

        await this.loadPackageScript(pkg);
        this.installedPackages.set(pkg.name, pkg);
        installed.push(pkg);
        console.log(`Successfully installed ${pkg.name}`);
      } catch (error) {
        console.error(`Failed to install ${pkg.name}:`, error);
        failed.push(pkg.name);
      }
    }

    return {
      success: failed.length === 0,
      installed,
      failed
    };
  }

  private async loadPackageScript(pkg: PackageInfo): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if already loaded
      if (pkg.globalName && typeof window !== 'undefined' && (window as any)[pkg.globalName]) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = pkg.cdnUrl;
      script.crossOrigin = 'anonymous';
      
      script.onload = () => {
        // Verify the package loaded correctly
        if (pkg.globalName && typeof window !== 'undefined' && (window as any)[pkg.globalName]) {
          resolve();
        } else {
          reject(new Error(`Package ${pkg.name} failed to expose global ${pkg.globalName}`));
        }
      };
      
      script.onerror = () => {
        reject(new Error(`Failed to load package ${pkg.name} from ${pkg.cdnUrl}`));
      };
      
      document.head.appendChild(script);
    });
  }

  private async validatePackageCompatibility(packages: PackageInfo[]): Promise<{
    valid: boolean;
    recommendations: string[];
  }> {
    const recommendations: string[] = [];

    // Check for React version compatibility
    const reactPackage = packages.find(p => p.name === 'react');
    const reactDomPackage = packages.find(p => p.name === 'react-dom');

    if (reactPackage && reactDomPackage) {
      if (reactPackage.version !== reactDomPackage.version) {
        recommendations.push('React and ReactDOM versions should match for optimal compatibility');
      }
    }

    // Check for package size warnings
    packages.forEach(pkg => {
      if (pkg.name.includes('lodash') && !pkg.name.includes('lodash-es')) {
        recommendations.push('Consider using lodash-es for better tree shaking');
      }
      if (pkg.name === 'moment' && packages.some(p => p.name.includes('date'))) {
        recommendations.push('Consider using date-fns instead of moment for smaller bundle size');
      }
    });

    // ESLint compatibility check
    try {
      const mockCode = packages
        .filter(p => p.globalName)
        .map(p => `const ${p.name.replace(/-/g, '_')} = window.${p.globalName};`)
        .join('\n');

      const lintResult = await eslintIntegration.lintCode(mockCode, 'javascript');
      if (!lintResult.valid) {
        recommendations.push('Some packages may have ESLint compatibility issues');
      }
    } catch (error) {
      console.warn('ESLint validation failed:', error);
    }

    return {
      valid: true,
      recommendations
    };
  }

  private generateRecommendations(packages: PackageInfo[]): string[] {
    const recommendations: string[] = [];

    // Performance recommendations
    if (packages.length > 10) {
      recommendations.push('Consider lazy loading some packages to improve initial load time');
    }

    // Security recommendations
    packages.forEach(pkg => {
      if (pkg.version === 'latest') {
        recommendations.push(`Pin ${pkg.name} to a specific version for production use`);
      }
    });

    // Bundle size recommendations
    const largePackages = ['lodash', 'moment', 'three', 'chart.js'];
    const foundLargePackages = packages.filter(p => 
      largePackages.some(large => p.name.includes(large))
    );

    if (foundLargePackages.length > 0) {
      recommendations.push('Consider code splitting for large packages to reduce initial bundle size');
    }

    return recommendations;
  }

  getInstalledPackages(): PackageInfo[] {
    return Array.from(this.installedPackages.values());
  }

  isPackageInstalled(packageName: string): boolean {
    return this.installedPackages.has(packageName);
  }

  clearCache(): void {
    this.packageCache.clear();
    console.log('Package installation cache cleared');
  }
}

export const packageInstaller = PackageInstaller.getInstance();
