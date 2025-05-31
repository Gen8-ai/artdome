
export interface ModuleConfig {
  name: string;
  url: string;
  globalName: string;
  dependencies?: string[];
  version?: string;
}

export class ModuleSystem {
  private static instance: ModuleSystem;
  private loadedModules = new Map<string, boolean>();
  private loadingPromises = new Map<string, Promise<void>>();
  
  static getInstance(): ModuleSystem {
    if (!ModuleSystem.instance) {
      ModuleSystem.instance = new ModuleSystem();
    }
    return ModuleSystem.instance;
  }

  private readonly modules: ModuleConfig[] = [
    {
      name: 'react',
      url: 'https://unpkg.com/react@18/umd/react.production.min.js',
      globalName: 'React'
    },
    {
      name: 'react-dom',
      url: 'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js',
      globalName: 'ReactDOM',
      dependencies: ['react']
    },
    {
      name: 'babel-standalone',
      url: 'https://unpkg.com/@babel/standalone/babel.min.js',
      globalName: 'Babel'
    },
    {
      name: 'lucide-react',
      url: 'https://unpkg.com/lucide-react@latest/dist/umd/lucide-react.js',
      globalName: 'LucideReact',
      dependencies: ['react']
    }
  ];

  async loadModule(moduleName: string): Promise<void> {
    if (this.loadedModules.get(moduleName)) {
      return Promise.resolve();
    }

    if (this.loadingPromises.has(moduleName)) {
      return this.loadingPromises.get(moduleName)!;
    }

    const moduleConfig = this.modules.find(m => m.name === moduleName);
    if (!moduleConfig) {
      throw new Error(`Module ${moduleName} not found`);
    }

    const loadPromise = this.loadModuleScript(moduleConfig);
    this.loadingPromises.set(moduleName, loadPromise);

    try {
      await loadPromise;
      this.loadedModules.set(moduleName, true);
      this.loadingPromises.delete(moduleName);
    } catch (error) {
      this.loadingPromises.delete(moduleName);
      throw error;
    }
  }

  private async loadModuleScript(config: ModuleConfig): Promise<void> {
    // Load dependencies first
    if (config.dependencies) {
      await Promise.all(config.dependencies.map(dep => this.loadModule(dep)));
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = config.url;
      script.crossOrigin = 'anonymous';
      
      script.onload = () => {
        // Verify the module loaded correctly
        if (typeof window !== 'undefined' && (window as any)[config.globalName]) {
          console.log(`Module ${config.name} loaded successfully`);
          resolve();
        } else {
          reject(new Error(`Module ${config.name} failed to expose global ${config.globalName}`));
        }
      };
      
      script.onerror = () => {
        reject(new Error(`Failed to load module ${config.name} from ${config.url}`));
      };
      
      document.head.appendChild(script);
    });
  }

  async loadRequiredModules(moduleNames: string[]): Promise<void> {
    try {
      await Promise.all(moduleNames.map(name => this.loadModule(name)));
    } catch (error) {
      console.error('Failed to load required modules:', error);
      throw error;
    }
  }

  isModuleLoaded(moduleName: string): boolean {
    return this.loadedModules.get(moduleName) === true;
  }

  getLoadedModules(): string[] {
    return Array.from(this.loadedModules.keys()).filter(key => this.loadedModules.get(key));
  }
}

export const moduleSystem = ModuleSystem.getInstance();
