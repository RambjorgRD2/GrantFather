/**
 * Analytics Service
 * Tracks user behavior and application metrics
 */

import { GrantApplication, GrantSectionKey } from '@/types/grantApplication';

export interface AnalyticsEvent {
  id: string;
  type: string;
  category: string;
  action: string;
  label?: string;
  value?: number;
  properties?: Record<string, any>;
  userId?: string;
  applicationId?: string;
  organizationId?: string;
  timestamp: string;
}

export interface UserBehaviorMetrics {
  totalSessions: number;
  averageSessionDuration: number;
  pagesViewed: number;
  actionsPerformed: number;
  aiGenerationsUsed: number;
  applicationsCreated: number;
  applicationsCompleted: number;
}

export interface ApplicationMetrics {
  totalApplications: number;
  averageCompletionTime: number;
  averageSectionsCompleted: number;
  mostUsedSections: GrantSectionKey[];
  averageAIGenerationsPerApplication: number;
  completionRate: number;
}

export interface AIPerformanceMetrics {
  totalGenerations: number;
  averageGenerationTime: number;
  successRate: number;
  mostUsedProviders: string[];
  mostUsedModels: string[];
  averageTokensUsed: number;
}

export class AnalyticsService {
  private static instance: AnalyticsService;
  private events: AnalyticsEvent[] = [];
  private sessionStartTime: number = Date.now();
  private currentSessionId: string = crypto.randomUUID();
  private isEnabled: boolean = true;

  public static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  /**
   * Track an analytics event
   */
  public track(
    type: string,
    category: string,
    action: string,
    properties?: Record<string, any>,
    label?: string,
    value?: number
  ): void {
    if (!this.isEnabled) return;

    const event: AnalyticsEvent = {
      id: crypto.randomUUID(),
      type,
      category,
      action,
      label,
      value,
      properties,
      userId: this.getCurrentUserId(),
      timestamp: new Date().toISOString(),
    };

    this.events.push(event);

    // Send to external analytics service in production
    if (process.env.NODE_ENV === 'production') {
      this.sendToExternalService(event);
    }

    // Keep only last 1000 events in memory
    if (this.events.length > 1000) {
      this.events = this.events.slice(-1000);
    }
  }

  /**
   * Track page view
   */
  public trackPageView(page: string, properties?: Record<string, any>): void {
    this.track('page_view', 'navigation', 'view', {
      page,
      sessionId: this.currentSessionId,
      ...properties,
    });
  }

  /**
   * Track user action
   */
  public trackUserAction(
    action: string,
    element: string,
    properties?: Record<string, any>
  ): void {
    this.track('user_action', 'interaction', action, {
      element,
      sessionId: this.currentSessionId,
      ...properties,
    });
  }

  /**
   * Track AI generation
   */
  public trackAIGeneration(
    section: string,
    provider: string,
    model: string,
    success: boolean,
    duration: number,
    properties?: Record<string, any>
  ): void {
    this.track('ai_generation', 'ai', success ? 'success' : 'failure', {
      section,
      provider,
      model,
      duration,
      sessionId: this.currentSessionId,
      ...properties,
    });
  }

  /**
   * Track application creation
   */
  public trackApplicationCreated(
    applicationId: string,
    organizationId: string,
    properties?: Record<string, any>
  ): void {
    this.track('application_created', 'application', 'create', {
      applicationId,
      organizationId,
      sessionId: this.currentSessionId,
      ...properties,
    });
  }

  /**
   * Track application completion
   */
  public trackApplicationCompleted(
    applicationId: string,
    organizationId: string,
    sectionsCompleted: number,
    totalSections: number,
    properties?: Record<string, any>
  ): void {
    this.track('application_completed', 'application', 'complete', {
      applicationId,
      organizationId,
      sectionsCompleted,
      totalSections,
      completionRate: (sectionsCompleted / totalSections) * 100,
      sessionId: this.currentSessionId,
      ...properties,
    });
  }

  /**
   * Track section edit
   */
  public trackSectionEdit(
    applicationId: string,
    section: string,
    editType: 'manual' | 'ai_generated' | 'ai_improved',
    properties?: Record<string, any>
  ): void {
    this.track('section_edit', 'content', editType, {
      applicationId,
      section,
      sessionId: this.currentSessionId,
      ...properties,
    });
  }

  /**
   * Track collaboration event
   */
  public trackCollaboration(
    action: string,
    applicationId: string,
    properties?: Record<string, any>
  ): void {
    this.track('collaboration', 'collaboration', action, {
      applicationId,
      sessionId: this.currentSessionId,
      ...properties,
    });
  }

  /**
   * Track error
   */
  public trackError(
    error: Error,
    context: string,
    properties?: Record<string, any>
  ): void {
    this.track('error', 'error', 'occurred', {
      errorMessage: error.message,
      errorStack: error.stack,
      context,
      sessionId: this.currentSessionId,
      ...properties,
    });
  }

  /**
   * Get user behavior metrics
   */
  public getUserBehaviorMetrics(userId?: string): UserBehaviorMetrics {
    const userEvents = userId 
      ? this.events.filter(e => e.userId === userId)
      : this.events;

    const sessions = this.getSessions(userEvents);
    const pageViews = userEvents.filter(e => e.type === 'page_view').length;
    const actions = userEvents.filter(e => e.type === 'user_action').length;
    const aiGenerations = userEvents.filter(e => e.type === 'ai_generation').length;
    const applicationsCreated = userEvents.filter(e => e.type === 'application_created').length;
    const applicationsCompleted = userEvents.filter(e => e.type === 'application_completed').length;

    const averageSessionDuration = sessions.length > 0
      ? sessions.reduce((sum, session) => sum + session.duration, 0) / sessions.length
      : 0;

    return {
      totalSessions: sessions.length,
      averageSessionDuration,
      pagesViewed: pageViews,
      actionsPerformed: actions,
      aiGenerationsUsed: aiGenerations,
      applicationsCreated,
      applicationsCompleted,
    };
  }

  /**
   * Get application metrics
   */
  public getApplicationMetrics(organizationId?: string): ApplicationMetrics {
    const appEvents = organizationId
      ? this.events.filter(e => e.properties?.organizationId === organizationId)
      : this.events;

    const applications = this.getApplications(appEvents);
    const totalApplications = applications.length;
    const completedApplications = applications.filter(app => app.completed).length;
    
    const averageCompletionTime = completedApplications > 0
      ? applications
          .filter(app => app.completed)
          .reduce((sum, app) => sum + (app.completedAt! - app.createdAt), 0) / completedApplications
      : 0;

    const averageSectionsCompleted = completedApplications > 0
      ? applications
          .filter(app => app.completed)
          .reduce((sum, app) => sum + (app.sectionsCompleted || 0), 0) / completedApplications
      : 0;

    const sectionUsage = this.getSectionUsage(appEvents);
    const mostUsedSections = Object.entries(sectionUsage)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([section]) => section as GrantSectionKey);

    const averageAIGenerationsPerApplication = totalApplications > 0
      ? appEvents.filter(e => e.type === 'ai_generation').length / totalApplications
      : 0;

    const completionRate = totalApplications > 0
      ? (completedApplications / totalApplications) * 100
      : 0;

    return {
      totalApplications,
      averageCompletionTime,
      averageSectionsCompleted,
      mostUsedSections,
      averageAIGenerationsPerApplication,
      completionRate,
    };
  }

  /**
   * Get AI performance metrics
   */
  public getAIPerformanceMetrics(): AIPerformanceMetrics {
    const aiEvents = this.events.filter(e => e.type === 'ai_generation');
    const totalGenerations = aiEvents.length;
    const successfulGenerations = aiEvents.filter(e => e.action === 'success').length;
    
    const averageGenerationTime = aiEvents.length > 0
      ? aiEvents.reduce((sum, e) => sum + (e.properties?.duration || 0), 0) / aiEvents.length
      : 0;

    const successRate = totalGenerations > 0
      ? (successfulGenerations / totalGenerations) * 100
      : 0;

    const providerUsage = this.getProviderUsage(aiEvents);
    const modelUsage = this.getModelUsage(aiEvents);
    
    const mostUsedProviders = Object.entries(providerUsage)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([provider]) => provider);

    const mostUsedModels = Object.entries(modelUsage)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([model]) => model);

    const averageTokensUsed = aiEvents.length > 0
      ? aiEvents.reduce((sum, e) => sum + (e.properties?.tokensUsed || 0), 0) / aiEvents.length
      : 0;

    return {
      totalGenerations,
      averageGenerationTime,
      successRate,
      mostUsedProviders,
      mostUsedModels,
      averageTokensUsed,
    };
  }

  /**
   * Get current user ID
   */
  private getCurrentUserId(): string | undefined {
    // In a real implementation, this would get the current user ID from auth context
    return undefined;
  }

  /**
   * Send event to external analytics service
   */
  private sendToExternalService(event: AnalyticsEvent): void {
    // In a real implementation, this would send to services like Mixpanel, Amplitude, etc.
    console.log('Analytics event:', event);
  }

  /**
   * Get sessions from events
   */
  private getSessions(events: AnalyticsEvent[]): Array<{ duration: number; startTime: number; endTime: number }> {
    // Simple session detection - in reality, this would be more sophisticated
    const sessions: Array<{ duration: number; startTime: number; endTime: number }> = [];
    let currentSessionStart = 0;
    let lastEventTime = 0;

    events.forEach(event => {
      const eventTime = new Date(event.timestamp).getTime();
      
      if (eventTime - lastEventTime > 30 * 60 * 1000) { // 30 minutes gap = new session
        if (currentSessionStart > 0) {
          sessions.push({
            startTime: currentSessionStart,
            endTime: lastEventTime,
            duration: lastEventTime - currentSessionStart,
          });
        }
        currentSessionStart = eventTime;
      }
      
      lastEventTime = eventTime;
    });

    if (currentSessionStart > 0) {
      sessions.push({
        startTime: currentSessionStart,
        endTime: lastEventTime,
        duration: lastEventTime - currentSessionStart,
      });
    }

    return sessions;
  }

  /**
   * Get applications from events
   */
  private getApplications(events: AnalyticsEvent[]): Array<{
    id: string;
    createdAt: number;
    completedAt?: number;
    completed: boolean;
    sectionsCompleted?: number;
  }> {
    const applications = new Map<string, any>();

    events.forEach(event => {
      if (event.type === 'application_created') {
        applications.set(event.properties?.applicationId, {
          id: event.properties?.applicationId,
          createdAt: new Date(event.timestamp).getTime(),
          completed: false,
        });
      } else if (event.type === 'application_completed') {
        const app = applications.get(event.properties?.applicationId);
        if (app) {
          app.completed = true;
          app.completedAt = new Date(event.timestamp).getTime();
          app.sectionsCompleted = event.properties?.sectionsCompleted;
        }
      }
    });

    return Array.from(applications.values());
  }

  /**
   * Get section usage from events
   */
  private getSectionUsage(events: AnalyticsEvent[]): Record<string, number> {
    const usage: Record<string, number> = {};

    events.forEach(event => {
      if (event.type === 'section_edit' && event.properties?.section) {
        const section = event.properties.section;
        usage[section] = (usage[section] || 0) + 1;
      }
    });

    return usage;
  }

  /**
   * Get provider usage from events
   */
  private getProviderUsage(events: AnalyticsEvent[]): Record<string, number> {
    const usage: Record<string, number> = {};

    events.forEach(event => {
      if (event.properties?.provider) {
        const provider = event.properties.provider;
        usage[provider] = (usage[provider] || 0) + 1;
      }
    });

    return usage;
  }

  /**
   * Get model usage from events
   */
  private getModelUsage(events: AnalyticsEvent[]): Record<string, number> {
    const usage: Record<string, number> = {};

    events.forEach(event => {
      if (event.properties?.model) {
        const model = event.properties.model;
        usage[model] = (usage[model] || 0) + 1;
      }
    });

    return usage;
  }

  /**
   * Enable/disable analytics
   */
  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * Clear all events
   */
  public clear(): void {
    this.events = [];
  }

  /**
   * Export events for analysis
   */
  public exportEvents(): AnalyticsEvent[] {
    return [...this.events];
  }
}

// Export singleton instance
export const analyticsService = AnalyticsService.getInstance();

// React hook for analytics
export function useAnalytics() {
  return {
    track: analyticsService.track.bind(analyticsService),
    trackPageView: analyticsService.trackPageView.bind(analyticsService),
    trackUserAction: analyticsService.trackUserAction.bind(analyticsService),
    trackAIGeneration: analyticsService.trackAIGeneration.bind(analyticsService),
    trackApplicationCreated: analyticsService.trackApplicationCreated.bind(analyticsService),
    trackApplicationCompleted: analyticsService.trackApplicationCompleted.bind(analyticsService),
    trackSectionEdit: analyticsService.trackSectionEdit.bind(analyticsService),
    trackCollaboration: analyticsService.trackCollaboration.bind(analyticsService),
    trackError: analyticsService.trackError.bind(analyticsService),
    getUserBehaviorMetrics: analyticsService.getUserBehaviorMetrics.bind(analyticsService),
    getApplicationMetrics: analyticsService.getApplicationMetrics.bind(analyticsService),
    getAIPerformanceMetrics: analyticsService.getAIPerformanceMetrics.bind(analyticsService),
  };
}
