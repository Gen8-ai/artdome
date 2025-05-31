
export interface PipelineStage {
  name: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  result?: any;
  error?: string;
  duration?: number;
}

export interface PipelineConfig {
  enableLinting: boolean;
  enableDependencyAnalysis: boolean;
  enableCaching: boolean;
  enableRealTime: boolean;
}

export class PipelineManager {
  private stages: Map<string, PipelineStage> = new Map();
  private config: PipelineConfig;
  private listeners: Array<(stages: PipelineStage[]) => void> = [];

  constructor(config: PipelineConfig = {
    enableLinting: true,
    enableDependencyAnalysis: true,
    enableCaching: true,
    enableRealTime: false
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
      'linter',
      'supabase',
      'preview'
    ];

    stageNames.forEach(name => {
      this.stages.set(name, {
        name,
        status: 'pending'
      });
    });
  }

  async executeStage(stageName: string, executor: () => Promise<any>): Promise<any> {
    const stage = this.stages.get(stageName);
    if (!stage) throw new Error(`Stage ${stageName} not found`);

    stage.status = 'running';
    const startTime = Date.now();
    this.notifyListeners();

    try {
      const result = await executor();
      stage.status = 'completed';
      stage.result = result;
      stage.duration = Date.now() - startTime;
      this.notifyListeners();
      return result;
    } catch (error) {
      stage.status = 'error';
      stage.error = error instanceof Error ? error.message : String(error);
      stage.duration = Date.now() - startTime;
      this.notifyListeners();
      throw error;
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
    this.notifyListeners();
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
}

export const pipelineManager = new PipelineManager();
