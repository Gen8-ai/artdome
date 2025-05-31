import { supabase } from '@/integrations/supabase/client';

export interface RealtimeUpdate {
  type: 'code_change' | 'compilation_result' | 'error' | 'performance_metric';
  payload: any;
  timestamp: number;
  userId?: string;
}

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
}

export class RealtimePreview {
  private static instance: RealtimePreview;
  private channels = new Map<string, any>();
  private performanceObserver?: PerformanceObserver;
  private metrics: PerformanceMetric[] = [];

  static getInstance(): RealtimePreview {
    if (!RealtimePreview.instance) {
      RealtimePreview.instance = new RealtimePreview();
    }
    return RealtimePreview.instance;
  }

  constructor() {
    this.initializePerformanceMonitoring();
  }

  // Real-time WebSocket connections for live updates
  createRealtimeChannel(sessionId: string, onUpdate: (update: RealtimeUpdate) => void): () => void {
    const channelName = `preview_${sessionId}`;
    
    const channel = supabase
      .channel(channelName)
      .on('broadcast', { event: 'code_update' }, (payload) => {
        onUpdate({
          type: 'code_change',
          payload: payload.payload,
          timestamp: Date.now(),
          userId: payload.userId
        });
      })
      .on('broadcast', { event: 'compilation_result' }, (payload) => {
        onUpdate({
          type: 'compilation_result',
          payload: payload.payload,
          timestamp: Date.now(),
          userId: payload.userId
        });
      })
      .on('broadcast', { event: 'error' }, (payload) => {
        onUpdate({
          type: 'error',
          payload: payload.payload,
          timestamp: Date.now(),
          userId: payload.userId
        });
      })
      .subscribe();

    this.channels.set(sessionId, channel);

    return () => {
      if (this.channels.has(sessionId)) {
        supabase.removeChannel(this.channels.get(sessionId));
        this.channels.delete(sessionId);
      }
    };
  }

  // Broadcast updates to all connected clients
  async broadcastUpdate(sessionId: string, update: RealtimeUpdate): Promise<void> {
    const channel = this.channels.get(sessionId);
    if (channel) {
      await channel.send({
        type: 'broadcast',
        event: update.type,
        payload: {
          payload: update.payload,
          timestamp: update.timestamp,
          userId: update.userId
        }
      });
    }
  }

  // Hot Module Replacement (HMR) simulation
  async triggerHMR(sessionId: string, moduleId: string, newCode: string): Promise<void> {
    const update: RealtimeUpdate = {
      type: 'code_change',
      payload: {
        moduleId,
        code: newCode,
        hmr: true
      },
      timestamp: Date.now()
    };

    await this.broadcastUpdate(sessionId, update);
  }

  // Performance monitoring and optimization
  private initializePerformanceMonitoring(): void {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      this.performanceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          this.recordMetric({
            name: entry.name,
            value: entry.duration || entry.startTime,
            unit: 'ms',
            timestamp: Date.now()
          });
        });
      });

      this.performanceObserver.observe({ entryTypes: ['measure', 'navigation', 'resource'] });
    }
  }

  recordMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);
    
    // Keep only last 100 metrics to prevent memory leaks
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100);
    }

    console.log('Performance metric recorded:', metric);
  }

  getPerformanceMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  // Collaborative editing capabilities
  async enableCollaboration(sessionId: string, userId: string): Promise<void> {
    const channel = this.channels.get(sessionId);
    if (channel) {
      await channel.send({
        type: 'broadcast',
        event: 'user_joined',
        payload: { userId, timestamp: Date.now() }
      });
    }
  }

  async sendCursorPosition(sessionId: string, userId: string, position: { line: number; column: number }): Promise<void> {
    const update: RealtimeUpdate = {
      type: 'code_change',
      payload: {
        type: 'cursor_position',
        position,
        userId
      },
      timestamp: Date.now(),
      userId
    };

    await this.broadcastUpdate(sessionId, update);
  }

  cleanup(): void {
    // Clean up all channels
    this.channels.forEach((channel) => {
      supabase.removeChannel(channel);
    });
    this.channels.clear();

    // Stop performance monitoring
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }
  }
}

export const realtimePreview = RealtimePreview.getInstance();
