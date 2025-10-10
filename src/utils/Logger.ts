// Enhanced logging utility for debugging
export class Logger {
  private static isDev = __DEV__;
  
  static info(tag: string, message: string, data?: any) {
    if (this.isDev) {
      console.log(`ℹ️ [${tag}] ${message}`, data ? data : '');
    }
  }
  
  static error(tag: string, message: string, error?: any) {
    console.error(`❌ [${tag}] ${message}`, error ? error : '');
    
    // Log error details
    if (error) {
      if (error.message) console.error('Error message:', error.message);
      if (error.code) console.error('Error code:', error.code);
      if (error.details) console.error('Error details:', error.details);
      if (error.hint) console.error('Error hint:', error.hint);
      if (error.stack) console.error('Stack trace:', error.stack);
    }
  }
  
  static warn(tag: string, message: string, data?: any) {
    if (this.isDev) {
      console.warn(`⚠️ [${tag}] ${message}`, data ? data : '');
    }
  }
  
  static success(tag: string, message: string, data?: any) {
    if (this.isDev) {
      console.log(`✅ [${tag}] ${message}`, data ? data : '');
    }
  }
  
  static network(tag: string, url: string, method: string, status?: number, error?: any) {
    const statusEmoji = status && status < 400 ? '✅' : '❌';
    console.log(`🌐 [${tag}] ${method} ${url} ${status ? `(${status})` : ''} ${statusEmoji}`);
    
    if (error) {
      this.error(tag, 'Network request failed', error);
    }
  }
  
  static database(tag: string, operation: string, table: string, success: boolean, error?: any) {
    const emoji = success ? '✅' : '❌';
    console.log(`🗄️ [${tag}] ${operation} on ${table} ${emoji}`);
    
    if (error) {
      this.error(tag, `Database ${operation} failed`, error);
    }
  }
}

// Global error handler
const originalConsoleError = console.error;
console.error = (...args) => {
  // Call original console.error
  originalConsoleError.apply(console, args);
  
  // Add timestamp and formatting
  const timestamp = new Date().toLocaleTimeString();
  console.log(`🕐 [${timestamp}] Error logged above`);
};
