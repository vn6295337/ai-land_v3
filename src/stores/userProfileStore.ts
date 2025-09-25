import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { AIModel } from '../types/models';

export interface UserProfile {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  createdAt: Date;
  lastActiveAt: Date;
}

export interface UserPreferences {
  // Search preferences
  defaultSearchProviders: string[];
  defaultSearchCategories: string[];
  saveSearchHistory: boolean;
  maxSearchHistory: number;

  // Display preferences
  defaultViewMode: 'grid' | 'list' | 'compact';
  defaultItemsPerPage: number;
  defaultSortBy: 'name' | 'provider' | 'cost' | 'contextLength' | 'lastUpdated';
  defaultSortDirection: 'asc' | 'desc';

  // Notification preferences
  emailNotifications: boolean;
  pushNotifications: boolean;
  weeklyDigest: boolean;
  newModelAlerts: boolean;

  // Privacy preferences
  trackingEnabled: boolean;
  shareUsageData: boolean;
  publicProfile: boolean;

  // Advanced preferences
  comparisonAutoAdd: boolean;
  favoriteModelLimit: number;
  autoRefreshInterval: number;
  dataExportFormat: 'json' | 'csv' | 'xlsx';
}

export interface UserActivity {
  modelViews: Record<string, number>;
  searchQueries: Array<{
    query: string;
    timestamp: Date;
    resultsCount: number;
  }>;
  favoriteHistory: Array<{
    modelId: string;
    action: 'add' | 'remove';
    timestamp: Date;
  }>;
  sessionDuration: number;
  totalSessions: number;
  lastSessionStart: Date;
}

export interface UserRecommendations {
  suggestedModels: AIModel[];
  trendingModels: AIModel[];
  similarUserFavorites: AIModel[];
  lastUpdated: Date;
}

export interface UserState {
  // Profile
  profile: UserProfile | null;
  preferences: UserPreferences;
  activity: UserActivity;
  recommendations: UserRecommendations | null;

  // Session state
  isLoggedIn: boolean;
  sessionId: string | null;
  sessionStartTime: Date | null;

  // Comparison state
  comparisonModels: AIModel[];
  comparisonHistory: Array<{
    models: string[];
    timestamp: Date;
    name?: string;
  }>;

  // Export state
  exportHistory: Array<{
    format: string;
    modelCount: number;
    timestamp: Date;
    filters?: any;
  }>;
}

export interface UserActions {
  // Profile management
  createProfile: (name: string, email?: string) => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
  deleteProfile: () => void;

  // Preferences
  updatePreferences: (updates: Partial<UserPreferences>) => void;
  resetPreferences: () => void;
  exportPreferences: () => string;
  importPreferences: (data: string) => boolean;

  // Activity tracking
  trackModelView: (modelId: string) => void;
  trackSearch: (query: string, resultsCount: number) => void;
  trackFavoriteAction: (modelId: string, action: 'add' | 'remove') => void;
  startSession: () => void;
  endSession: () => void;

  // Comparison management
  addToComparison: (model: AIModel) => boolean;
  removeFromComparison: (modelId: string) => void;
  clearComparison: () => void;
  saveComparison: (name: string) => void;
  loadComparison: (comparisonId: string) => void;

  // Recommendations
  refreshRecommendations: () => Promise<void>;
  generateSuggestedModels: () => AIModel[];

  // Export functionality
  exportData: (format: 'json' | 'csv' | 'xlsx', filters?: any) => Promise<string>;
  trackExport: (format: string, modelCount: number, filters?: any) => void;

  // Session management
  login: (profile: UserProfile) => void;
  logout: () => void;

  // Cleanup
  clearActivity: () => void;
  resetStore: () => void;
}

export type UserStore = UserState & UserActions;

const defaultPreferences: UserPreferences = {
  // Search preferences
  defaultSearchProviders: [],
  defaultSearchCategories: [],
  saveSearchHistory: true,
  maxSearchHistory: 50,

  // Display preferences
  defaultViewMode: 'grid',
  defaultItemsPerPage: 24,
  defaultSortBy: 'name',
  defaultSortDirection: 'asc',

  // Notification preferences
  emailNotifications: false,
  pushNotifications: false,
  weeklyDigest: false,
  newModelAlerts: false,

  // Privacy preferences
  trackingEnabled: true,
  shareUsageData: false,
  publicProfile: false,

  // Advanced preferences
  comparisonAutoAdd: false,
  favoriteModelLimit: 50,
  autoRefreshInterval: 5 * 60 * 1000, // 5 minutes
  dataExportFormat: 'json'
};

const defaultActivity: UserActivity = {
  modelViews: {},
  searchQueries: [],
  favoriteHistory: [],
  sessionDuration: 0,
  totalSessions: 0,
  lastSessionStart: new Date()
};

const initialState: UserState = {
  profile: null,
  preferences: defaultPreferences,
  activity: defaultActivity,
  recommendations: null,
  isLoggedIn: false,
  sessionId: null,
  sessionStartTime: null,
  comparisonModels: [],
  comparisonHistory: [],
  exportHistory: []
};

export const useUserProfileStore = create<UserStore>()(
  devtools(
    persist(
      immer((set, get) => ({
        ...initialState,

        // Profile management
        createProfile: (name, email) => {
          const profile: UserProfile = {
            id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name,
            email,
            createdAt: new Date(),
            lastActiveAt: new Date()
          };

          set((draft) => {
            draft.profile = profile;
            draft.isLoggedIn = true;
            draft.sessionId = `session_${Date.now()}`;
            draft.sessionStartTime = new Date();
          });
        },

        updateProfile: (updates) => {
          set((draft) => {
            if (draft.profile) {
              Object.assign(draft.profile, updates);
              draft.profile.lastActiveAt = new Date();
            }
          });
        },

        deleteProfile: () => {
          set((draft) => {
            draft.profile = null;
            draft.isLoggedIn = false;
            draft.sessionId = null;
            draft.sessionStartTime = null;
            draft.activity = defaultActivity;
            draft.recommendations = null;
          });
        },

        // Preferences
        updatePreferences: (updates) => {
          set((draft) => {
            Object.assign(draft.preferences, updates);
          });
        },

        resetPreferences: () => {
          set((draft) => {
            draft.preferences = { ...defaultPreferences };
          });
        },

        exportPreferences: () => {
          const state = get();
          return JSON.stringify({
            preferences: state.preferences,
            profile: state.profile,
            exportedAt: new Date().toISOString()
          }, null, 2);
        },

        importPreferences: (data) => {
          try {
            const imported = JSON.parse(data);
            if (imported.preferences) {
              set((draft) => {
                draft.preferences = { ...defaultPreferences, ...imported.preferences };
              });
              return true;
            }
            return false;
          } catch {
            return false;
          }
        },

        // Activity tracking
        trackModelView: (modelId) => {
          if (!get().preferences.trackingEnabled) return;

          set((draft) => {
            draft.activity.modelViews[modelId] = (draft.activity.modelViews[modelId] || 0) + 1;
            if (draft.profile) {
              draft.profile.lastActiveAt = new Date();
            }
          });
        },

        trackSearch: (query, resultsCount) => {
          if (!get().preferences.trackingEnabled || !get().preferences.saveSearchHistory) return;

          set((draft) => {
            draft.activity.searchQueries.unshift({
              query,
              timestamp: new Date(),
              resultsCount
            });

            // Keep only the most recent searches
            if (draft.activity.searchQueries.length > draft.preferences.maxSearchHistory) {
              draft.activity.searchQueries = draft.activity.searchQueries.slice(0, draft.preferences.maxSearchHistory);
            }
          });
        },

        trackFavoriteAction: (modelId, action) => {
          if (!get().preferences.trackingEnabled) return;

          set((draft) => {
            draft.activity.favoriteHistory.unshift({
              modelId,
              action,
              timestamp: new Date()
            });

            // Keep last 100 favorite actions
            if (draft.activity.favoriteHistory.length > 100) {
              draft.activity.favoriteHistory = draft.activity.favoriteHistory.slice(0, 100);
            }
          });
        },

        startSession: () => {
          set((draft) => {
            draft.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            draft.sessionStartTime = new Date();
            draft.activity.totalSessions += 1;
            draft.activity.lastSessionStart = new Date();
          });
        },

        endSession: () => {
          const state = get();
          if (state.sessionStartTime) {
            const sessionDuration = Date.now() - state.sessionStartTime.getTime();

            set((draft) => {
              draft.activity.sessionDuration += sessionDuration;
              draft.sessionId = null;
              draft.sessionStartTime = null;
            });
          }
        },

        // Comparison management
        addToComparison: (model) => {
          const state = get();
          const maxModels = 4; // Comparison limit

          if (state.comparisonModels.length >= maxModels) {
            return false;
          }

          if (state.comparisonModels.some(m => m.id === model.id)) {
            return false; // Already in comparison
          }

          set((draft) => {
            draft.comparisonModels.push(model);
          });

          return true;
        },

        removeFromComparison: (modelId) => {
          set((draft) => {
            draft.comparisonModels = draft.comparisonModels.filter(m => m.id !== modelId);
          });
        },

        clearComparison: () => {
          set((draft) => {
            draft.comparisonModels = [];
          });
        },

        saveComparison: (name) => {
          const state = get();
          if (state.comparisonModels.length === 0) return;

          set((draft) => {
            draft.comparisonHistory.unshift({
              models: draft.comparisonModels.map(m => m.id),
              timestamp: new Date(),
              name
            });

            // Keep last 20 comparisons
            if (draft.comparisonHistory.length > 20) {
              draft.comparisonHistory = draft.comparisonHistory.slice(0, 20);
            }
          });
        },

        loadComparison: (comparisonId) => {
          // Implementation would load from comparisonHistory
          console.log('Loading comparison:', comparisonId);
        },

        // Recommendations
        refreshRecommendations: async () => {
          const state = get();
          const suggestedModels = get().generateSuggestedModels();

          set((draft) => {
            draft.recommendations = {
              suggestedModels,
              trendingModels: [], // Would come from API
              similarUserFavorites: [], // Would come from API
              lastUpdated: new Date()
            };
          });
        },

        generateSuggestedModels: () => {
          // Simple recommendation algorithm based on user activity
          const state = get();
          const viewedModels = Object.keys(state.activity.modelViews);
          const recentSearches = state.activity.searchQueries.slice(0, 10);

          // This would be more sophisticated in a real implementation
          return []; // Placeholder
        },

        // Export functionality
        exportData: async (format, filters) => {
          const state = get();
          get().trackExport(format, 0, filters); // Model count would be calculated

          // Implementation would generate actual export data
          const exportData = {
            exportedAt: new Date().toISOString(),
            format,
            filters,
            userProfile: state.profile?.name,
            data: [] // Would contain actual model data
          };

          return JSON.stringify(exportData, null, 2);
        },

        trackExport: (format, modelCount, filters) => {
          set((draft) => {
            draft.exportHistory.unshift({
              format,
              modelCount,
              timestamp: new Date(),
              filters
            });

            // Keep last 50 exports
            if (draft.exportHistory.length > 50) {
              draft.exportHistory = draft.exportHistory.slice(0, 50);
            }
          });
        },

        // Session management
        login: (profile) => {
          set((draft) => {
            draft.profile = profile;
            draft.isLoggedIn = true;
            draft.sessionId = `session_${Date.now()}`;
            draft.sessionStartTime = new Date();
          });
        },

        logout: () => {
          get().endSession();
          set((draft) => {
            draft.isLoggedIn = false;
            draft.sessionId = null;
            draft.sessionStartTime = null;
          });
        },

        // Cleanup
        clearActivity: () => {
          set((draft) => {
            draft.activity = { ...defaultActivity };
          });
        },

        resetStore: () => {
          set(initialState);
        }
      })),
      {
        name: 'user-profile-store',
        partialize: (state) => ({
          profile: state.profile,
          preferences: state.preferences,
          activity: state.activity,
          comparisonHistory: state.comparisonHistory,
          exportHistory: state.exportHistory
        }),
        onRehydrateStorage: () => (state) => {
          if (state?.profile) {
            // Auto-start session for returning users
            state.startSession();
          }
        }
      }
    ),
    {
      name: 'user-profile-store'
    }
  )
);

// Selectors for user profile store
export const userProfileSelectors = {
  // Get user stats
  getUserStats: (state: UserStore) => {
    const totalModelViews = Object.values(state.activity.modelViews).reduce((sum, count) => sum + count, 0);
    const uniqueModelsViewed = Object.keys(state.activity.modelViews).length;
    const totalSearches = state.activity.searchQueries.length;
    const averageSessionDuration = state.activity.totalSessions > 0
      ? state.activity.sessionDuration / state.activity.totalSessions
      : 0;

    return {
      totalModelViews,
      uniqueModelsViewed,
      totalSearches,
      totalSessions: state.activity.totalSessions,
      averageSessionDuration,
      favoriteActionsCount: state.activity.favoriteHistory.length,
      comparisonCount: state.comparisonModels.length,
      exportCount: state.exportHistory.length
    };
  },

  // Get recent activity
  getRecentActivity: (state: UserStore) => ({
    recentSearches: state.activity.searchQueries.slice(0, 5),
    recentFavorites: state.activity.favoriteHistory.slice(0, 5),
    recentExports: state.exportHistory.slice(0, 3),
    currentSession: {
      sessionId: state.sessionId,
      startTime: state.sessionStartTime,
      isActive: !!state.sessionId
    }
  }),

  // Get privacy settings
  getPrivacySettings: (state: UserStore) => ({
    trackingEnabled: state.preferences.trackingEnabled,
    shareUsageData: state.preferences.shareUsageData,
    publicProfile: state.preferences.publicProfile,
    saveSearchHistory: state.preferences.saveSearchHistory
  }),

  // Get notification preferences
  getNotificationPreferences: (state: UserStore) => ({
    emailNotifications: state.preferences.emailNotifications,
    pushNotifications: state.preferences.pushNotifications,
    weeklyDigest: state.preferences.weeklyDigest,
    newModelAlerts: state.preferences.newModelAlerts
  })
};

export default useUserProfileStore;