import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface LogEntry {
  timestamp: string;
  level: 'error' | 'warn' | 'info' | 'debug';
  message: string;
  data?: any;
  userId?: string | null;
  url?: string;
  userAgent?: string;
}

@Injectable({
  providedIn: 'root'
})
export class LoggerService {
  private readonly http = inject(HttpClient);
  private readonly logs: LogEntry[] = [];
  private readonly maxLogs = 1000; // Keep last 1000 logs in memory

  constructor() {
    // Send any stored logs when service initializes
    this.sendStoredLogs();
  }

  error(message: string, data?: any): void {
    this.log('error', message, data);
  }

  warn(message: string, data?: any): void {
    this.log('warn', message, data);
  }

  info(message: string, data?: any): void {
    this.log('info', message, data);
  }

  debug(message: string, data?: any): void {
    this.log('debug', message, data);
  }

  private log(level: LogEntry['level'], message: string, data?: any): void {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
      userId: this.getCurrentUserId(),
      url: window.location.href,
      userAgent: navigator.userAgent,
    };

    // Add to in-memory logs
    this.logs.push(logEntry);
    
    // Trim logs if too many
    if (this.logs.length > this.maxLogs) {
      this.logs.splice(0, this.logs.length - this.maxLogs);
    }

    // Log to console for development
    if (this.isDevelopment()) {
      this.consoleLog(logEntry);
    }

    // Send to backend for persistent logging
    this.sendLogToBackend(logEntry);
  }

  private consoleLog(entry: LogEntry): void {
    const logMethod = entry.level === 'error' ? 'error' : 
                     entry.level === 'warn' ? 'warn' :
                     entry.level === 'info' ? 'info' : 'debug';

    const message = `[${entry.timestamp}] ${entry.level.toUpperCase()}: ${entry.message}`;
    
    if (entry.data) {
      console[logMethod](message, entry.data);
    } else {
      console[logMethod](message);
    }
  }

  private sendLogToBackend(entry: LogEntry): void {
    // Only send errors and warnings to backend to reduce noise
    if (entry.level === 'error' || entry.level === 'warn') {
      this.http.post('/api/logs', entry).subscribe({
        error: (error) => {
          // If logging fails, store locally for retry
          this.storeLogLocally(entry);
        }
      });
    }
  }

  private storeLogLocally(entry: LogEntry): void {
    try {
      const storedLogs = this.getStoredLogs();
      storedLogs.push(entry);
      
      // Keep only last 100 logs locally
      if (storedLogs.length > 100) {
        storedLogs.splice(0, storedLogs.length - 100);
      }
      
      localStorage.setItem('nexum_logs', JSON.stringify(storedLogs));
    } catch (error) {
      // If localStorage fails, just ignore
      console.warn('Failed to store log locally:', error);
    }
  }

  private getStoredLogs(): LogEntry[] {
    try {
      const stored = localStorage.getItem('nexum_logs');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private sendStoredLogs(): void {
    const storedLogs = this.getStoredLogs();
    if (storedLogs.length > 0) {
      // Send stored logs to backend
      storedLogs.forEach(entry => this.sendLogToBackend(entry));
      
      // Clear stored logs
      try {
        localStorage.removeItem('nexum_logs');
      } catch {
        // Ignore errors
      }
    }
  }

  private getCurrentUserId(): string | null {
    try {
      const user = localStorage.getItem('currentUser');
      if (user) {
        const parsedUser = JSON.parse(user);
        return parsedUser.id || null;
      }
    } catch {
      // Ignore errors
    }
    return null;
  }

  private isDevelopment(): boolean {
    return !window.location.hostname.includes('production') && 
           !window.location.hostname.includes('app.');
  }

  // Method to get recent logs for debugging
  getRecentLogs(count: number = 50): LogEntry[] {
    return this.logs.slice(-count);
  }

  // Method to clear logs (useful for privacy)
  clearLogs(): void {
    this.logs.length = 0;
    try {
      localStorage.removeItem('nexum_logs');
    } catch {
      // Ignore errors
    }
  }
}
