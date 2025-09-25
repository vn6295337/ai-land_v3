import { UserActivity, UserPreferences } from '../types/user';
import { AIModel } from '../types/ai';

export interface UsagePattern {
  pattern: 'frequent_user' | 'explorer' | 'specialist' | 'casual' | 'researcher';
  confidence: number;
  characteristics: string[];
  recommendations: string[];
}

export interface SessionPattern {
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  duration: 'short' | 'medium' | 'long';
  intensity: 'light' | 'moderate' | 'heavy';
  focus: string[];
}

export interface PredictedUsage {
  nextLikelyModels: string[];
  predictedSearches: string[];
  optimalSessionTime: string;
  suggestedWorkflow: string[];
  churnRisk: number;
}

export interface TrendAnalysis {
  period: '7d' | '30d' | '90d';
  growthRate: number;
  modelDiversityTrend: 'increasing' | 'decreasing' | 'stable';
  engagementTrend: 'increasing' | 'decreasing' | 'stable';
  preferenceStability: number;
}

export class UsagePatternService {
  private readonly ACTIVITY_THRESHOLD_CASUAL = 5;
  private readonly ACTIVITY_THRESHOLD_MODERATE = 20;
  private readonly ACTIVITY_THRESHOLD_HEAVY = 50;

  /**
   * Analyze user's usage patterns and classify behavior type
   */
  public analyzeUsagePattern(activity: UserActivity, preferences: UserPreferences): UsagePattern {
    const totalActivity = this.calculateTotalActivity(activity);
    const diversity = this.calculateModelDiversity(activity);
    const consistency = this.calculateConsistency(activity);
    const specialization = this.calculateSpecialization(activity, preferences);

    const pattern = this.classifyPattern(totalActivity, diversity, consistency, specialization);
    const confidence = this.calculatePatternConfidence(totalActivity, diversity, consistency);
    const characteristics = this.generateCharacteristics(pattern, {
      totalActivity,
      diversity,
      consistency,
      specialization
    });
    const recommendations = this.generatePatternRecommendations(pattern);

    return {
      pattern,
      confidence,
      characteristics,
      recommendations
    };
  }

  /**
   * Analyze session patterns from user activity
   */
  public analyzeSessionPatterns(activity: UserActivity): SessionPattern[] {
    const sessions = this.extractSessions(activity);

    return sessions.map(session => ({
      timeOfDay: this.getTimeOfDay(session.startTime),
      duration: this.getDuration(session.duration),
      intensity: this.getIntensity(session.activityCount),
      focus: this.getSessionFocus(session.activities)
    }));
  }

  /**
   * Predict future usage patterns and recommendations
   */
  public predictUsage(activity: UserActivity, preferences: UserPreferences, models: AIModel[]): PredictedUsage {
    const usagePattern = this.analyzeUsagePattern(activity, preferences);
    const sessionPatterns = this.analyzeSessionPatterns(activity);

    return {
      nextLikelyModels: this.predictNextModels(activity, models),
      predictedSearches: this.predictSearchQueries(activity),
      optimalSessionTime: this.predictOptimalSessionTime(sessionPatterns),
      suggestedWorkflow: this.suggestWorkflow(usagePattern, sessionPatterns),
      churnRisk: this.calculateChurnRisk(activity, usagePattern)
    };
  }

  /**
   * Analyze trends in user behavior over different time periods
   */
  public analyzeTrends(activity: UserActivity, period: TrendAnalysis['period']): TrendAnalysis {
    const cutoffDate = this.getCutoffDate(period);
    const recentActivity = this.filterRecentActivity(activity, cutoffDate);
    const historicalActivity = this.filterHistoricalActivity(activity, cutoffDate);

    const growthRate = this.calculateGrowthRate(recentActivity, historicalActivity);
    const modelDiversityTrend = this.calculateDiversityTrend(recentActivity, historicalActivity);
    const engagementTrend = this.calculateEngagementTrend(recentActivity, historicalActivity);
    const preferenceStability = this.calculatePreferenceStability(activity, cutoffDate);

    return {
      period,
      growthRate,
      modelDiversityTrend,
      engagementTrend,
      preferenceStability
    };
  }

  /**
   * Calculate total user activity score
   */
  private calculateTotalActivity(activity: UserActivity): number {
    const viewWeight = 1;
    const searchWeight = 2;
    const favoriteWeight = 5;
    const comparisonWeight = 3;

    const viewCount = Object.values(activity.modelViews).reduce((acc, views) => acc + views, 0);
    const searchCount = activity.modelSearches.length;
    const favoriteCount = activity.modelFavorites.length;
    const comparisonCount = activity.modelComparisons.length;

    return (
      viewCount * viewWeight +
      searchCount * searchWeight +
      favoriteCount * favoriteWeight +
      comparisonCount * comparisonWeight
    );
  }

  /**
   * Calculate diversity in model exploration
   */
  private calculateModelDiversity(activity: UserActivity): number {
    const uniqueModelsViewed = Object.keys(activity.modelViews).length;
    const uniqueSearchTerms = new Set(
      activity.modelSearches.map(search => search.query.toLowerCase())
    ).size;

    // Normalize based on typical diversity ranges
    const viewDiversity = Math.min(1, uniqueModelsViewed / 20);
    const searchDiversity = Math.min(1, uniqueSearchTerms / 10);

    return (viewDiversity + searchDiversity) / 2;
  }

  /**
   * Calculate consistency in user behavior
   */
  private calculateConsistency(activity: UserActivity): number {
    // Analyze session frequency and regularity
    const sessions = this.extractSessions(activity);

    if (sessions.length < 2) return 0;

    // Calculate variance in session timing
    const sessionIntervals = [];
    for (let i = 1; i < sessions.length; i++) {
      const interval = sessions[i].startTime - sessions[i - 1].startTime;
      sessionIntervals.push(interval);
    }

    if (sessionIntervals.length === 0) return 0;

    const avgInterval = sessionIntervals.reduce((acc, interval) => acc + interval, 0) / sessionIntervals.length;
    const variance = sessionIntervals.reduce((acc, interval) => {
      return acc + Math.pow(interval - avgInterval, 2);
    }, 0) / sessionIntervals.length;

    // Lower variance = higher consistency
    const consistency = 1 / (1 + variance / (avgInterval * avgInterval));
    return Math.min(1, consistency);
  }

  /**
   * Calculate specialization level in specific areas
   */
  private calculateSpecialization(activity: UserActivity, preferences: UserPreferences): number {
    // Check concentration in specific providers, categories, or capabilities
    const providerDistribution = this.getProviderDistribution(activity);
    const categoryDistribution = this.getCategoryDistribution(activity, preferences);

    const providerSpecialization = this.calculateConcentration(providerDistribution);
    const categorySpecialization = this.calculateConcentration(categoryDistribution);

    return (providerSpecialization + categorySpecialization) / 2;
  }

  /**
   * Classify user pattern based on calculated metrics
   */
  private classifyPattern(
    totalActivity: number,
    diversity: number,
    consistency: number,
    specialization: number
  ): UsagePattern['pattern'] {
    if (totalActivity >= this.ACTIVITY_THRESHOLD_HEAVY) {
      if (specialization > 0.7) return 'specialist';
      if (diversity > 0.7) return 'researcher';
      return 'frequent_user';
    }

    if (totalActivity >= this.ACTIVITY_THRESHOLD_MODERATE) {
      if (diversity > 0.6) return 'explorer';
      return 'frequent_user';
    }

    if (totalActivity >= this.ACTIVITY_THRESHOLD_CASUAL) {
      return 'casual';
    }

    return 'casual';
  }

  /**
   * Calculate confidence in pattern classification
   */
  private calculatePatternConfidence(
    totalActivity: number,
    diversity: number,
    consistency: number
  ): number {
    // More activity and consistency = higher confidence
    const activityConfidence = Math.min(1, totalActivity / this.ACTIVITY_THRESHOLD_HEAVY);
    const consistencyConfidence = consistency;
    const dataConfidence = diversity > 0.1 ? 1 : 0.5; // Penalize very low diversity

    return (activityConfidence + consistencyConfidence + dataConfidence) / 3;
  }

  /**
   * Generate characteristics description for the pattern
   */
  private generateCharacteristics(
    pattern: UsagePattern['pattern'],
    metrics: {
      totalActivity: number;
      diversity: number;
      consistency: number;
      specialization: number;
    }
  ): string[] {
    const characteristics: string[] = [];

    // Activity level
    if (metrics.totalActivity >= this.ACTIVITY_THRESHOLD_HEAVY) {
      characteristics.push("High engagement user");
    } else if (metrics.totalActivity >= this.ACTIVITY_THRESHOLD_MODERATE) {
      characteristics.push("Moderate engagement user");
    } else {
      characteristics.push("Light engagement user");
    }

    // Diversity
    if (metrics.diversity > 0.7) {
      characteristics.push("Explores many different models");
    } else if (metrics.diversity > 0.4) {
      characteristics.push("Uses a moderate variety of models");
    } else {
      characteristics.push("Focuses on specific models");
    }

    // Consistency
    if (metrics.consistency > 0.7) {
      characteristics.push("Consistent usage patterns");
    } else if (metrics.consistency > 0.4) {
      characteristics.push("Somewhat regular usage");
    } else {
      characteristics.push("Irregular usage patterns");
    }

    // Specialization
    if (metrics.specialization > 0.7) {
      characteristics.push("Specialized in specific domains");
    } else if (metrics.specialization > 0.4) {
      characteristics.push("Has some preferred areas");
    } else {
      characteristics.push("General-purpose usage across domains");
    }

    return characteristics;
  }

  /**
   * Generate pattern-specific recommendations
   */
  private generatePatternRecommendations(pattern: UsagePattern['pattern']): string[] {
    const recommendations = {
      frequent_user: [
        "Consider setting up personalized dashboards",
        "Explore advanced filtering and comparison features",
        "Try batch export functionality for analysis"
      ],
      explorer: [
        "Use the discovery features to find new models",
        "Enable recommendations for similar models",
        "Try the model comparison feature"
      ],
      specialist: [
        "Set up alerts for new models in your domain",
        "Create custom filters for your use cases",
        "Consider sharing your expertise through reviews"
      ],
      casual: [
        "Start with popular models in your area of interest",
        "Use guided tours to discover features",
        "Enable notifications for interesting updates"
      ],
      researcher: [
        "Use analytics to track your research patterns",
        "Export data for external analysis",
        "Set up comprehensive comparison views"
      ]
    };

    return recommendations[pattern] || recommendations.casual;
  }

  /**
   * Extract session data from user activity
   */
  private extractSessions(activity: UserActivity): Array<{
    startTime: number;
    endTime: number;
    duration: number;
    activityCount: number;
    activities: string[];
  }> {
    // Simplified session extraction - in reality would be more sophisticated
    const allActivities = [
      ...activity.modelSearches.map(s => ({ time: s.timestamp, type: 'search' })),
      // Add other activity types based on actual data structure
    ].sort((a, b) => a.time - b.time);

    const sessions = [];
    let currentSession = null;
    const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

    for (const activity of allActivities) {
      if (!currentSession || activity.time - currentSession.endTime > SESSION_TIMEOUT) {
        // Start new session
        if (currentSession) sessions.push(currentSession);

        currentSession = {
          startTime: activity.time,
          endTime: activity.time,
          duration: 0,
          activityCount: 1,
          activities: [activity.type]
        };
      } else {
        // Extend current session
        currentSession.endTime = activity.time;
        currentSession.duration = currentSession.endTime - currentSession.startTime;
        currentSession.activityCount++;
        currentSession.activities.push(activity.type);
      }
    }

    if (currentSession) sessions.push(currentSession);
    return sessions;
  }

  /**
   * Determine time of day for a timestamp
   */
  private getTimeOfDay(timestamp: number): SessionPattern['timeOfDay'] {
    const hour = new Date(timestamp).getHours();
    if (hour < 6) return 'night';
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    if (hour < 22) return 'evening';
    return 'night';
  }

  /**
   * Categorize session duration
   */
  private getDuration(durationMs: number): SessionPattern['duration'] {
    const minutes = durationMs / (1000 * 60);
    if (minutes < 5) return 'short';
    if (minutes < 20) return 'medium';
    return 'long';
  }

  /**
   * Categorize session intensity
   */
  private getIntensity(activityCount: number): SessionPattern['intensity'] {
    if (activityCount < 3) return 'light';
    if (activityCount < 10) return 'moderate';
    return 'heavy';
  }

  /**
   * Determine session focus areas
   */
  private getSessionFocus(activities: string[]): string[] {
    const focusAreas = new Set(activities);
    return Array.from(focusAreas).slice(0, 3); // Top 3 focus areas
  }

  /**
   * Predict most likely next models user will interact with
   */
  private predictNextModels(activity: UserActivity, models: AIModel[]): string[] {
    // Simple prediction based on recent activity patterns
    const recentViews = Object.entries(activity.modelViews)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([modelId]) => modelId);

    // Find similar models to recently viewed ones
    const predictions = new Set<string>();
    recentViews.forEach(modelId => {
      const model = models.find(m => m.id === modelId);
      if (model) {
        // Add models from same provider or category
        models.forEach(candidateModel => {
          if (candidateModel.id !== modelId &&
              (candidateModel.provider === model.provider ||
               candidateModel.category === model.category)) {
            predictions.add(candidateModel.id);
          }
        });
      }
    });

    return Array.from(predictions).slice(0, 3);
  }

  /**
   * Predict likely search queries
   */
  private predictSearchQueries(activity: UserActivity): string[] {
    const searchHistory = activity.modelSearches.map(s => s.query.toLowerCase());
    const commonTerms = this.extractCommonTerms(searchHistory);

    // Generate variations and related terms
    const predictions = commonTerms.map(term =>
      `${term} alternatives`
    ).concat(
      commonTerms.map(term => `best ${term}`)
    );

    return predictions.slice(0, 3);
  }

  /**
   * Predict optimal session time based on historical patterns
   */
  private predictOptimalSessionTime(patterns: SessionPattern[]): string {
    if (patterns.length === 0) return 'morning';

    const timeFrequency = patterns.reduce((acc, pattern) => {
      acc[pattern.timeOfDay] = (acc[pattern.timeOfDay] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const mostFrequentTime = Object.entries(timeFrequency)
      .sort(([, a], [, b]) => b - a)[0];

    return mostFrequentTime ? mostFrequentTime[0] : 'morning';
  }

  /**
   * Suggest optimal workflow based on patterns
   */
  private suggestWorkflow(usagePattern: UsagePattern, sessionPatterns: SessionPattern[]): string[] {
    const workflows = {
      frequent_user: [
        "Start with dashboard review",
        "Check new model updates",
        "Perform detailed comparisons",
        "Export findings"
      ],
      explorer: [
        "Browse new models",
        "Try different search queries",
        "Compare interesting findings",
        "Save favorites for later"
      ],
      specialist: [
        "Filter by preferred domain",
        "Deep dive into specifications",
        "Compare with current solutions",
        "Track performance metrics"
      ],
      casual: [
        "Check recommendations",
        "Browse popular models",
        "Read model descriptions",
        "Try simple comparisons"
      ],
      researcher: [
        "Set up comprehensive filters",
        "Export model data",
        "Perform statistical analysis",
        "Document findings"
      ]
    };

    return workflows[usagePattern.pattern] || workflows.casual;
  }

  /**
   * Calculate risk of user churning (stopping usage)
   */
  private calculateChurnRisk(activity: UserActivity, pattern: UsagePattern): number {
    // Factors that increase churn risk
    let riskScore = 0;

    // Low recent activity
    const recentActivityCount = this.getRecentActivityCount(activity, 7); // Last 7 days
    if (recentActivityCount === 0) riskScore += 0.4;
    else if (recentActivityCount < 3) riskScore += 0.2;

    // Low diversity (might get bored)
    const diversity = this.calculateModelDiversity(activity);
    if (diversity < 0.3) riskScore += 0.2;

    // Low pattern confidence (inconsistent usage)
    if (pattern.confidence < 0.5) riskScore += 0.2;

    // No favorites (low engagement)
    if (activity.modelFavorites.length === 0) riskScore += 0.2;

    return Math.min(1, riskScore);
  }

  // Helper methods for trend analysis

  private getCutoffDate(period: TrendAnalysis['period']): Date {
    const now = new Date();
    const daysAgo = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    return new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
  }

  private filterRecentActivity(activity: UserActivity, cutoffDate: Date): UserActivity {
    // Filter activity to only include items after cutoff date
    return {
      ...activity,
      modelSearches: activity.modelSearches.filter(s => s.timestamp > cutoffDate.getTime())
      // Add other filtered activities
    };
  }

  private filterHistoricalActivity(activity: UserActivity, cutoffDate: Date): UserActivity {
    // Filter activity to only include items before cutoff date
    return {
      ...activity,
      modelSearches: activity.modelSearches.filter(s => s.timestamp <= cutoffDate.getTime())
      // Add other filtered activities
    };
  }

  private calculateGrowthRate(recent: UserActivity, historical: UserActivity): number {
    const recentActivity = this.calculateTotalActivity(recent);
    const historicalActivity = this.calculateTotalActivity(historical);

    if (historicalActivity === 0) return recentActivity > 0 ? 1 : 0;

    return (recentActivity - historicalActivity) / historicalActivity;
  }

  private calculateDiversityTrend(recent: UserActivity, historical: UserActivity): TrendAnalysis['modelDiversityTrend'] {
    const recentDiversity = this.calculateModelDiversity(recent);
    const historicalDiversity = this.calculateModelDiversity(historical);

    const threshold = 0.1;
    if (recentDiversity > historicalDiversity + threshold) return 'increasing';
    if (recentDiversity < historicalDiversity - threshold) return 'decreasing';
    return 'stable';
  }

  private calculateEngagementTrend(recent: UserActivity, historical: UserActivity): TrendAnalysis['engagementTrend'] {
    const recentEngagement = this.calculateTotalActivity(recent);
    const historicalEngagement = this.calculateTotalActivity(historical);

    const threshold = 5;
    if (recentEngagement > historicalEngagement + threshold) return 'increasing';
    if (recentEngagement < historicalEngagement - threshold) return 'decreasing';
    return 'stable';
  }

  private calculatePreferenceStability(activity: UserActivity, cutoffDate: Date): number {
    // Calculate how stable user preferences are over time
    // This would analyze changes in preferred providers, categories, etc.
    return 0.8; // Placeholder - would need more detailed implementation
  }

  // Additional helper methods

  private getProviderDistribution(activity: UserActivity): Record<string, number> {
    // Would need model data to determine providers for viewed models
    return {}; // Placeholder
  }

  private getCategoryDistribution(activity: UserActivity, preferences: UserPreferences): Record<string, number> {
    // Would need model data to determine categories for viewed models
    return {}; // Placeholder
  }

  private calculateConcentration(distribution: Record<string, number>): number {
    const values = Object.values(distribution);
    const total = values.reduce((acc, val) => acc + val, 0);

    if (total === 0) return 0;

    // Calculate Herfindahl-Hirschman Index for concentration
    const hhi = values.reduce((acc, val) => {
      const share = val / total;
      return acc + share * share;
    }, 0);

    return hhi; // Higher value = more concentrated/specialized
  }

  private extractCommonTerms(queries: string[]): string[] {
    const termFreq: Record<string, number> = {};

    queries.forEach(query => {
      const terms = query.toLowerCase().split(/\s+/);
      terms.forEach(term => {
        if (term.length > 2) { // Ignore very short terms
          termFreq[term] = (termFreq[term] || 0) + 1;
        }
      });
    });

    return Object.entries(termFreq)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([term]) => term);
  }

  private getRecentActivityCount(activity: UserActivity, days: number): number {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return activity.modelSearches.filter(s => s.timestamp > cutoffDate.getTime()).length;
  }
}

export const usagePatternService = new UsagePatternService();