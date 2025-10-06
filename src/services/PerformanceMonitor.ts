interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map();
  private isEnabled: boolean = __DEV__; // Only enable in development by default

  /**
   * Start timing a performance metric
   */
  start(name: string, metadata?: Record<string, any>): void {
    if (!this.isEnabled) return;

    this.metrics.set(name, {
      name,
      startTime: performance.now(),
      metadata,
    });
  }

  /**
   * End timing a performance metric and log the result
   */
  end(name: string): number | null {
    if (!this.isEnabled) return null;

    const metric = this.metrics.get(name);
    if (!metric) {
      console.warn(`Performance metric "${name}" was not started`);
      return null;
    }

    const endTime = performance.now();
    const duration = endTime - metric.startTime;

    metric.endTime = endTime;
    metric.duration = duration;

    // Log performance metrics
    this.logMetric(metric);

    // Clean up
    this.metrics.delete(name);

    return duration;
  }

  /**
   * Measure the execution time of a function
   */
  async measure<T>(name: string, fn: () => Promise<T>, metadata?: Record<string, any>): Promise<T> {
    this.start(name, metadata);
    try {
      const result = await fn();
      return result;
    } finally {
      this.end(name);
    }
  }

  /**
   * Measure synchronous function execution
   */
  measureSync<T>(name: string, fn: () => T, metadata?: Record<string, any>): T {
    this.start(name, metadata);
    try {
      const result = fn();
      return result;
    } finally {
      this.end(name);
    }
  }

  /**
   * Log memory usage
   */
  logMemoryUsage(context?: string): void {
    if (!this.isEnabled) return;

    // Note: React Native doesn't have performance.memory
    // This is a placeholder for future native memory monitoring
    console.log(`[Performance] Memory check${context ? ` - ${context}` : ''}`);
  }

  /**
   * Monitor component render performance
   */
  monitorRender(componentName: string): { start: () => void; end: () => void } {
    return {
      start: () => this.start(`render_${componentName}`),
      end: () => this.end(`render_${componentName}`),
    };
  }

  /**
   * Monitor API call performance
   */
  monitorApiCall(endpoint: string, method: string = 'GET'): { start: () => void; end: () => void } {
    const name = `api_${method}_${endpoint}`;
    return {
      start: () => this.start(name, { endpoint, method }),
      end: () => this.end(name),
    };
  }

  /**
   * Monitor database query performance
   */
  monitorDbQuery(queryName: string, params?: any): { start: () => void; end: () => void } {
    const name = `db_${queryName}`;
    return {
      start: () => this.start(name, { queryName, params }),
      end: () => this.end(name),
    };
  }

  /**
   * Get performance summary
   */
  getSummary(): { activeMetrics: number; completedMetrics: string[] } {
    return {
      activeMetrics: this.metrics.size,
      completedMetrics: [], // Would store completed metrics in a real implementation
    };
  }

  /**
   * Enable or disable performance monitoring
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (!enabled) {
      this.metrics.clear();
    }
  }

  /**
   * Clear all active metrics
   */
  clear(): void {
    this.metrics.clear();
  }

  private logMetric(metric: PerformanceMetric): void {
    const duration = metric.duration!;
    const color = duration > 1000 ? '🔴' : duration > 500 ? '🟡' : '🟢';
    
    console.log(
      `[Performance] ${color} ${metric.name}: ${duration.toFixed(2)}ms`,
      metric.metadata ? metric.metadata : ''
    );

    // Alert for slow operations
    if (duration > 2000) {
      console.warn(`⚠️ Slow operation detected: ${metric.name} took ${duration.toFixed(2)}ms`);
    }
  }
}

export const performanceMonitor = new PerformanceMonitor();

// Convenience functions for common use cases
export const measureAsync = <T>(name: string, fn: () => Promise<T>) => 
  performanceMonitor.measure(name, fn);

export const measureSync = <T>(name: string, fn: () => T) => 
  performanceMonitor.measureSync(name, fn);

export const startTimer = (name: string) => performanceMonitor.start(name);
export const endTimer = (name: string) => performanceMonitor.end(name);

// React hook for component performance monitoring
export const usePerformanceMonitor = (componentName: string) => {
  const monitor = performanceMonitor.monitorRender(componentName);
  
  return {
    startRender: monitor.start,
    endRender: monitor.end,
    measureRender: <T>(fn: () => T) => performanceMonitor.measureSync(`${componentName}_render`, fn),
  };
};
