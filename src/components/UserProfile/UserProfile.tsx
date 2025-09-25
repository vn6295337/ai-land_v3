import React, { useState } from 'react';
import { User, Settings, Activity, BarChart3, Download, Heart, Search, Eye, Clock, Trash2 } from 'lucide-react';
import { ComponentProps } from '../../types/ui';
import { useUserProfileStore, userProfileSelectors } from '../../stores/userProfileStore';
import { useUIStore } from '../../stores/uiStore';

export interface UserProfileProps extends ComponentProps {
  view?: 'profile' | 'preferences' | 'activity' | 'privacy';
}

export const UserProfile: React.FC<UserProfileProps> = React.memo(({
  view = 'profile',
  className = '',
  testId = 'user-profile'
}) => {
  const {
    profile,
    preferences,
    isLoggedIn,
    createProfile,
    updateProfile,
    updatePreferences,
    exportPreferences,
    importPreferences,
    clearActivity,
    deleteProfile
  } = useUserProfileStore();

  const { closeSettings } = useUIStore();
  const [activeTab, setActiveTab] = useState(view);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: profile?.name || '',
    email: profile?.email || ''
  });

  const userStats = userProfileSelectors.getUserStats(useUserProfileStore.getState());
  const recentActivity = userProfileSelectors.getRecentActivity(useUserProfileStore.getState());
  const privacySettings = userProfileSelectors.getPrivacySettings(useUserProfileStore.getState());

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'preferences', label: 'Preferences', icon: Settings },
    { id: 'activity', label: 'Activity', icon: Activity },
    { id: 'privacy', label: 'Privacy', icon: BarChart3 }
  ];

  const handleCreateProfile = () => {
    if (profileForm.name.trim()) {
      createProfile(profileForm.name.trim(), profileForm.email.trim() || undefined);
    }
  };

  const handleUpdateProfile = () => {
    if (profile && profileForm.name.trim()) {
      updateProfile({
        name: profileForm.name.trim(),
        email: profileForm.email.trim() || undefined
      });
    }
  };

  const handleExportPreferences = () => {
    const data = exportPreferences();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `user-preferences-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportPreferences = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = e.target?.result as string;
        if (importPreferences(data)) {
          alert('Preferences imported successfully!');
        } else {
          alert('Failed to import preferences. Please check the file format.');
        }
      };
      reader.readAsText(file);
    }
  };

  const renderProfileTab = () => (
    <div className="space-y-6" data-testid={`${testId}-profile-tab`}>
      {!isLoggedIn ? (
        <div className="text-center py-8">
          <User className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            Create Your Profile
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Save your preferences and track your activity
          </p>

          <div className="max-w-sm mx-auto space-y-4">
            <input
              type="text"
              placeholder="Your name"
              value={profileForm.name}
              onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
              data-testid={`${testId}-name-input`}
            />
            <input
              type="email"
              placeholder="Email (optional)"
              value={profileForm.email}
              onChange={(e) => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
              data-testid={`${testId}-email-input`}
            />
            <button
              onClick={handleCreateProfile}
              disabled={!profileForm.name.trim()}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700"
              data-testid={`${testId}-create-profile`}
            >
              Create Profile
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
              {profile?.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                {profile?.name}
              </h2>
              <p className="text-gray-500 dark:text-gray-400">{profile?.email}</p>
              <p className="text-sm text-gray-400">
                Member since {profile?.createdAt && new Date(profile.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg text-center">
              <Eye className="w-8 h-8 mx-auto text-blue-600 mb-2" />
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {userStats.totalModelViews}
              </div>
              <div className="text-sm text-gray-500">Model Views</div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg text-center">
              <Search className="w-8 h-8 mx-auto text-green-600 mb-2" />
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {userStats.totalSearches}
              </div>
              <div className="text-sm text-gray-500">Searches</div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg text-center">
              <Heart className="w-8 h-8 mx-auto text-red-600 mb-2" />
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {userStats.favoriteActionsCount}
              </div>
              <div className="text-sm text-gray-500">Favorites</div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg text-center">
              <Clock className="w-8 h-8 mx-auto text-purple-600 mb-2" />
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {userStats.totalSessions}
              </div>
              <div className="text-sm text-gray-500">Sessions</div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Edit Profile</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Your name"
                value={profileForm.name}
                onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
                data-testid={`${testId}-edit-name`}
              />
              <input
                type="email"
                placeholder="Email"
                value={profileForm.email}
                onChange={(e) => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
                data-testid={`${testId}-edit-email`}
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleUpdateProfile}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                data-testid={`${testId}-update-profile`}
              >
                Update Profile
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                data-testid={`${testId}-delete-profile`}
              >
                Delete Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-md mx-4">
            <h3 className="text-lg font-medium mb-4">Delete Profile</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              This will permanently delete your profile and all associated data. This action cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  deleteProfile();
                  setShowDeleteConfirm(false);
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                data-testid={`${testId}-confirm-delete`}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderPreferencesTab = () => (
    <div className="space-y-8" data-testid={`${testId}-preferences-tab`}>
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Preferences</h3>
        <div className="flex gap-2">
          <button
            onClick={handleExportPreferences}
            className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
            data-testid={`${testId}-export-preferences`}
          >
            Export
          </button>
          <label className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer">
            Import
            <input
              type="file"
              accept=".json"
              onChange={handleImportPreferences}
              className="hidden"
              data-testid={`${testId}-import-preferences`}
            />
          </label>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Display Preferences</h4>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm">Default View Mode</label>
              <select
                value={preferences.defaultViewMode}
                onChange={(e) => updatePreferences({
                  defaultViewMode: e.target.value as 'grid' | 'list' | 'compact'
                })}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                data-testid={`${testId}-view-mode`}
              >
                <option value="grid">Grid</option>
                <option value="list">List</option>
                <option value="compact">Compact</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm">Items per Page</label>
              <select
                value={preferences.defaultItemsPerPage}
                onChange={(e) => updatePreferences({
                  defaultItemsPerPage: parseInt(e.target.value)
                })}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
              >
                <option value={12}>12</option>
                <option value={24}>24</option>
                <option value={48}>48</option>
                <option value={96}>96</option>
              </select>
            </div>
          </div>
        </div>

        <div>
          <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Notifications</h4>
          <div className="space-y-3">
            {[
              { key: 'emailNotifications', label: 'Email Notifications' },
              { key: 'pushNotifications', label: 'Push Notifications' },
              { key: 'weeklyDigest', label: 'Weekly Digest' },
              { key: 'newModelAlerts', label: 'New Model Alerts' }
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center justify-between">
                <span className="text-sm">{label}</span>
                <input
                  type="checkbox"
                  checked={preferences[key as keyof typeof preferences] as boolean}
                  onChange={(e) => updatePreferences({
                    [key]: e.target.checked
                  })}
                  className="rounded"
                  data-testid={`${testId}-${key}`}
                />
              </label>
            ))}
          </div>
        </div>

        <div>
          <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Advanced</h4>
          <div className="space-y-3">
            <label className="flex items-center justify-between">
              <span className="text-sm">Auto-add to Comparison</span>
              <input
                type="checkbox"
                checked={preferences.comparisonAutoAdd}
                onChange={(e) => updatePreferences({ comparisonAutoAdd: e.target.checked })}
                className="rounded"
                data-testid={`${testId}-auto-compare`}
              />
            </label>

            <div className="flex items-center justify-between">
              <label className="text-sm">Export Format</label>
              <select
                value={preferences.dataExportFormat}
                onChange={(e) => updatePreferences({
                  dataExportFormat: e.target.value as 'json' | 'csv' | 'xlsx'
                })}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                data-testid={`${testId}-export-format`}
              >
                <option value="json">JSON</option>
                <option value="csv">CSV</option>
                <option value="xlsx">Excel</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderActivityTab = () => (
    <div className="space-y-6" data-testid={`${testId}-activity-tab`}>
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Activity</h3>
        <button
          onClick={clearActivity}
          className="px-3 py-2 text-sm text-red-600 hover:text-red-700"
          data-testid={`${testId}-clear-activity`}
        >
          <Trash2 className="w-4 h-4 inline mr-1" />
          Clear Activity
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
          <h4 className="font-medium mb-3">Recent Searches</h4>
          {recentActivity.recentSearches.length > 0 ? (
            <div className="space-y-2">
              {recentActivity.recentSearches.map((search, index) => (
                <div key={index} className="text-sm">
                  <div className="font-medium">{search.query}</div>
                  <div className="text-gray-500">
                    {search.resultsCount} results • {new Date(search.timestamp).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No recent searches</p>
          )}
        </div>

        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
          <h4 className="font-medium mb-3">Session Info</h4>
          <div className="space-y-2 text-sm">
            <div>Total Sessions: {userStats.totalSessions}</div>
            <div>Average Duration: {Math.round(userStats.averageSessionDuration / 60000)}m</div>
            <div>Current Session: {recentActivity.currentSession.isActive ? 'Active' : 'Inactive'}</div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPrivacyTab = () => (
    <div className="space-y-6" data-testid={`${testId}-privacy-tab`}>
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Privacy Settings</h3>

      <div className="space-y-4">
        {[
          {
            key: 'trackingEnabled',
            label: 'Enable Activity Tracking',
            description: 'Track your model views, searches, and usage patterns'
          },
          {
            key: 'shareUsageData',
            label: 'Share Usage Data',
            description: 'Help improve the service by sharing anonymous usage statistics'
          },
          {
            key: 'saveSearchHistory',
            label: 'Save Search History',
            description: 'Keep a history of your searches for quick access'
          }
        ].map(({ key, label, description }) => (
          <div key={key} className="flex items-start justify-between py-3 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
            <div className="flex-1">
              <div className="font-medium text-sm">{label}</div>
              <div className="text-xs text-gray-500 mt-1">{description}</div>
            </div>
            <input
              type="checkbox"
              checked={preferences[key as keyof typeof preferences] as boolean}
              onChange={(e) => updatePreferences({ [key]: e.target.checked })}
              className="rounded ml-4"
              data-testid={`${testId}-${key}`}
            />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className={`bg-white dark:bg-gray-800 ${className}`} data-testid={testId}>
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8 px-6">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
                data-testid={`${testId}-tab-${tab.id}`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="p-6">
        {activeTab === 'profile' && renderProfileTab()}
        {activeTab === 'preferences' && renderPreferencesTab()}
        {activeTab === 'activity' && renderActivityTab()}
        {activeTab === 'privacy' && renderPrivacyTab()}
      </div>
    </div>
  );
});

export default UserProfile;