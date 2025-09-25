import { AIModel } from '../types/ai';
import { UserActivity, UserPreferences } from '../types/user';

// ML-based recommendation engine for AI models
export interface RecommendationScore {
  modelId: string;
  score: number;
  reasons: string[];
  confidence: number;
}

export interface RecommendationContext {
  userActivity: UserActivity;
  userPreferences: UserPreferences;
  availableModels: AIModel[];
  currentQuery?: string;
  taskContext?: 'coding' | 'writing' | 'analysis' | 'creative' | 'general';
}

export class MLRecommendationService {
  private readonly ACTIVITY_WEIGHT = 0.4;
  private readonly PREFERENCE_WEIGHT = 0.3;
  private readonly SIMILARITY_WEIGHT = 0.2;
  private readonly PERFORMANCE_WEIGHT = 0.1;

  /**
   * Generate personalized model recommendations based on user behavior and preferences
   */
  public generateRecommendations(context: RecommendationContext, limit = 5): RecommendationScore[] {
    const scores = context.availableModels.map(model =>
      this.calculateRecommendationScore(model, context)
    );

    return scores
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Calculate recommendation score for a specific model
   */
  private calculateRecommendationScore(model: AIModel, context: RecommendationContext): RecommendationScore {
    const activityScore = this.calculateActivityScore(model, context.userActivity);
    const preferenceScore = this.calculatePreferenceScore(model, context.userPreferences);
    const similarityScore = this.calculateSimilarityScore(model, context);
    const performanceScore = this.calculatePerformanceScore(model);

    const totalScore = (
      activityScore * this.ACTIVITY_WEIGHT +
      preferenceScore * this.PREFERENCE_WEIGHT +
      similarityScore * this.SIMILARITY_WEIGHT +
      performanceScore * this.PERFORMANCE_WEIGHT
    );

    const reasons = this.generateReasons(model, {
      activityScore,
      preferenceScore,
      similarityScore,
      performanceScore
    }, context);

    const confidence = this.calculateConfidence(activityScore, preferenceScore, context.userActivity);

    return {
      modelId: model.id,
      score: Math.round(totalScore * 100) / 100,
      reasons,
      confidence: Math.round(confidence * 100) / 100
    };
  }

  /**
   * Score based on user's historical activity with similar models
   */
  private calculateActivityScore(model: AIModel, activity: UserActivity): number {
    const { modelViews, modelSearches, modelFavorites, modelComparisons } = activity;

    // Weight factors for different activities
    const viewWeight = 0.2;
    const searchWeight = 0.3;
    const favoriteWeight = 0.4;
    const comparisonWeight = 0.1;

    let score = 0;

    // Score based on direct model interactions
    const directViews = modelViews[model.id] || 0;
    const directSearches = modelSearches.filter(search =>
      model.name.toLowerCase().includes(search.query.toLowerCase()) ||
      model.provider.toLowerCase().includes(search.query.toLowerCase())
    ).length;
    const isFavorite = modelFavorites.includes(model.id);
    const comparisonCount = modelComparisons.filter(comp => comp.includes(model.id)).length;

    score += (directViews / Math.max(1, Math.max(...Object.values(modelViews)))) * viewWeight;
    score += (directSearches / Math.max(1, modelSearches.length)) * searchWeight;
    score += (isFavorite ? 1 : 0) * favoriteWeight;
    score += (comparisonCount / Math.max(1, modelComparisons.length)) * comparisonWeight;

    // Score based on similar model interactions
    const similarModels = this.findSimilarModels(model, Object.keys(modelViews));
    const similarActivityScore = similarModels.reduce((acc, similarModelId) => {
      return acc + (modelViews[similarModelId] || 0);
    }, 0) / Math.max(1, similarModels.length);

    score += (similarActivityScore / Math.max(1, Math.max(...Object.values(modelViews)))) * 0.2;

    return Math.min(1, score);
  }

  /**
   * Score based on user's declared preferences
   */
  private calculatePreferenceScore(model: AIModel, preferences: UserPreferences): number {
    let score = 0;
    let maxScore = 0;

    // Provider preference
    if (preferences.preferredProviders.length > 0) {
      maxScore += 1;
      if (preferences.preferredProviders.includes(model.provider)) {
        score += 1;
      }
    }

    // Category preference
    if (preferences.preferredCategories.length > 0) {
      maxScore += 1;
      if (preferences.preferredCategories.includes(model.category)) {
        score += 1;
      }
    }

    // Cost preference
    maxScore += 1;
    const costScore = this.scoreCostPreference(model.pricing, preferences.maxCostPerQuery);
    score += costScore;

    // Size preference
    if (preferences.preferredModelSizes.length > 0) {
      maxScore += 1;
      const modelSize = this.categorizeModelSize(model.parameters);
      if (preferences.preferredModelSizes.includes(modelSize)) {
        score += 1;
      }
    }

    // Capability preferences
    if (preferences.requiredCapabilities.length > 0) {
      maxScore += 1;
      const hasRequiredCapabilities = preferences.requiredCapabilities.every(capability =>
        model.capabilities.includes(capability)
      );
      if (hasRequiredCapabilities) {
        score += 1;
      }
    }

    return maxScore > 0 ? score / maxScore : 0.5; // Default neutral score if no preferences
  }

  /**
   * Score based on similarity to other high-performing models for the user
   */
  private calculateSimilarityScore(model: AIModel, context: RecommendationContext): number {
    const favoriteModels = context.availableModels.filter(m =>
      context.userActivity.modelFavorites.includes(m.id)
    );

    if (favoriteModels.length === 0) {
      return 0.5; // Neutral score if no favorites
    }

    const similarities = favoriteModels.map(favModel =>
      this.calculateModelSimilarity(model, favModel)
    );

    return similarities.reduce((acc, sim) => acc + sim, 0) / similarities.length;
  }

  /**
   * Score based on model's general performance characteristics
   */
  private calculatePerformanceScore(model: AIModel): number {
    let score = 0;

    // Higher parameter count generally indicates more capability (with diminishing returns)
    if (model.parameters) {
      const paramScore = Math.min(1, Math.log10(model.parameters / 1000) / 5); // Normalized log scale
      score += paramScore * 0.3;
    }

    // Context window size
    if (model.contextWindow) {
      const contextScore = Math.min(1, model.contextWindow / 100000); // Normalized to 100k context
      score += contextScore * 0.2;
    }

    // Recency bonus (newer models often perform better)
    if (model.releaseDate) {
      const daysSinceRelease = (Date.now() - new Date(model.releaseDate).getTime()) / (1000 * 60 * 60 * 24);
      const recencyScore = Math.max(0, 1 - daysSinceRelease / 365); // Decay over a year
      score += recencyScore * 0.2;
    }

    // Capability diversity
    const capabilityScore = Math.min(1, model.capabilities.length / 10); // Normalized to 10 capabilities
    score += capabilityScore * 0.3;

    return Math.min(1, score);
  }

  /**
   * Find models similar to the given model based on various attributes
   */
  private findSimilarModels(targetModel: AIModel, candidateIds: string[]): string[] {
    // In a real implementation, this would use more sophisticated similarity metrics
    return candidateIds.filter(id => {
      // Simple similarity: same provider or category
      return id !== targetModel.id; // Don't include the target model itself
    });
  }

  /**
   * Calculate similarity between two models
   */
  private calculateModelSimilarity(model1: AIModel, model2: AIModel): number {
    if (model1.id === model2.id) return 1;

    let similarity = 0;
    let factors = 0;

    // Provider similarity
    factors++;
    if (model1.provider === model2.provider) {
      similarity += 0.3;
    }

    // Category similarity
    factors++;
    if (model1.category === model2.category) {
      similarity += 0.3;
    }

    // Parameter count similarity (log scale)
    if (model1.parameters && model2.parameters) {
      factors++;
      const ratio = Math.min(model1.parameters, model2.parameters) / Math.max(model1.parameters, model2.parameters);
      similarity += ratio * 0.2;
    }

    // Capability overlap
    factors++;
    const commonCapabilities = model1.capabilities.filter(cap => model2.capabilities.includes(cap));
    const totalCapabilities = new Set([...model1.capabilities, ...model2.capabilities]).size;
    similarity += (commonCapabilities.length / totalCapabilities) * 0.2;

    return similarity;
  }

  /**
   * Score how well a model's pricing matches user's cost preference
   */
  private scoreCostPreference(pricing: AIModel['pricing'], maxCostPreference?: number): number {
    if (!maxCostPreference || !pricing.perQuery) {
      return 0.5; // Neutral score if no preference or pricing info
    }

    if (pricing.perQuery <= maxCostPreference) {
      return 1; // Perfect match
    }

    // Penalize based on how much it exceeds preference
    const excess = pricing.perQuery / maxCostPreference;
    return Math.max(0, 1 - (excess - 1)); // Linear penalty
  }

  /**
   * Categorize model size based on parameter count
   */
  private categorizeModelSize(parameters?: number): 'small' | 'medium' | 'large' | 'extra-large' {
    if (!parameters) return 'medium';

    if (parameters < 1000000) return 'small';          // < 1M
    if (parameters < 10000000) return 'medium';        // < 10M
    if (parameters < 100000000) return 'large';        // < 100M
    return 'extra-large';                              // >= 100M
  }

  /**
   * Generate human-readable reasons for the recommendation
   */
  private generateReasons(
    model: AIModel,
    scores: {
      activityScore: number;
      preferenceScore: number;
      similarityScore: number;
      performanceScore: number;
    },
    context: RecommendationContext
  ): string[] {
    const reasons: string[] = [];

    // Activity-based reasons
    if (scores.activityScore > 0.7) {
      const viewCount = context.userActivity.modelViews[model.id] || 0;
      const isFavorite = context.userActivity.modelFavorites.includes(model.id);

      if (isFavorite) {
        reasons.push("You've favorited this model");
      } else if (viewCount > 0) {
        reasons.push(`You've viewed this model ${viewCount} time${viewCount > 1 ? 's' : ''}`);
      } else {
        reasons.push("Similar to models you frequently use");
      }
    }

    // Preference-based reasons
    if (scores.preferenceScore > 0.7) {
      if (context.userPreferences.preferredProviders.includes(model.provider)) {
        reasons.push(`From your preferred provider: ${model.provider}`);
      }
      if (context.userPreferences.preferredCategories.includes(model.category)) {
        reasons.push(`Matches your preferred category: ${model.category}`);
      }
    }

    // Performance-based reasons
    if (scores.performanceScore > 0.8) {
      if (model.parameters && model.parameters > 10000000) {
        reasons.push("High-performance model with advanced capabilities");
      }
      if (model.contextWindow && model.contextWindow > 50000) {
        reasons.push("Supports large context windows for complex tasks");
      }
    }

    // Similarity-based reasons
    if (scores.similarityScore > 0.6) {
      reasons.push("Similar to your favorite models");
    }

    // Default reason if no specific reasons found
    if (reasons.length === 0) {
      reasons.push("Well-suited based on your usage patterns");
    }

    return reasons.slice(0, 3); // Limit to top 3 reasons
  }

  /**
   * Calculate confidence level in the recommendation
   */
  private calculateConfidence(activityScore: number, preferenceScore: number, activity: UserActivity): number {
    // Base confidence on amount of user data available
    const totalActivity = Object.values(activity.modelViews).reduce((acc, views) => acc + views, 0) +
                          activity.modelSearches.length +
                          activity.modelFavorites.length +
                          activity.modelComparisons.length;

    // More activity data = higher potential confidence
    const dataConfidence = Math.min(1, totalActivity / 50); // Normalized to 50 total interactions

    // Higher scores = higher confidence
    const scoreConfidence = (activityScore + preferenceScore) / 2;

    return (dataConfidence + scoreConfidence) / 2;
  }

  /**
   * Get contextual recommendations for specific tasks
   */
  public getTaskSpecificRecommendations(
    taskContext: RecommendationContext['taskContext'],
    context: Omit<RecommendationContext, 'taskContext'>,
    limit = 3
  ): RecommendationScore[] {
    const taskWeights = this.getTaskWeights(taskContext);

    const scores = context.availableModels.map(model => {
      const baseScore = this.calculateRecommendationScore(model, { ...context, taskContext });
      const taskBonus = this.calculateTaskSpecificBonus(model, taskContext, taskWeights);

      return {
        ...baseScore,
        score: baseScore.score + taskBonus,
        reasons: [
          ...baseScore.reasons,
          ...this.getTaskSpecificReasons(model, taskContext, taskBonus)
        ].slice(0, 3)
      };
    });

    return scores
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Get task-specific weight adjustments
   */
  private getTaskWeights(taskContext: RecommendationContext['taskContext']) {
    const weights = {
      coding: { capabilities: ['code-generation', 'code-review'], categories: ['Code Generation'] },
      writing: { capabilities: ['text-generation', 'creative-writing'], categories: ['Text Generation'] },
      analysis: { capabilities: ['analysis', 'reasoning'], categories: ['Analysis', 'Reasoning'] },
      creative: { capabilities: ['creative-writing', 'image-generation'], categories: ['Creative'] },
      general: { capabilities: [], categories: [] }
    };

    return weights[taskContext || 'general'];
  }

  /**
   * Calculate task-specific bonus score
   */
  private calculateTaskSpecificBonus(
    model: AIModel,
    taskContext: RecommendationContext['taskContext'],
    taskWeights: any
  ): number {
    if (!taskContext || taskContext === 'general') return 0;

    let bonus = 0;

    // Capability match bonus
    const capabilityMatches = model.capabilities.filter(cap =>
      taskWeights.capabilities.includes(cap)
    ).length;
    bonus += (capabilityMatches / Math.max(1, taskWeights.capabilities.length)) * 0.3;

    // Category match bonus
    if (taskWeights.categories.includes(model.category)) {
      bonus += 0.2;
    }

    return bonus;
  }

  /**
   * Generate task-specific reasons
   */
  private getTaskSpecificReasons(
    model: AIModel,
    taskContext: RecommendationContext['taskContext'],
    bonus: number
  ): string[] {
    if (bonus < 0.2) return [];

    const taskReasons = {
      coding: ["Optimized for code generation and review"],
      writing: ["Excellent for creative and technical writing"],
      analysis: ["Strong analytical and reasoning capabilities"],
      creative: ["Great for creative tasks and content generation"],
      general: []
    };

    return taskReasons[taskContext || 'general'] || [];
  }
}

export const mlRecommendationService = new MLRecommendationService();