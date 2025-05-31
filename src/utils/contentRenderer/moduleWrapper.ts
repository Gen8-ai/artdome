
export interface ModuleWrapperOptions {
  moduleId: string;
  code: string;
  dependencies?: string[];
  exports?: string[];
  isolateGlobals?: boolean;
  timeout?: number;
}

export interface WrappedModule {
  id: string;
  exports: any;
  execute: () => Promise<any>;
  dispose: () => void;
  isExecuted: boolean;
}

export class ModuleWrapper {
  private static instance: ModuleWrapper;
  private modules = new Map<string, WrappedModule>();
  private moduleCache = new Map<string, any>();

  static getInstance(): ModuleWrapper {
    if (!ModuleWrapper.instance) {
      ModuleWrapper.instance = new ModuleWrapper();
    }
    return ModuleWrapper.instance;
  }

  async wrapModule(options: ModuleWrapperOptions): Promise<WrappedModule> {
    const { moduleId, code, dependencies = [], exports = [], isolateGlobals = true, timeout = 5000 } = options;

    // Check if module already exists
    if (this.modules.has(moduleId)) {
      return this.modules.get(moduleId)!;
    }

    const wrappedModule = this.createModuleWrapper(moduleId, code, dependencies, exports, isolateGlobals, timeout);
    this.modules.set(moduleId, wrappedModule);
    
    return wrappedModule;
  }

  private createModuleWrapper(
    moduleId: string, 
    code: string, 
    dependencies: string[], 
    exports: string[], 
    isolateGlobals: boolean,
    timeout: number
  ): WrappedModule {
    let isExecuted = false;
    let moduleExports: any = {};
    let executionContext: any = null;

    const execute = async (): Promise<any> => {
      if (isExecuted) {
        return moduleExports;
      }

      try {
        // Create isolated execution context
        const context = isolateGlobals ? this.createIsolatedContext() : window;
        
        // Load dependencies
        await this.loadDependencies(dependencies, context);
        
        // Create module execution function
        const moduleFunction = this.createModuleFunction(code, context, exports);
        
        // Execute with timeout
        const result = await this.executeWithTimeout(moduleFunction, timeout);
        
        // Extract exports
        moduleExports = this.extractExports(context, exports, result);
        executionContext = context;
        isExecuted = true;
        
        console.log(`Module ${moduleId} executed successfully`);
        return moduleExports;
        
      } catch (error) {
        console.error(`Module ${moduleId} execution failed:`, error);
        throw error;
      }
    };

    const dispose = (): void => {
      if (executionContext && isolateGlobals) {
        this.cleanupContext(executionContext);
      }
      moduleExports = {};
      isExecuted = false;
      executionContext = null;
      this.modules.delete(moduleId);
      console.log(`Module ${moduleId} disposed`);
    };

    return {
      id: moduleId,
      get exports() { return moduleExports; },
      execute,
      dispose,
      get isExecuted() { return isExecuted; }
    };
  }

  private createIsolatedContext(): any {
    // Create a new context with necessary globals
    const context = {
      // Core JavaScript globals
      console,
      setTimeout,
      setInterval,
      clearTimeout,
      clearInterval,
      
      // React and related
      React: (window as any).React,
      ReactDOM: (window as any).ReactDOM,
      
      // Common utilities
      JSON,
      Date,
      Math,
      
      // Module system
      exports: {},
      module: { exports: {} },
      require: this.createRequireFunction(),
      
      // DOM access (limited)
      document: {
        createElement: document.createElement.bind(document),
        getElementById: document.getElementById.bind(document),
        querySelector: document.querySelector.bind(document),
        querySelectorAll: document.querySelectorAll.bind(document)
      }
    };

    return context;
  }

  private createRequireFunction() {
    return (moduleId: string) => {
      // Handle common module requests
      const moduleMap: { [key: string]: any } = {
        'react': (window as any).React,
        'react-dom': (window as any).ReactDOM,
        'react-dom/client': (window as any).ReactDOM
      };

      if (moduleMap[moduleId]) {
        return moduleMap[moduleId];
      }

      // Check if it's a wrapped module
      const wrappedModule = this.modules.get(moduleId);
      if (wrappedModule && wrappedModule.isExecuted) {
        return wrappedModule.exports;
      }

      console.warn(`Module '${moduleId}' not found`);
      return {};
    };
  }

  private async loadDependencies(dependencies: string[], context: any): Promise<void> {
    for (const dep of dependencies) {
      if (!this.moduleCache.has(dep)) {
        // Load dependency (this could be enhanced to actually load external modules)
        console.log(`Loading dependency: ${dep}`);
        this.moduleCache.set(dep, true);
      }
    }
  }

  private createModuleFunction(code: string, context: any, exports: string[]): Function {
    // Wrap code in a function with the isolated context
    const contextKeys = Object.keys(context);
    const contextValues = contextKeys.map(key => context[key]);
    
    // Create the module function with proper variable scoping
    const wrappedCode = `
      (function(${contextKeys.join(', ')}) {
        "use strict";
        ${code}
        
        // Return exports object
        return {
          ${exports.map(exp => `${exp}: typeof ${exp} !== 'undefined' ? ${exp} : undefined`).join(',\n          ')}
        };
      })
    `;

    return new Function('return ' + wrappedCode)()(...contextValues);
  }

  private async executeWithTimeout(fn: Function, timeout: number): Promise<any> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Module execution timed out after ${timeout}ms`));
      }, timeout);

      try {
        const result = fn();
        clearTimeout(timer);
        resolve(result);
      } catch (error) {
        clearTimeout(timer);
        reject(error);
      }
    });
  }

  private extractExports(context: any, exports: string[], result: any): any {
    const moduleExports: any = {};

    // First, try to get exports from the result
    if (result && typeof result === 'object') {
      Object.assign(moduleExports, result);
    }

    // Then, try to get exports from context
    for (const exportName of exports) {
      if (context[exportName] !== undefined) {
        moduleExports[exportName] = context[exportName];
      }
    }

    // Finally, check module.exports
    if (context.module && context.module.exports) {
      Object.assign(moduleExports, context.module.exports);
    }

    return moduleExports;
  }

  private cleanupContext(context: any): void {
    // Clear any intervals/timeouts that might have been set
    if (context._timers) {
      context._timers.forEach((timer: any) => {
        if (timer.type === 'timeout') {
          clearTimeout(timer.id);
        } else if (timer.type === 'interval') {
          clearInterval(timer.id);
        }
      });
    }
  }

  getModule(moduleId: string): WrappedModule | undefined {
    return this.modules.get(moduleId);
  }

  getAllModules(): WrappedModule[] {
    return Array.from(this.modules.values());
  }

  disposeModule(moduleId: string): boolean {
    const module = this.modules.get(moduleId);
    if (module) {
      module.dispose();
      return true;
    }
    return false;
  }

  disposeAllModules(): void {
    for (const module of this.modules.values()) {
      module.dispose();
    }
    this.modules.clear();
    this.moduleCache.clear();
  }
}

export const moduleWrapper = ModuleWrapper.getInstance();
