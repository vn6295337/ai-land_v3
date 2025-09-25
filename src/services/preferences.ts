/**
 * Preferences Service
 *
 * This module manages user preferences with persistence,
 * validation, and synchronization capabilities.
 */

import { UserPreferences, ViewMode, SortOptions, SortDirection, FilterCriteria } from '../types/models';
import { LocalStorageService, createLocalStorageService } from './storage';

/**
 * Default user preferences
 */
const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'system',
  viewMode: 'grid',
  defaultSort: 'name',
  defaultDirection: 'asc',
  favoritesOnly: false,
  favoriteModels: [],
  itemsPerPage: 24,
  autoRefreshInterval: 5,
  showDetailedMetrics: true,
  accessibility: {
    reducedMotion: false,
    highContrast: false,
    screenReader: false
  }
};

/**
 * Preferences validation rules
 */
interface PreferencesValidation {
  theme: Array<'light' | 'dark' | 'system'>;
  viewMode: ViewMode[];
  defaultSort: SortOptions[];
  defaultDirection: SortDirection[];
  itemsPerPage: { min: number; max: number };
  autoRefreshInterval: { min: number; max: number };
}

const VALIDATION_RULES: PreferencesValidation = {
  theme: ['light', 'dark', 'system'],
  viewMode: ['grid', 'list', 'compact', 'table'],
  defaultSort: ['name', 'provider', 'category', 'accuracy', 'speed', 'cost', 'popularity', 'parameters', 'releaseDate', 'updatedAt'],
  defaultDirection: ['asc', 'desc'],
  itemsPerPage: { min: 12, max: 100 },
  autoRefreshInterval: { min: 1, max: 60 }
};

/**
 * Preferences change event
 */
interface PreferencesChangeEvent {
  key: keyof UserPreferences;
  oldValue: unknown;
  newValue: unknown;
  timestamp: number;
}

/**
 * PreferencesService class
 */
export class PreferencesService {
  private storage: LocalStorageService;
  private preferences: UserPreferences;
  private listeners: Array<(event: PreferencesChangeEvent) => void> = [];
  private readonly storageKey = 'user_preferences';

  constructor(storage?: LocalStorageService) {
    this.storage = storage || createLocalStorageService('prefs_');
    this.preferences = this.loadPreferences();
  }

  /**
   * Get all preferences
   */
  getPreferences(): UserPreferences {
    return { ...this.preferences };
  }

  /**
   * Get a specific preference value
   */
  get<K extends keyof UserPreferences>(key: K): UserPreferences[K] {
    return this.preferences[key];
  }

  /**
   * Set a specific preference value
   */
  set<K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ): boolean {
    try {
      // Validate the new value
      if (!this.validatePreference(key, value)) {
        console.error(`Invalid preference value for ${key}:`, value);
        return false;
      }

      const oldValue = this.preferences[key];

      // Update preference
      this.preferences[key] = value;

      // Save to storage
      const saved = this.savePreferences();

      if (saved) {
        // Notify listeners
        this.notifyChange({ key, oldValue, newValue: value, timestamp: Date.now() });
      }

      return saved;
    } catch (error) {
      console.error('Error setting preference:', error);
      return false;
    }
  }

  /**
   * Update multiple preferences at once
   */
  update(updates: Partial<UserPreferences>): boolean {
    try {
      const changes: PreferencesChangeEvent[] = [];

      // Validate all changes first
      for (const [key, value] of Object.entries(updates)) {
        if (!this.validatePreference(key as keyof UserPreferences, value)) {
          console.error(`Invalid preference value for ${key}:`, value);
          return false;
        }
      }

      // Apply all changes
      for (const [key, value] of Object.entries(updates)) {
        const typedKey = key as keyof UserPreferences;
        const oldValue = this.preferences[typedKey];

        this.preferences[typedKey] = value as any;

        changes.push({
          key: typedKey,
          oldValue,
          newValue: value,
          timestamp: Date.now()
        });
      }

      // Save to storage
      const saved = this.savePreferences();

      if (saved) {
        // Notify listeners about all changes
        changes.forEach(change => this.notifyChange(change));
      }

      return saved;
    } catch (error) {
      console.error('Error updating preferences:', error);
      return false;
    }
  }

  /**
   * Reset preferences to defaults
   */
  reset(): boolean {
    try {
      const oldPreferences = { ...this.preferences };
      this.preferences = { ...DEFAULT_PREFERENCES };

      const saved = this.savePreferences();

      if (saved) {
        // Notify about reset
        Object.keys(DEFAULT_PREFERENCES).forEach(key => {
          const typedKey = key as keyof UserPreferences;
          this.notifyChange({
            key: typedKey,
            oldValue: oldPreferences[typedKey],
            newValue: this.preferences[typedKey],
            timestamp: Date.now()
          });
        });
      }

      return saved;
    } catch (error) {
      console.error('Error resetting preferences:', error);
      return false;
    }
  }

  /**
   * Add a model to favorites
   */
  addToFavorites(modelId: string): boolean {
    const currentFavorites = [...this.preferences.favoriteModels];

    if (!currentFavorites.includes(modelId)) {
      currentFavorites.push(modelId);
      return this.set('favoriteModels', currentFavorites);
    }

    return true; // Already in favorites
  }

  /**
   * Remove a model from favorites
   */
  removeFromFavorites(modelId: string): boolean {
    const currentFavorites = this.preferences.favoriteModels.filter(
      id => id !== modelId
    );

    return this.set('favoriteModels', currentFavorites);
  }

  /**
   * Toggle favorite status for a model
   */
  toggleFavorite(modelId: string): boolean {
    const isFavorite = this.preferences.favoriteModels.includes(modelId);

    return isFavorite
      ? this.removeFromFavorites(modelId)
      : this.addToFavorites(modelId);
  }

  /**
   * Check if a model is favorited
   */
  isFavorite(modelId: string): boolean {
    return this.preferences.favoriteModels.includes(modelId);
  }

  /**
   * Set default filters
   */
  setDefaultFilters(filters: Partial<FilterCriteria>): boolean {
    return this.set('defaultFilters', filters);
  }

  /**
   * Get default filters
   */
  getDefaultFilters(): Partial<FilterCriteria> {
    return this.preferences.defaultFilters || {};
  }

  /**
   * Subscribe to preference changes
   */
  subscribe(listener: (event: PreferencesChangeEvent) => void): () => void {
    this.listeners.push(listener);

    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Export preferences as JSON
   */
  export(): string {
    return JSON.stringify(this.preferences, null, 2);
  }

  /**
   * Import preferences from JSON
   */
  import(preferencesJson: string): boolean {
    try {
      const imported = JSON.parse(preferencesJson);

      // Validate imported preferences
      if (!this.validateFullPreferences(imported)) {
        console.error('Invalid preferences format');
        return false;
      }

      // Merge with defaults to ensure all required fields are present
      const mergedPreferences = { ...DEFAULT_PREFERENCES, ...imported };

      const oldPreferences = { ...this.preferences };
      this.preferences = mergedPreferences;

      const saved = this.savePreferences();

      if (saved) {
        // Notify about all changes
        Object.keys(this.preferences).forEach(key => {
          const typedKey = key as keyof UserPreferences;
          const oldValue = oldPreferences[typedKey];
          const newValue = this.preferences[typedKey];

          if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
            this.notifyChange({
              key: typedKey,
              oldValue,
              newValue,
              timestamp: Date.now()
            });
          }
        });
      }

      return saved;
    } catch (error) {
      console.error('Error importing preferences:', error);
      return false;
    }
  }

  /**
   * Get preferences summary for debugging
   */
  getSummary(): {
    totalFavorites: number;
    theme: string;
    viewMode: string;
    autoRefresh: boolean;
    accessibility: boolean;
  } {
    return {
      totalFavorites: this.preferences.favoriteModels.length,
      theme: this.preferences.theme,
      viewMode: this.preferences.viewMode,
      autoRefresh: this.preferences.autoRefreshInterval > 0,
      accessibility: Boolean(
        this.preferences.accessibility?.reducedMotion ||
        this.preferences.accessibility?.highContrast ||
        this.preferences.accessibility?.screenReader
      )
    };
  }

  /**
   * Load preferences from storage
   */
  private loadPreferences(): UserPreferences {
    try {
      const stored = this.storage.get<UserPreferences>(this.storageKey);

      if (stored && this.validateFullPreferences(stored)) {
        // Merge with defaults to ensure new preference fields are added
        return { ...DEFAULT_PREFERENCES, ...stored };
      }

      return { ...DEFAULT_PREFERENCES };
    } catch (error) {
      console.error('Error loading preferences:', error);
      return { ...DEFAULT_PREFERENCES };
    }
  }

  /**
   * Save preferences to storage
   */
  private savePreferences(): boolean {
    try {
      return this.storage.set(this.storageKey, this.preferences);
    } catch (error) {
      console.error('Error saving preferences:', error);
      return false;
    }
  }

  /**
   * Validate a single preference
   */
  private validatePreference(key: keyof UserPreferences, value: unknown): boolean {
    switch (key) {
      case 'theme':
        return VALIDATION_RULES.theme.includes(value as any);

      case 'viewMode':
        return VALIDATION_RULES.viewMode.includes(value as ViewMode);

      case 'defaultSort':
        return VALIDATION_RULES.defaultSort.includes(value as SortOptions);

      case 'defaultDirection':
        return VALIDATION_RULES.defaultDirection.includes(value as SortDirection);

      case 'favoritesOnly':
        return typeof value === 'boolean';

      case 'favoriteModels':
        return Array.isArray(value) && value.every(id => typeof id === 'string');

      case 'itemsPerPage':
        return typeof value === 'number' &&
               value >= VALIDATION_RULES.itemsPerPage.min &&
               value <= VALIDATION_RULES.itemsPerPage.max;

      case 'autoRefreshInterval':
        return typeof value === 'number' &&
               value >= VALIDATION_RULES.autoRefreshInterval.min &&
               value <= VALIDATION_RULES.autoRefreshInterval.max;

      case 'showDetailedMetrics':
        return typeof value === 'boolean';

      case 'defaultFilters':
        return typeof value === 'object' && value !== null;

      case 'accessibility':
        return typeof value === 'object' && value !== null;

      default:
        return true;
    }
  }

  /**
   * Validate complete preferences object
   */
  private validateFullPreferences(prefs: unknown): prefs is UserPreferences {
    return typeof prefs === 'object' && prefs !== null;
  }

  /**
   * Notify listeners about preference changes
   */
  private notifyChange(event: PreferencesChangeEvent): void {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in preferences change listener:', error);
      }
    });
  }
}

/**
 * Create PreferencesService instance
 */
export const createPreferencesService = (storage?: LocalStorageService): PreferencesService => {
  return new PreferencesService(storage);
};

/**
 * Default PreferencesService instance
 */
export const preferencesService = createPreferencesService();