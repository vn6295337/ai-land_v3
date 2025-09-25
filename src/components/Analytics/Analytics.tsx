import React, { useMemo } from 'react';
import { BarChart3, TrendingUp, Eye, Search, Heart, Download, Users, Clock } from 'lucide-react';
import { ComponentProps } from '../../types/ui';
import { useModelsStore, modelsSelectors } from '../../stores/modelsStore';
import { useUserProfileStore, userProfileSelectors } from '../../stores/userProfileStore';

export interface AnalyticsProps extends ComponentProps {
  timeframe?: '7d' | '30d' | '90d' | 'all';
  showPersonalAnalytics?: boolean;
}

export const Analytics: React.FC<AnalyticsProps> = React.memo(({
  timeframe = '30d',
  showPersonalAnalytics = true,
  className = '',
  testId = 'analytics'
}) => {
  const {
    models,
    filteredModels,
    favorites
  } = useModelsStore();

  const {
    preferences,
    activity,
    isLoggedIn
  } = useUserProfileStore();

  const userStats = userProfileSelectors.getUserStats(useUserProfileStore.getState());
  const recentActivity = userProfileSelectors.getRecentActivity(useUserProfileStore.getState());

  // Calculate model analytics
  const modelAnalytics = useMemo(() => {
    const providerCounts = models.reduce((acc, model) => {
      acc[model.provider] = (acc[model.provider] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const categoryCounts = models.reduce((acc, model) => {
      acc[model.category] = (acc[model.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const costDistribution = {
      free: models.filter(m => m.cost === 0).length,
      low: models.filter(m => m.cost > 0 && m.cost <= 0.01).length,
      medium: models.filter(m => m.cost > 0.01 && m.cost <= 0.05).length,
      high: models.filter(m => m.cost > 0.05).length
    };

    const capabilityStats = {
      streaming: models.filter(m => m.streaming).length,
      functionCalling: models.filter(m => m.functionCalling).length,
      vision: models.filter(m => m.vision).length
    };

    const contextLengthStats = {
      small: models.filter(m => m.contextLength <= 4000).length,
      medium: models.filter(m => m.contextLength > 4000 && m.contextLength <= 32000).length,
      large: models.filter(m => m.contextLength > 32000 && m.contextLength <= 128000).length,
      extraLarge: models.filter(m => m.contextLength > 128000).length
    };

    return {
      total: models.length,
      filtered: filteredModels.length,
      favorited: favorites.size,
      providerCounts,
      categoryCounts,
      costDistribution,
      capabilityStats,
      contextLengthStats
    };
  }, [models, filteredModels, favorites]);

  // Calculate trending data (mock data for demo)
  const trendingData = useMemo(() => {
    const topProviders = Object.entries(modelAnalytics.providerCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);

    const topCategories = Object.entries(modelAnalytics.categoryCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);

    return {
      topProviders,
      topCategories,
      mostViewed: Object.entries(activity.modelViews)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5),
      recentSearches: activity.searchQueries.slice(0, 10)
    };
  }, [modelAnalytics, activity]);

  const renderStatCard = (
    title: string,
    value: string | number,
    icon: React.ComponentType<any>,
    trend?: string,
    trendDirection?: 'up' | 'down' | 'neutral'
  ) => {
    const Icon = icon;
    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
            <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{value}</p>
            {trend && (
              <p className={`text-sm ${
                trendDirection === 'up' ? 'text-green-600 dark:text-green-400' :
                trendDirection === 'down' ? 'text-red-600 dark:text-red-400' :
                'text-gray-500 dark:text-gray-400'
              }`}>
                {trend}
              </p>
            )}
          </div>
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-full">
            <Icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
        </div>
      </div>
    );
  };

  const renderBarChart = (title: string, data: Array<[string, number]>, color = 'blue') => (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{title}</h3>
      <div className="space-y-3">
        {data.map(([label, value]) => {
          const maxValue = Math.max(...data.map(([, v]) => v));
          const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;

          return (
            <div key={label} className="flex items-center gap-3">
              <div className="w-20 text-sm text-gray-600 dark:text-gray-400 capitalize">
                {label.replace('_', ' ')}
              </div>
              <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className={`h-2 rounded-full bg-${color}-500 transition-all duration-300`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <div className="w-12 text-sm font-medium text-gray-900 dark:text-gray-100 text-right">
                {value}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderPieChart = (title: string, data: Record<string, number>) => {
    const total = Object.values(data).reduce((sum, val) => sum + val, 0);
    let cumulativePercentage = 0;

    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-yellow-500',
      'bg-red-500',
      'bg-purple-500',
      'bg-indigo-500'
    ];

    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{title}</h3>

        <div className="flex items-center justify-center mb-4">
          <div className="relative w-32 h-32">
            <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 36 36">
              <path
                d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="2"
              />
              {Object.entries(data).map(([key, value], index) => {
                const percentage = total > 0 ? (value / total) * 100 : 0;
                const strokeDasharray = `${percentage} ${100 - percentage}`;
                const strokeDashoffset = -cumulativePercentage;
                cumulativePercentage += percentage;

                return (
                  <path
                    key={key}
                    d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke={index < colors.length ? colors[index].replace('bg-', '#') : '#6b7280'}
                    strokeWidth="2"
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={strokeDashoffset}
                    className="transition-all duration-300"
                  />
                );
              })}
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">{total}</div>
                <div className="text-xs text-gray-500">Total</div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {Object.entries(data).map(([key, value], index) => {
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
            return (
              <div key={key} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${colors[index] || 'bg-gray-400'}`} />
                  <span className="capitalize">{key.replace('_', ' ')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-600 dark:text-gray-400">{percentage}%</span>
                  <span className="font-medium">{value}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderActivityFeed = () => (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Recent Activity</h3>

      {isLoggedIn ? (
        <div className="space-y-3">
          {recentActivity.recentSearches.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Recent Searches</h4>
              <div className="space-y-1">
                {recentActivity.recentSearches.map((search, index) => (
                  <div key={index} className="text-sm text-gray-600 dark:text-gray-400">
                    <Search className="w-3 h-3 inline mr-2" />
                    "{search.query}" • {search.resultsCount} results
                    <span className="ml-2 text-xs">
                      {new Date(search.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {recentActivity.recentFavorites.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Recent Favorites</h4>
              <div className="space-y-1">
                {recentActivity.recentFavorites.map((favorite, index) => (
                  <div key={index} className="text-sm text-gray-600 dark:text-gray-400">
                    <Heart className={`w-3 h-3 inline mr-2 ${
                      favorite.action === 'add' ? 'text-red-500' : 'text-gray-400'
                    }`} />
                    {favorite.action === 'add' ? 'Added' : 'Removed'} favorite
                    <span className="ml-2 text-xs">
                      {new Date(favorite.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {recentActivity.recentExports.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Recent Exports</h4>
              <div className="space-y-1">
                {recentActivity.recentExports.map((exp, index) => (
                  <div key={index} className="text-sm text-gray-600 dark:text-gray-400">
                    <Download className="w-3 h-3 inline mr-2" />
                    Exported {exp.modelCount} models as {exp.format.toUpperCase()}
                    <span className="ml-2 text-xs">
                      {new Date(exp.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {recentActivity.recentSearches.length === 0 &&
           recentActivity.recentFavorites.length === 0 &&
           recentActivity.recentExports.length === 0 && (
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              No recent activity to show
            </p>
          )}
        </div>
      ) : (
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          Create a profile to track your activity
        </p>
      )}
    </div>
  );

  return (
    <div className={`space-y-6 ${className}`} data-testid={testId}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Analytics</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Insights into AI models and your usage patterns
          </p>
        </div>
        <div className="flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-blue-600" />
        </div>
      </div>

      {/* Global Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {renderStatCard(
          'Total Models',
          modelAnalytics.total,
          BarChart3,
          `${modelAnalytics.filtered} filtered`,
          'neutral'
        )}

        {renderStatCard(
          'Providers',
          Object.keys(modelAnalytics.providerCounts).length,
          Users,
          'Across platforms',
          'neutral'
        )}

        {renderStatCard(
          'Free Models',
          modelAnalytics.costDistribution.free,
          TrendingUp,
          `${((modelAnalytics.costDistribution.free / modelAnalytics.total) * 100).toFixed(1)}% of total`,
          'up'
        )}

        {isLoggedIn && renderStatCard(
          'Your Favorites',
          favorites.size,
          Heart,
          `${userStats.uniqueModelsViewed} viewed`,
          'up'
        )}
      </div>

      {/* Personal Analytics */}
      {showPersonalAnalytics && isLoggedIn && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {renderStatCard('Model Views', userStats.totalModelViews, Eye)}
          {renderStatCard('Searches', userStats.totalSearches, Search)}
          {renderStatCard('Sessions', userStats.totalSessions, Clock)}
          {renderStatCard('Exports', userStats.exportCount, Download)}
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {renderBarChart(
          'Models by Provider',
          Object.entries(modelAnalytics.providerCounts).sort(([,a], [,b]) => b - a),
          'blue'
        )}

        {renderBarChart(
          'Models by Category',
          Object.entries(modelAnalytics.categoryCounts).sort(([,a], [,b]) => b - a),
          'green'
        )}

        {renderPieChart('Cost Distribution', modelAnalytics.costDistribution)}
      </div>

      {/* Secondary Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderBarChart(
          'Capabilities',
          Object.entries(modelAnalytics.capabilityStats),
          'purple'
        )}

        {renderBarChart(
          'Context Length Distribution',
          Object.entries(modelAnalytics.contextLengthStats),
          'indigo'
        )}
      </div>

      {/* Activity Feed */}
      {showPersonalAnalytics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {renderActivityFeed()}

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Usage Insights</h3>
            <div className="space-y-4">
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Most Active Hour</div>
                <div className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  {new Date().getHours()}:00 - {new Date().getHours() + 1}:00
                </div>
              </div>

              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Average Session</div>
                <div className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  {Math.round(userStats.averageSessionDuration / 60000)}m
                </div>
              </div>

              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Favorite Provider</div>
                <div className="text-lg font-medium text-gray-900 dark:text-gray-100 capitalize">
                  {trendingData.topProviders[0]?.[0] || 'N/A'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default Analytics;