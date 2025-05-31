
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
    enablePackageResolution: true
  }) {
    this.config = config;
    this.initializeStages();
  }

  private initializeStages() {
    const stageNames = [
      'userInputRequest',
      'aiGen',
      'parse',
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

  async executeStage(stageName: string, executor: () => Promise<any>): Promise<any> {
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

      const result = await executor();
      
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
      throw error;
    }
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
