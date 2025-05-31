
export interface PipelineStage {
  name: string;
  execute: () => Promise<any>;
  dependencies?: string[];
  timeout?: number;
}

export class PipelineSync {
  private stages = new Map<string, PipelineStage>();
  private results = new Map<string, any>();
  private errors = new Map<string, Error>();
  private isRunning = false;

  addStage(stage: PipelineStage): void {
    this.stages.set(stage.name, stage);
  }

  async executeStages(stageNames: string[]): Promise<Map<string, any>> {
    if (this.isRunning) {
      throw new Error('Pipeline is already running');
    }

    this.isRunning = true;
    this.results.clear();
    this.errors.clear();

    try {
      const sortedStages = this.resolveDependencies(stageNames);
      
      for (const stageName of sortedStages) {
        await this.executeStage(stageName);
      }
      
      return new Map(this.results);
    } finally {
      this.isRunning = false;
    }
  }

  private async executeStage(stageName: string): Promise<void> {
    const stage = this.stages.get(stageName);
    if (!stage) {
      throw new Error(`Stage ${stageName} not found`);
    }

    console.log(`Executing pipeline stage: ${stageName}`);
    const startTime = Date.now();

    try {
      const timeoutMs = stage.timeout || 30000; // 30 second default timeout
      const result = await Promise.race([
        stage.execute(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error(`Stage ${stageName} timed out after ${timeoutMs}ms`)), timeoutMs)
        )
      ]);

      this.results.set(stageName, result);
      console.log(`Stage ${stageName} completed in ${Date.now() - startTime}ms`);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.errors.set(stageName, err);
      console.error(`Stage ${stageName} failed:`, err);
      throw err;
    }
  }

  private resolveDependencies(stageNames: string[]): string[] {
    const resolved: string[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (stageName: string) => {
      if (visiting.has(stageName)) {
        throw new Error(`Circular dependency detected: ${stageName}`);
      }
      if (visited.has(stageName)) {
        return;
      }

      visiting.add(stageName);
      const stage = this.stages.get(stageName);
      
      if (stage?.dependencies) {
        for (const dep of stage.dependencies) {
          visit(dep);
        }
      }

      visiting.delete(stageName);
      visited.add(stageName);
      resolved.push(stageName);
    };

    for (const stageName of stageNames) {
      visit(stageName);
    }

    return resolved;
  }

  getStageResult(stageName: string): any {
    return this.results.get(stageName);
  }

  getStageError(stageName: string): Error | undefined {
    return this.errors.get(stageName);
  }

  hasErrors(): boolean {
    return this.errors.size > 0;
  }

  getErrors(): Map<string, Error> {
    return new Map(this.errors);
  }
}
