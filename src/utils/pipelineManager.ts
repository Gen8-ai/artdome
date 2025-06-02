import { aiBugFixer } from '@/utils/contentRenderer/aiBugFixer';

export interface PipelineStage {
  name: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  result?: any;
  error?: string;
  duration?: number;
  progress?: number;
}

export interface PipelineConfig {
  enableLinting: boolean;
  enableDependencyAnalysis: boolean;
  enableCaching: boolean;
  enableRealTime: boolean;
  enableAIGeneration: boolean;
  enablePackageResolution: boolean;
  enableAIBugFixing: boolean; // New option for AI bug fixing
}

export class PipelineManager {
  private stages: Map<string, PipelineStage> = new Map();
  private config: PipelineConfig;
  private listeners: Array<(stages: PipelineStage[]) => void> = [];
  private cache = new Map<string, any>();

  constructor(config: PipelineConfig = {
    enableLinting: true,
    enableDependencyAnalysis: true,
    enableCaching: true,
    enableRealTime: false,
    enableAIGeneration: true,
    enablePackageResolution: true,
    enableAIBugFixing: true // Enable AI bug fixing by default
  }) {
    this.config = config;
    this.initializeStages();
  }

  private initializeStages() {
    const stageNames = [
      'userInputRequest',
      'aiGen',
      'parse',
      'aiBugFixing', // New AI bug fixing stage
      'dependencyAnalysis',
      'installDependencies',
      'linter',
      'supabase',
      'preview'
    ];

    stageNames.forEach(name => {
      this.stages.set(name, {
        name,
        status: 'pending',
        progress: 0
      });
    });
  }

  async executeStage(stageName: string, executor: () => Promise<any>, context?: any): Promise<any> {
    const stage = this.stages.get(stageName);
    if (!stage) throw new Error(`Stage ${stageName} not found`);

    // Check cache first
    if (this.config.enableCaching) {
      const cached = this.cache.get(stageName);
      if (cached) {
        console.log(`Using cached result for stage: ${stageName}`);
        stage.status = 'completed';
        stage.result = cached;
        this.notifyListeners();
        return cached;
      }
    }

    stage.status = 'running';
    stage.progress = 0;
    const startTime = Date.now();
    this.notifyListeners();

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        if (stage.status === 'running' && stage.progress! < 90) {
          stage.progress = Math.min(90, stage.progress! + Math.random() * 20);
          this.notifyListeners();
        }
      }, 200);

      let result = await executor();
      
      // Apply AI bug fixing if enabled and this is a code-related stage
      if (this.config.enableAIBugFixing && this.shouldApplyAIFixing(stageName, context)) {
        result = await this.applyAIBugFixing(result, context);
      }
      
      clearInterval(progressInterval);
      stage.status = 'completed';
      stage.result = result;
      stage.duration = Date.now() - startTime;
      stage.progress = 100;

      // Cache the result
      if (this.config.enableCaching) {
        this.cache.set(stageName, result);
      }

      this.notifyListeners();
      return result;
    } catch (error) {
      stage.status = 'error';
      stage.error = error instanceof Error ? error.message : String(error);
      stage.duration = Date.now() - startTime;
      stage.progress = 0;
      this.notifyListeners();
      
      // Attempt AI auto-recovery for certain stages
      if (this.config.enableAIBugFixing && this.canAttemptAutoRecovery(stageName)) {
        try {
          console.log(`Attempting AI auto-recovery for stage: ${stageName}`);
          const recoveredResult = await this.attemptAutoRecovery(error, context);
          if (recoveredResult) {
            stage.status = 'completed';
            stage.result = recoveredResult;
            stage.error = undefined;
            this.notifyListeners();
            return recoveredResult;
          }
        } catch (recoveryError) {
          console.error(`AI auto-recovery failed for stage ${stageName}:`, recoveryError);
        }
      }
      
      throw error;
    }
  }

  private shouldApplyAIFixing(stageName: string, context?: any): boolean {
    const codeStages = ['parse', 'linter', 'preview'];
    return codeStages.includes(stageName) && context?.block?.code;
  }

  private async applyAIBugFixing(result: any, context?: any): Promise<any> {
    if (!context?.block?.code) return result;
    
    try {
      console.log('Applying AI bug fixing to stage result...');
      const language = this.detectLanguage(context.block.type, context.block.code);
      const fixResult = await aiBugFixer.analyzeCode(context.block.code, language);
      
      if (fixResult.severity === 'high' || fixResult.severity === 'critical') {
        console.log('High/critical issues detected, applying AI fixes...');
        const bugFixResult = await aiBugFixer.fixBugs(context.block.code, language);
        
        if (bugFixResult.success && bugFixResult.confidence > 0.7) {
          // Update the result with fixed code
          if (typeof result === 'string') {
            return result.replace(context.block.code, bugFixResult.fixedCode);
          } else if (result && typeof result === 'object') {
            return { ...result, fixedCode: bugFixResult.fixedCode };
          }
        }
      }
      
      return result;
    } catch (error) {
      console.warn('AI bug fixing failed during stage processing:', error);
      return result;
    }
  }

  private canAttemptAutoRecovery(stageName: string): boolean {
    const recoveryStages = ['parse', 'linter', 'preview'];
    return recoveryStages.includes(stageName);
  }

  private async attemptAutoRecovery(error: any, context?: any): Promise<any> {
    if (!context?.block?.code) return null;
    
    try {
      const language = this.detectLanguage(context.block.type, context.block.code);
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      const recoveryResult = await aiBugFixer.fixBugs(
        context.block.code,
        language,
        errorMessage
      );
      
      if (recoveryResult.success && recoveryResult.confidence > 0.6) {
        console.log('AI auto-recovery successful');
        return { recoveredCode: recoveryResult.fixedCode, originalError: errorMessage };
      }
      
      return null;
    } catch (recoveryError) {
      console.error('Auto-recovery attempt failed:', recoveryError);
      return null;
    }
  }

  private detectLanguage(type?: string, code?: string): string {
    if (type === 'react' || code?.includes('React') || code?.includes('jsx')) {
      return 'javascript';
    }
    if (type === 'javascript') return 'javascript';
    if (type === 'html') return 'html';
    if (type === 'css') return 'css';
    if (code?.includes('def ') || code?.includes('import ')) return 'python';
    return 'javascript';
  }

  updateStageProgress(stageName: string, progress: number) {
    const stage = this.stages.get(stageName);
    if (stage && stage.status === 'running') {
      stage.progress = Math.max(0, Math.min(100, progress));
      this.notifyListeners();
    }
  }

  getStages(): PipelineStage[] {
    return Array.from(this.stages.values());
  }

  getStage(name: string): PipelineStage | undefined {
    return this.stages.get(name);
  }

  reset() {
    this.initializeStages();
    this.cache.clear();
    this.notifyListeners();
  }

  clearCache() {
    this.cache.clear();
    console.log('Pipeline cache cleared');
  }

  onStageUpdate(listener: (stages: PipelineStage[]) => void) {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) this.listeners.splice(index, 1);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.getStages()));
  }

  getConfig(): PipelineConfig {
    return { ...this.config };
  }

  updateConfig(newConfig: Partial<PipelineConfig>) {
    this.config = { ...this.config, ...newConfig };
    console.log('Pipeline config updated:', this.config);
  }
}

export const pipelineManager = new PipelineManager();
