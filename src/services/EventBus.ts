type Listener = (...args: any[]) => void;

class SimpleEventBus {
  private events = new Map<string, Set<Listener>>();

  on(event: string, listener: Listener) {
    if (!this.events.has(event)) this.events.set(event, new Set());
    this.events.get(event)!.add(listener);
    return () => this.off(event, listener);
  }

  off(event: string, listener: Listener) {
    this.events.get(event)?.delete(listener);
  }

  emit(event: string, ...args: any[]) {
    const listeners = this.events.get(event);
    if (!listeners) return;
    for (const fn of Array.from(listeners)) {
      try { fn(...args); } catch {}
    }
  }
}

export const EventBus = new SimpleEventBus();

export const EVENTS = {
  TRANSACTIONS_UPDATED: 'transactions:updated',
} as const;
