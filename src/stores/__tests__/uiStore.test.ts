import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUIStore, uiSelectors } from '../uiStore';

// Mock DOM APIs
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock document APIs
Object.defineProperty(document, 'documentElement', {
  writable: true,
  value: {
    classList: {
      toggle: vi.fn(),
      add: vi.fn(),
      remove: vi.fn(),
      contains: vi.fn()
    },
    style: {
      setProperty: vi.fn()
    }
  }
});

describe('UIStore', () => {
  beforeEach(() => {
    // Reset store before each test
    const { result } = renderHook(() => useUIStore());
    act(() => {
      result.current.resetUI();
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useUIStore());

      expect(result.current.viewMode).toBe('grid');
      expect(result.current.theme).toBe('system');
      expect(result.current.sidebarState).toBe('expanded');
      expect(result.current.showFilters).toBe(false);
      expect(result.current.showKPIs).toBe(true);
      expect(result.current.showQuickViews).toBe(true);
      expect(result.current.isMobile).toBe(false);
      expect(result.current.selectedModelId).toBe(null);
      expect(result.current.showToast).toBe(false);
      expect(result.current.enableVirtualization).toBe(true);
      expect(result.current.enableAnimations).toBe(true);
    });
  });

  describe('View Mode Management', () => {
    it('should set view mode correctly', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.setViewMode('list');
      });

      expect(result.current.viewMode).toBe('list');
    });

    it('should toggle view mode correctly', () => {
      const { result } = renderHook(() => useUIStore());

      // Initial: grid -> list
      act(() => {
        result.current.toggleViewMode();
      });
      expect(result.current.viewMode).toBe('list');

      // list -> compact
      act(() => {
        result.current.toggleViewMode();
      });
      expect(result.current.viewMode).toBe('compact');

      // compact -> grid (cycling back)
      act(() => {
        result.current.toggleViewMode();
      });
      expect(result.current.viewMode).toBe('grid');
    });
  });

  describe('Theme Management', () => {
    it('should set theme correctly', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.setTheme('dark');
      });

      expect(result.current.theme).toBe('dark');
      expect(document.documentElement.classList.toggle).toHaveBeenCalledWith('dark', true);
    });

    it('should toggle theme correctly', () => {
      const { result } = renderHook(() => useUIStore());

      // Start with light theme
      act(() => {
        result.current.setTheme('light');
      });

      act(() => {
        result.current.toggleTheme();
      });

      expect(result.current.theme).toBe('dark');

      act(() => {
        result.current.toggleTheme();
      });

      expect(result.current.theme).toBe('light');
    });

    it('should apply system theme correctly', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.applySystemTheme();
      });

      expect(result.current.theme).toBe('system');
    });

    it('should handle system theme with dark preference', () => {
      // Mock dark mode preference
      window.matchMedia = vi.fn().mockImplementation(query => ({
        matches: query === '(prefers-color-scheme: dark)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.setTheme('system');
      });

      expect(result.current.theme).toBe('system');
      expect(document.documentElement.classList.toggle).toHaveBeenCalledWith('dark', true);
    });
  });

  describe('Sidebar Management', () => {
    it('should set sidebar state correctly', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.setSidebarState('collapsed');
      });

      expect(result.current.sidebarState).toBe('collapsed');
    });

    it('should toggle sidebar correctly', () => {
      const { result } = renderHook(() => useUIStore());

      // Start expanded, toggle to collapsed
      act(() => {
        result.current.toggleSidebar();
      });
      expect(result.current.sidebarState).toBe('collapsed');

      // Toggle back to expanded
      act(() => {
        result.current.toggleSidebar();
      });
      expect(result.current.sidebarState).toBe('expanded');
    });

    it('should collapse and expand sidebar directly', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.collapseSidebar();
      });
      expect(result.current.sidebarState).toBe('collapsed');

      act(() => {
        result.current.expandSidebar();
      });
      expect(result.current.sidebarState).toBe('expanded');
    });
  });

  describe('Layout Toggles', () => {
    it('should toggle filters correctly', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.toggleFilters();
      });
      expect(result.current.showFilters).toBe(true);

      act(() => {
        result.current.toggleFilters();
      });
      expect(result.current.showFilters).toBe(false);
    });

    it('should toggle KPIs correctly', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.toggleKPIs();
      });
      expect(result.current.showKPIs).toBe(false);

      act(() => {
        result.current.toggleKPIs();
      });
      expect(result.current.showKPIs).toBe(true);
    });

    it('should toggle quick views correctly', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.toggleQuickViews();
      });
      expect(result.current.showQuickViews).toBe(false);

      act(() => {
        result.current.toggleQuickViews();
      });
      expect(result.current.showQuickViews).toBe(true);
    });

    it('should toggle compact header correctly', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.toggleCompactHeader();
      });
      expect(result.current.compactHeader).toBe(true);
    });
  });

  describe('Mobile UI Management', () => {
    it('should set mobile state correctly', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.setMobile(true);
      });

      expect(result.current.isMobile).toBe(true);
      expect(result.current.sidebarState).toBe('hidden');
      expect(result.current.compactHeader).toBe(true);
    });

    it('should toggle mobile filters correctly', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.toggleMobileFilters();
      });

      expect(result.current.showMobileFilters).toBe(true);
      expect(result.current.showMobileMenu).toBe(false); // Should close menu
    });

    it('should toggle mobile menu correctly', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.toggleMobileMenu();
      });

      expect(result.current.showMobileMenu).toBe(true);
      expect(result.current.showMobileFilters).toBe(false); // Should close filters
    });

    it('should close mobile overlays correctly', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.showMobileFilters = true;
        result.current.showMobileMenu = true;
        result.current.closeMobileOverlays();
      });

      expect(result.current.showMobileFilters).toBe(false);
      expect(result.current.showMobileMenu).toBe(false);
    });
  });

  describe('Model Details Management', () => {
    it('should open model details correctly', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.openModelDetails('model-123');
      });

      expect(result.current.selectedModelId).toBe('model-123');
      expect(result.current.showModelDetails).toBe(true);
    });

    it('should close model details correctly', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.openModelDetails('model-123');
        result.current.closeModelDetails();
      });

      expect(result.current.selectedModelId).toBe(null);
      expect(result.current.showModelDetails).toBe(false);
    });

    it('should select model correctly', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.selectModel('model-456');
      });

      expect(result.current.selectedModelId).toBe('model-456');
    });
  });

  describe('Modal Management', () => {
    it('should open and close settings modal', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.openSettings();
      });
      expect(result.current.showSettings).toBe(true);

      act(() => {
        result.current.closeSettings();
      });
      expect(result.current.showSettings).toBe(false);
    });

    it('should open and close export dialog', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.openExportDialog();
      });
      expect(result.current.showExportDialog).toBe(true);

      act(() => {
        result.current.closeExportDialog();
      });
      expect(result.current.showExportDialog).toBe(false);
    });

    it('should close all modals correctly', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.openSettings();
        result.current.openExportDialog();
        result.current.openModelDetails('model-123');
        result.current.closeAllModals();
      });

      expect(result.current.showSettings).toBe(false);
      expect(result.current.showExportDialog).toBe(false);
      expect(result.current.showModelDetails).toBe(false);
      expect(result.current.selectedModelId).toBe(null);
    });
  });

  describe('Toast Notifications', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should show toast message correctly', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.showToastMessage('Test message', 'success');
      });

      expect(result.current.showToast).toBe(true);
      expect(result.current.toastMessage).toBe('Test message');
      expect(result.current.toastType).toBe('success');
    });

    it('should auto-hide toast after timeout', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.showToastMessage('Test message');
      });

      expect(result.current.showToast).toBe(true);

      // Fast forward time
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(result.current.showToast).toBe(false);
    });

    it('should hide toast manually', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.showToastMessage('Test message');
        result.current.hideToast();
      });

      expect(result.current.showToast).toBe(false);
      expect(result.current.toastMessage).toBe('');
    });
  });

  describe('Accessibility Settings', () => {
    it('should set reduced motion correctly', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.setReducedMotion(true);
      });

      expect(result.current.reducedMotion).toBe(true);
      expect(result.current.enableAnimations).toBe(false); // Should disable animations
      expect(document.documentElement.style.setProperty).toHaveBeenCalledWith(
        '--animation-duration',
        '0s'
      );
    });

    it('should set high contrast correctly', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.setHighContrast(true);
      });

      expect(result.current.highContrast).toBe(true);
      expect(document.documentElement.classList.toggle).toHaveBeenCalledWith('high-contrast', true);
    });

    it('should detect accessibility preferences', () => {
      // Mock system preferences
      window.matchMedia = vi.fn().mockImplementation(query => ({
        matches: query.includes('prefers-reduced-motion') || query.includes('prefers-contrast'),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.detectAccessibilityPreferences();
      });

      expect(result.current.reducedMotion).toBe(true);
      expect(result.current.highContrast).toBe(true);
    });

    it('should set focus visible correctly', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.setFocusVisible(true);
      });

      expect(result.current.focusVisible).toBe(true);
    });
  });

  describe('Performance Settings', () => {
    it('should set virtualization correctly', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.setVirtualization(false);
      });

      expect(result.current.enableVirtualization).toBe(false);
    });

    it('should set animations correctly', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.setAnimations(false);
      });

      expect(result.current.enableAnimations).toBe(false);
    });
  });

  describe('User Preferences', () => {
    it('should set auto save correctly', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.setAutoSave(false);
      });

      expect(result.current.autoSave).toBe(false);
    });

    it('should set notifications correctly', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.setNotifications(false);
      });

      expect(result.current.notifications).toBe(false);
    });

    it('should set analytics correctly', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.setAnalytics(true);
      });

      expect(result.current.analytics).toBe(true);
    });
  });

  describe('Selectors', () => {
    it('should get modal state correctly', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.openModelDetails('model-123');
        result.current.openSettings();
      });

      const modalState = uiSelectors.getModalState(result.current);

      expect(modalState.hasOpenModal).toBe(true);
      expect(modalState.modelDetailsOpen).toBe(true);
      expect(modalState.settingsOpen).toBe(true);
      expect(modalState.selectedModelId).toBe('model-123');
    });

    it('should get mobile state correctly', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.setMobile(true);
        result.current.toggleMobileFilters();
      });

      const mobileState = uiSelectors.getMobileState(result.current);

      expect(mobileState.isMobile).toBe(true);
      expect(mobileState.hasOpenOverlay).toBe(true);
      expect(mobileState.filtersOpen).toBe(true);
    });

    it('should get theme info correctly', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.setTheme('dark');
        result.current.setHighContrast(true);
      });

      const themeInfo = uiSelectors.getThemeInfo(result.current);

      expect(themeInfo.theme).toBe('dark');
      expect(themeInfo.isDarkMode).toBe(true);
      expect(themeInfo.isSystemTheme).toBe(false);
      expect(themeInfo.highContrast).toBe(true);
    });

    it('should get accessibility state correctly', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.setReducedMotion(true);
        result.current.setHighContrast(true);
        result.current.setFocusVisible(true);
      });

      const accessibilityState = uiSelectors.getAccessibilityState(result.current);

      expect(accessibilityState.reducedMotion).toBe(true);
      expect(accessibilityState.highContrast).toBe(true);
      expect(accessibilityState.focusVisible).toBe(true);
      expect(accessibilityState.animationsEnabled).toBe(false); // Should be false due to reducedMotion
    });

    it('should get layout state correctly', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.setViewMode('list');
        result.current.collapseSidebar();
        result.current.toggleFilters();
      });

      const layoutState = uiSelectors.getLayoutState(result.current);

      expect(layoutState.viewMode).toBe('list');
      expect(layoutState.sidebarState).toBe('collapsed');
      expect(layoutState.showFilters).toBe(true);
      expect(layoutState.sidebarExpanded).toBe(false);
      expect(layoutState.sidebarVisible).toBe(true);
    });
  });

  describe('Reset Operations', () => {
    it('should reset UI correctly', () => {
      const { result } = renderHook(() => useUIStore());

      // Modify state
      act(() => {
        result.current.setViewMode('list');
        result.current.setTheme('dark');
        result.current.toggleFilters();
        result.current.openSettings();
      });

      // Reset
      act(() => {
        result.current.resetUI();
      });

      // Verify reset
      expect(result.current.viewMode).toBe('grid');
      expect(result.current.theme).toBe('system');
      expect(result.current.showFilters).toBe(false);
      expect(result.current.showSettings).toBe(false);
    });

    it('should reset layout correctly', () => {
      const { result } = renderHook(() => useUIStore());

      // Modify layout state
      act(() => {
        result.current.setViewMode('compact');
        result.current.collapseSidebar();
        result.current.toggleFilters();
        result.current.toggleCompactHeader();
      });

      // Reset layout
      act(() => {
        result.current.resetLayout();
      });

      // Verify layout reset
      expect(result.current.viewMode).toBe('grid');
      expect(result.current.sidebarState).toBe('expanded');
      expect(result.current.showFilters).toBe(false);
      expect(result.current.compactHeader).toBe(false);
    });

    it('should reset preferences correctly', () => {
      const { result } = renderHook(() => useUIStore());

      // Modify preferences
      act(() => {
        result.current.setTheme('dark');
        result.current.setAutoSave(false);
        result.current.setNotifications(false);
        result.current.setAnalytics(true);
      });

      // Reset preferences
      act(() => {
        result.current.resetPreferences();
      });

      // Verify preferences reset
      expect(result.current.theme).toBe('system');
      expect(result.current.autoSave).toBe(true);
      expect(result.current.notifications).toBe(true);
      expect(result.current.analytics).toBe(false);
    });
  });
});