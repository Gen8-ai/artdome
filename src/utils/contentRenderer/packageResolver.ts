
export interface PackageInfo {
  name: string;
  version: string;
  cdnUrl: string;
  globalName?: string;
  dependencies: string[];
}

export class PackageResolver {
  private static readonly CDN_PROVIDERS = {
    unpkg: 'https://unpkg.com',
    jsdelivr: 'https://cdn.jsdelivr.net/npm',
    skypack: 'https://cdn.skypack.dev'
  };

  private packageCache = new Map<string, PackageInfo>();

  async resolvePackage(packageName: string, version = 'latest'): Promise<PackageInfo> {
    const cacheKey = `${packageName}@${version}`;
    
    if (this.packageCache.has(cacheKey)) {
      return this.packageCache.get(cacheKey)!;
    }

    try {
      const packageInfo = await this.fetchPackageInfo(packageName, version);
      this.packageCache.set(cacheKey, packageInfo);
      return packageInfo;
    } catch (error) {
      console.error(`Failed to resolve package ${packageName}:`, error);
      throw new Error(`Package resolution failed for ${packageName}`);
    }
  }

  private async fetchPackageInfo(packageName: string, version: string): Promise<PackageInfo> {
    // Try to fetch package.json from CDN
    const packageJsonUrl = `${PackageResolver.CDN_PROVIDERS.unpkg}/${packageName}@${version}/package.json`;
    
    try {
      const response = await fetch(packageJsonUrl);
      if (!response.ok) {
        throw new Error(`Package not found: ${packageName}@${version}`);
      }

      const packageJson = await response.json();
      
      return {
        name: packageName,
        version: packageJson.version || version,
        cdnUrl: this.buildCDNUrl(packageName, packageJson.version || version, packageJson),
        globalName: this.inferGlobalName(packageName, packageJson),
        dependencies: Object.keys(packageJson.dependencies || {})
      };
    } catch (error) {
      // Fallback to predefined packages
      return this.getFallbackPackageInfo(packageName, version);
    }
  }

  private buildCDNUrl(packageName: string, version: string, packageJson: any): string {
    const baseUrl = `${PackageResolver.CDN_PROVIDERS.unpkg}/${packageName}@${version}`;
    
    // Check for UMD build
    if (packageJson.unpkg) {
      return `${baseUrl}/${packageJson.unpkg}`;
    }
    if (packageJson.browser) {
      return `${baseUrl}/${packageJson.browser}`;
    }
    if (packageJson.main) {
      return `${baseUrl}/${packageJson.main}`;
    }
    
    return `${baseUrl}/index.js`;
  }

  private inferGlobalName(packageName: string, packageJson: any): string {
    // Check if package.json specifies global name
    if (packageJson.globalName) {
      return packageJson.globalName;
    }

    // Common patterns
    const commonGlobals: Record<string, string> = {
      'react': 'React',
      'react-dom': 'ReactDOM',
      'lodash': '_',
      'axios': 'axios',
      'moment': 'moment',
      'three': 'THREE',
      'd3': 'd3'
    };

    if (commonGlobals[packageName]) {
      return commonGlobals[packageName];
    }

    // Convert kebab-case to PascalCase
    return packageName
      .split('-')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join('');
  }

  private getFallbackPackageInfo(packageName: string, version: string): PackageInfo {
    const fallbacks: Record<string, Partial<PackageInfo>> = {
      'react': {
        cdnUrl: 'https://unpkg.com/react@18/umd/react.production.min.js',
        globalName: 'React'
      },
      'react-dom': {
        cdnUrl: 'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js',
        globalName: 'ReactDOM',
        dependencies: ['react']
      },
      'lucide-react': {
        cdnUrl: 'https://unpkg.com/lucide-react@latest/dist/umd/lucide-react.js',
        globalName: 'LucideReact',
        dependencies: ['react']
      }
    };

    const fallback = fallbacks[packageName];
    if (!fallback) {
      throw new Error(`No fallback available for package: ${packageName}`);
    }

    return {
      name: packageName,
      version,
      cdnUrl: fallback.cdnUrl!,
      globalName: fallback.globalName,
      dependencies: fallback.dependencies || []
    };
  }

  async resolveDependencyTree(packages: string[]): Promise<PackageInfo[]> {
    const resolved: PackageInfo[] = [];
    const visited = new Set<string>();

    const resolveRecursive = async (packageName: string) => {
      if (visited.has(packageName)) return;
      visited.add(packageName);

      const packageInfo = await this.resolvePackage(packageName);
      
      // Resolve dependencies first
      for (const dep of packageInfo.dependencies) {
        await resolveRecursive(dep);
      }
      
      resolved.push(packageInfo);
    };

    for (const packageName of packages) {
      await resolveRecursive(packageName);
    }

    return resolved;
  }
}

export const packageResolver = new PackageResolver();
