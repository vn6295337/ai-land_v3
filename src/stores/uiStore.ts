import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { ViewMode } from '../types/models';

export type Theme = 'light' | 'dark' | 'system';
export type SidebarState = 'expanded' | 'collapsed' | 'hidden';

export interface UIState {
  // View preferences
  viewMode: ViewMode;
  theme: Theme;
  sidebarState: SidebarState;

  // Layout
  showFilters: boolean;
  showKPIs: boolean;
  showQuickViews: boolean;
  compactHeader: boolean;

  // Mobile specific
  isMobile: boolean;
  showMobileFilters: boolean;
  showMobileMenu: boolean;

  // Modals and overlays
  selectedModelId: string | null;
  showModelDetails: boolean;
  showSettings: boolean;
  showExportDialog: boolean;

  // Loading and feedback
  showToast: boolean;
  toastMessage: string;
  toastType: 'success' | 'error' | 'warning' | 'info';

  // Accessibility
  reducedMotion: boolean;
  highContrast: boolean;
  focusVisible: boolean;

  // Performance
  enableVirtualization: boolean;
  enableAnimations: boolean;

  // User preferences
  autoSave: boolean;
  notifications: boolean;
  analytics: boolean;
}

export interface UIActions {
  // View mode
  setViewMode: (mode: ViewMode) => void;
  toggleViewMode: () => void;

  // Theme
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  applySystemTheme: () => void;

  // Sidebar
  setSidebarState: (state: SidebarState) => void;
  toggleSidebar: () => void;
  collapseSidebar: () => void;
  expandSidebar: () => void;

  // Layout toggles
  toggleFilters: () => void;
  toggleKPIs: () => void;
  toggleQuickViews: () => void;
  toggleCompactHeader: () => void;

  // Mobile UI
  setMobile: (isMobile: boolean) => void;
  toggleMobileFilters: () => void;
  toggleMobileMenu: () => void;
  closeMobileOverlays: () => void;

  // Model details
  openModelDetails: (modelId: string) => void;
  closeModelDetails: () => void;
  selectModel: (modelId: string | null) => void;

  // Modals
  openSettings: () => void;
  closeSettings: () => void;
  openExportDialog: () => void;
  closeExportDialog: () => void;
  closeAllModals: () => void;

  // Toast notifications
  showToastMessage: (message: string, type?: UIState['toastType']) => void;
  hideToast: () => void;

  // Accessibility
  setReducedMotion: (enabled: boolean) => void;
  setHighContrast: (enabled: boolean) => void;
  setFocusVisible: (visible: boolean) => void;
  detectAccessibilityPreferences: () => void;

  // Performance
  setVirtualization: (enabled: boolean) => void;
  setAnimations: (enabled: boolean) => void;

  // User preferences
  setAutoSave: (enabled: boolean) => void;
  setNotifications: (enabled: boolean) => void;
  setAnalytics: (enabled: boolean) => void;

  // Bulk operations
  resetUI: () => void;
  resetLayout: () => void;
  resetPreferences: () => void;
}

export type UIStore = UIState & UIActions;

const initialState: UIState = {
  // View preferences
  viewMode: 'table',
  theme: 'system',
  sidebarState: 'expanded',

  // Layout
  showFilters: false,
  showKPIs: true,
  showQuickViews: true,
  compactHeader: false,

  // Mobile specific
  isMobile: false,
  showMobileFilters: false,
  showMobileMenu: false,

  // Modals and overlays
  selectedModelId: null,
  showModelDetails: false,
  showSettings: false,
  showExportDialog: false,

  // Loading and feedback
  showToast: false,
  toastMessage: '',
  toastType: 'info',

  // Accessibility
  reducedMotion: false,
  highContrast: false,
  focusVisible: false,

  // Performance
  enableVirtualization: true,
  enableAnimations: true,

  // User preferences
  autoSave: true,
  notifications: true,
  analytics: false
};

// Helper functions
const applyThemeToDocument = (theme: Theme) => {
  const root = document.documentElement;

  if (theme === 'system') {
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    root.classList.toggle('dark', systemTheme === 'dark');
  } else {
    root.classList.toggle('dark', theme === 'dark');
  }
};

const detectSystemPreferences = () => {
  return {
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    highContrast: window.matchMedia('(prefers-contrast: high)').matches,
    darkMode: window.matchMedia('(prefers-color-scheme: dark)').matches
  };
};

export const useUIStore = create<UIStore>()(
  devtools(
    persist(
      immer((set, get) => ({
        ...initialState,

        // View mode
        setViewMode: (mode) => {
          set((draft) => {
            draft.viewMode = mode;
          });
        },

        toggleViewMode: () => {
          const state = get();
          const modes: ViewMode[] = ['table', 'grid', 'list', 'compact'];
          const currentIndex = modes.indexOf(state.viewMode);
          const nextIndex = (currentIndex + 1) % modes.length;
          get().setViewMode(modes[nextIndex]);
        },

        // Theme
        setTheme: (theme) => {
          set((draft) => {
            draft.theme = theme;
          });
          applyThemeToDocument(theme);
        },

        toggleTheme: () => {
          const state = get();
          const nextTheme = state.theme === 'light' ? 'dark' : 'light';
          get().setTheme(nextTheme);
        },

        applySystemTheme: () => {
          get().setTheme('system');
        },

        // Sidebar
        setSidebarState: (sidebarState) => {
          set((draft) => {
            draft.sidebarState = sidebarState;
          });
        },

        toggleSidebar: () => {
          const state = get();
          const nextState = state.sidebarState === 'expanded' ? 'collapsed' : 'expanded';
          get().setSidebarState(nextState);
        },

        collapseSidebar: () => {
          get().setSidebarState('collapsed');
        },

        expandSidebar: () => {
          get().setSidebarState('expanded');
        },

        // Layout toggles
        toggleFilters: () => {
          set((draft) => {
            draft.showFilters = !draft.showFilters;
          });
        },

        toggleKPIs: () => {
          set((draft) => {
            draft.showKPIs = !draft.showKPIs;
          });
        },

        toggleQuickViews: () => {
          set((draft) => {
            draft.showQuickViews = !draft.showQuickViews;
          });
        },

        toggleCompactHeader: () => {
          set((draft) => {
            draft.compactHeader = !draft.compactHeader;
          });
        },

        // Mobile UI
        setMobile: (isMobile) => {
          set((draft) => {
            draft.isMobile = isMobile;
            // Auto-adjust layout for mobile
            if (isMobile) {
              draft.sidebarState = 'hidden';
              draft.compactHeader = true;
            }
          });
        },

        toggleMobileFilters: () => {
          set((draft) => {
            draft.showMobileFilters = !draft.showMobileFilters;
            // Close other mobile overlays
            if (draft.showMobileFilters) {
              draft.showMobileMenu = false;
            }
          });
        },

        toggleMobileMenu: () => {
          set((draft) => {
            draft.showMobileMenu = !draft.showMobileMenu;
            // Close other mobile overlays
            if (draft.showMobileMenu) {
              draft.showMobileFilters = false;
            }
          });
        },

        closeMobileOverlays: () => {
          set((draft) => {
            draft.showMobileFilters = false;
            draft.showMobileMenu = false;
          });
        },

        // Model details
        openModelDetails: (modelId) => {
          set((draft) => {
            draft.selectedModelId = modelId;
            draft.showModelDetails = true;
          });
        },

        closeModelDetails: () => {
          set((draft) => {
            draft.showModelDetails = false;
            draft.selectedModelId = null;
          });
        },

        selectModel: (modelId) => {
          set((draft) => {
            draft.selectedModelId = modelId;
          });
        },

        // Modals
        openSettings: () => {
          set((draft) => {
            draft.showSettings = true;
          });
        },

        closeSettings: () => {
          set((draft) => {
            draft.showSettings = false;
          });
        },

        openExportDialog: () => {
          set((draft) => {
            draft.showExportDialog = true;
          });
        },

        closeExportDialog: () => {
          set((draft) => {
            draft.showExportDialog = false;
          });
        },

        closeAllModals: () => {
          set((draft) => {
            draft.showModelDetails = false;
            draft.showSettings = false;
            draft.showExportDialog = false;
            draft.selectedModelId = null;
          });
        },

        // Toast notifications
        showToastMessage: (message, type = 'info') => {
          set((draft) => {
            draft.showToast = true;
            draft.toastMessage = message;
            draft.toastType = type;
          });

          // Auto-hide after 5 seconds
          setTimeout(() => {
            get().hideToast();
          }, 5000);
        },

        hideToast: () => {
          set((draft) => {
            draft.showToast = false;
            draft.toastMessage = '';
          });
        },

        // Accessibility
        setReducedMotion: (enabled) => {
          set((draft) => {
            draft.reducedMotion = enabled;
            draft.enableAnimations = !enabled; // Disable animations if reduced motion is preferred
          });

          // Apply to document
          document.documentElement.style.setProperty(
            '--animation-duration',
            enabled ? '0s' : '0.2s'
          );
        },

        setHighContrast: (enabled) => {
          set((draft) => {
            draft.highContrast = enabled;
          });

          document.documentElement.classList.toggle('high-contrast', enabled);
        },

        setFocusVisible: (visible) => {
          set((draft) => {
            draft.focusVisible = visible;
          });
        },

        detectAccessibilityPreferences: () => {
          const prefs = detectSystemPreferences();

          set((draft) => {
            draft.reducedMotion = prefs.reducedMotion;
            draft.highContrast = prefs.highContrast;
          });

          // Apply detected preferences
          get().setReducedMotion(prefs.reducedMotion);
          get().setHighContrast(prefs.highContrast);
        },

        // Performance
        setVirtualization: (enabled) => {
          set((draft) => {
            draft.enableVirtualization = enabled;
          });
        },

        setAnimations: (enabled) => {
          set((draft) => {
            draft.enableAnimations = enabled;
          });
        },

        // User preferences
        setAutoSave: (enabled) => {
          set((draft) => {
            draft.autoSave = enabled;
          });
        },

        setNotifications: (enabled) => {
          set((draft) => {
            draft.notifications = enabled;
          });
        },

        setAnalytics: (enabled) => {
          set((draft) => {
            draft.analytics = enabled;
          });
        },

        // Bulk operations
        resetUI: () => {
          set(initialState);
          applyThemeToDocument(initialState.theme);
        },

        resetLayout: () => {
          set((draft) => {
            draft.viewMode = initialState.viewMode;
            draft.sidebarState = initialState.sidebarState;
            draft.showFilters = initialState.showFilters;
            draft.showKPIs = initialState.showKPIs;
            draft.showQuickViews = initialState.showQuickViews;
            draft.compactHeader = initialState.compactHeader;
          });
        },

        resetPreferences: () => {
          set((draft) => {
            draft.theme = initialState.theme;
            draft.autoSave = initialState.autoSave;
            draft.notifications = initialState.notifications;
            draft.analytics = initialState.analytics;
            draft.enableVirtualization = initialState.enableVirtualization;
            draft.enableAnimations = initialState.enableAnimations;
          });
          applyThemeToDocument(initialState.theme);
        }
      })),
      {
        name: 'ui-store',
        partialize: (state) => ({
          // Persist only user preferences, not runtime state
          viewMode: state.viewMode,
          theme: state.theme,
          sidebarState: state.sidebarState,
          showFilters: state.showFilters,
          showKPIs: state.showKPIs,
          showQuickViews: state.showQuickViews,
          compactHeader: state.compactHeader,
          reducedMotion: state.reducedMotion,
          highContrast: state.highContrast,
          enableVirtualization: state.enableVirtualization,
          enableAnimations: state.enableAnimations,
          autoSave: state.autoSave,
          notifications: state.notifications,
          analytics: state.analytics
        }),
        onRehydrateStorage: () => (state) => {
          if (state) {
            // Apply theme after rehydration
            applyThemeToDocument(state.theme);

            // Detect system preferences if not already set
            setTimeout(() => {
              state.detectAccessibilityPreferences?.();
            }, 100);
          }
        }
      }
    ),
    {
      name: 'ui-store'
    }
  )
);

// Selectors for commonly used UI state
export const uiSelectors = {
  // Get modal state
  getModalState: (state: UIStore) => ({
    hasOpenModal: state.showModelDetails || state.showSettings || state.showExportDialog,
    modelDetailsOpen: state.showModelDetails,
    settingsOpen: state.showSettings,
    exportDialogOpen: state.showExportDialog,
    selectedModelId: state.selectedModelId
  }),

  // Get mobile state
  getMobileState: (state: UIStore) => ({
    isMobile: state.isMobile,
    hasOpenOverlay: state.showMobileFilters || state.showMobileMenu,
    filtersOpen: state.showMobileFilters,
    menuOpen: state.showMobileMenu
  }),

  // Get theme info
  getThemeInfo: (state: UIStore) => {
    const isDarkMode = state.theme === 'dark' ||
      (state.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    return {
      theme: state.theme,
      isDarkMode,
      isSystemTheme: state.theme === 'system',
      highContrast: state.highContrast
    };
  },

  // Get accessibility state
  getAccessibilityState: (state: UIStore) => ({
    reducedMotion: state.reducedMotion,
    highContrast: state.highContrast,
    focusVisible: state.focusVisible,
    animationsEnabled: state.enableAnimations && !state.reducedMotion
  }),

  // Get layout state
  getLayoutState: (state: UIStore) => ({
    viewMode: state.viewMode,
    sidebarState: state.sidebarState,
    showFilters: state.showFilters,
    showKPIs: state.showKPIs,
    showQuickViews: state.showQuickViews,
    compactHeader: state.compactHeader,
    sidebarExpanded: state.sidebarState === 'expanded',
    sidebarVisible: state.sidebarState !== 'hidden'
  })
};

export default useUIStore;