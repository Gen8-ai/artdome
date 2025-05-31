
import { ContentBlock } from './types';
import { moduleWrapper, ModuleWrapperOptions } from './moduleWrapper';
import { SecureInjection } from './secureInjection';

export interface InjectionOptions {
  containerId?: string;
  isolateGlobals?: boolean;
  enableHMR?: boolean;
  onMount?: (exports: any) => void;
  onUnmount?: () => void;
  onError?: (error: Error) => void;
}

export interface InjectedArtifact {
  id: string;
  block: ContentBlock;
  module: any;
  container: HTMLElement;
  unmount: () => void;
  update: (newCode: string) => Promise<void>;
}

export class ArtifactInjector {
  private static instance: ArtifactInjector;
  private injectedArtifacts = new Map<string, InjectedArtifact>();
  private containerCounter = 0;

  static getInstance(): ArtifactInjector {
    if (!ArtifactInjector.instance) {
      ArtifactInjector.instance = new ArtifactInjector();
    }
    return ArtifactInjector.instance;
  }

  async injectArtifact(
    block: ContentBlock, 
    targetElement: HTMLElement, 
    options: InjectionOptions = {}
  ): Promise<InjectedArtifact> {
    const artifactId = this.generateArtifactId(block);
    
    // Check if artifact is already injected
    if (this.injectedArtifacts.has(artifactId)) {
      const existing = this.injectedArtifacts.get(artifactId)!;
      await existing.update(block.code);
      return existing;
    }

    try {
      // Create container
      const container = this.createContainer(targetElement, options.containerId);
      
      // Prepare module options
      const moduleOptions = this.prepareModuleOptions(block, options);
      
      // Wrap code in module
      const wrappedModule = await moduleWrapper.wrapModule(moduleOptions);
      
      // Execute module
      const exports = await wrappedModule.execute();
      
      // Inject into DOM
      await this.injectIntoDOM(exports, container, block);
      
      // Create artifact object
      const artifact = this.createArtifactObject(
        artifactId, 
        block, 
        wrappedModule, 
        container, 
        options
      );
      
      this.injectedArtifacts.set(artifactId, artifact);
      
      // Call onMount callback
      if (options.onMount) {
        options.onMount(exports);
      }
      
      console.log(`Artifact ${artifactId} injected successfully`);
      return artifact;
      
    } catch (error) {
      console.error(`Failed to inject artifact ${artifactId}:`, error);
      if (options.onError) {
        options.onError(error as Error);
      }
      throw error;
    }
  }

  private generateArtifactId(block: ContentBlock): string {
    const hash = this.hashCode(block.code + (block.type || ''));
    return `artifact_${hash}_${Date.now()}`;
  }

  private hashCode(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  private createContainer(targetElement: HTMLElement, containerId?: string): HTMLElement {
    const container = document.createElement('div');
    container.id = containerId || `artifact-container-${++this.containerCounter}`;
    container.className = 'artifact-container';
    container.style.cssText = `
      width: 100%;
      height: 100%;
      position: relative;
      overflow: auto;
    `;
    
    targetElement.appendChild(container);
    return container;
  }

  private prepareModuleOptions(block: ContentBlock, options: InjectionOptions): ModuleWrapperOptions {
    // Sanitize code
    const sanitizedCode = SecureInjection.sanitizeCode(block.code);
    
    // Detect exports based on block type
    const exports = this.detectExports(sanitizedCode, block.type);
    
    return {
      moduleId: this.generateArtifactId(block),
      code: sanitizedCode,
      dependencies: this.detectDependencies(sanitizedCode),
      exports,
      isolateGlobals: options.isolateGlobals ?? true,
      timeout: 10000
    };
  }

  private detectExports(code: string, type?: string): string[] {
    const exports: string[] = [];
    
    if (type === 'react' || code.includes('React')) {
      // Look for React component exports
      const componentMatches = code.match(/(?:const|function|class)\s+([A-Z]\w*)/g);
      if (componentMatches) {
        componentMatches.forEach(match => {
          const name = match.split(/\s+/)[1];
          if (name) exports.push(name);
        });
      }
      
      // Common React exports
      if (!exports.length) {
        exports.push('App', 'Component', 'default');
      }
    }
    
    // Look for explicit exports
    const exportMatches = code.match(/export\s+(?:const|let|var|function|class)\s+(\w+)/g);
    if (exportMatches) {
      exportMatches.forEach(match => {
        const name = match.split(/\s+/).pop();
        if (name) exports.push(name);
      });
    }
    
    return exports;
  }

  private detectDependencies(code: string): string[] {
    const dependencies: string[] = [];
    
    // Check for React usage
    if (code.includes('React') || code.includes('jsx') || code.includes('useState')) {
      dependencies.push('react', 'react-dom');
    }
    
    // Look for import statements
    const importMatches = code.match(/import\s+.+\s+from\s+['"]([^'"]+)['"]/g);
    if (importMatches) {
      importMatches.forEach(match => {
        const dep = match.match(/from\s+['"]([^'"]+)['"]/)?.[1];
        if (dep && !dep.startsWith('.')) {
          dependencies.push(dep);
        }
      });
    }
    
    return dependencies;
  }

  private async injectIntoDOM(exports: any, container: HTMLElement, block: ContentBlock): Promise<void> {
    // Clear container
    container.innerHTML = '';
    
    if (block.type === 'react' || exports.App || exports.Component || exports.default) {
      await this.injectReactComponent(exports, container);
    } else if (block.type === 'html') {
      this.injectHTML(block.code, container);
    } else if (block.type === 'javascript') {
      await this.injectJavaScript(exports, container);
    } else {
      this.injectGeneric(exports, container);
    }
  }

  private async injectReactComponent(exports: any, container: HTMLElement): Promise<void> {
    // Find the React component to render
    let Component = exports.App || exports.Component || exports.default;
    
    // If no direct component, try to find any function that starts with uppercase
    if (!Component) {
      for (const [key, value] of Object.entries(exports)) {
        if (typeof value === 'function' && /^[A-Z]/.test(key)) {
          Component = value;
          break;
        }
      }
    }
    
    if (Component && typeof Component === 'function') {
      const React = (window as any).React;
      const ReactDOM = (window as any).ReactDOM;
      
      if (React && ReactDOM) {
        // Create React element and render
        const element = React.createElement(Component);
        ReactDOM.render(element, container);
      } else {
        throw new Error('React libraries not available');
      }
    } else {
      throw new Error('No valid React component found in exports');
    }
  }

  private injectHTML(html: string, container: HTMLElement): void {
    container.innerHTML = html;
  }

  private async injectJavaScript(exports: any, container: HTMLElement): Promise<void> {
    // If there's a main function, call it
    if (exports.main && typeof exports.main === 'function') {
      await exports.main(container);
    } else {
      // Create a simple display of the exports
      const pre = document.createElement('pre');
      pre.textContent = JSON.stringify(exports, null, 2);
      container.appendChild(pre);
    }
  }

  private injectGeneric(exports: any, container: HTMLElement): void {
    // Generic injection for other types
    const pre = document.createElement('pre');
    pre.textContent = JSON.stringify(exports, null, 2);
    container.appendChild(pre);
  }

  private createArtifactObject(
    id: string,
    block: ContentBlock,
    module: any,
    container: HTMLElement,
    options: InjectionOptions
  ): InjectedArtifact {
    const unmount = () => {
      // Call onUnmount callback
      if (options.onUnmount) {
        options.onUnmount();
      }
      
      // Cleanup React components
      if ((window as any).ReactDOM && container.firstChild) {
        try {
          (window as any).ReactDOM.unmountComponentAtNode(container);
        } catch (e) {
          // Ignore unmount errors
        }
      }
      
      // Remove container
      if (container.parentNode) {
        container.parentNode.removeChild(container);
      }
      
      // Dispose module
      module.dispose();
      
      // Remove from registry
      this.injectedArtifacts.delete(id);
      
      console.log(`Artifact ${id} unmounted`);
    };

    const update = async (newCode: string): Promise<void> => {
      // Create new block with updated code
      const updatedBlock = { ...block, code: newCode };
      
      // Prepare new module options
      const moduleOptions = this.prepareModuleOptions(updatedBlock, options);
      
      // Dispose old module
      module.dispose();
      
      // Create new module
      const newModule = await moduleWrapper.wrapModule(moduleOptions);
      const exports = await newModule.execute();
      
      // Re-inject into existing container
      await this.injectIntoDOM(exports, container, updatedBlock);
      
      // Update artifact object
      const artifact = this.injectedArtifacts.get(id);
      if (artifact) {
        artifact.module = newModule;
        artifact.block = updatedBlock;
      }
      
      console.log(`Artifact ${id} updated`);
    };

    return {
      id,
      block,
      module,
      container,
      unmount,
      update
    };
  }

  getArtifact(id: string): InjectedArtifact | undefined {
    return this.injectedArtifacts.get(id);
  }

  getAllArtifacts(): InjectedArtifact[] {
    return Array.from(this.injectedArtifacts.values());
  }

  unmountArtifact(id: string): boolean {
    const artifact = this.injectedArtifacts.get(id);
    if (artifact) {
      artifact.unmount();
      return true;
    }
    return false;
  }

  unmountAllArtifacts(): void {
    for (const artifact of this.injectedArtifacts.values()) {
      artifact.unmount();
    }
    this.injectedArtifacts.clear();
  }
}

export const artifactInjector = ArtifactInjector.getInstance();
