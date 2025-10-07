import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';

interface SystemSetting {
  key: string;
  value: string;
  description: string;
  category: string;
  updated_at: string;
  updated_by: string;
}

interface SystemSettingsData {
  settings: SystemSetting[];
  by_category: Record<string, SystemSetting[]>;
  total: number;
}

export default function SystemSettingsPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingSetting, setEditingSetting] = useState<SystemSetting | null>(null);

  const [newSetting, setNewSetting] = useState({
    key: '',
    value: '',
    description: '',
    category: 'general'
  });

  const { data: settingsData, isLoading, error } = useQuery<SystemSettingsData>({
    queryKey: ['system-settings', selectedCategory],
    queryFn: async () => {
      const url = selectedCategory === 'all' 
        ? 'http://localhost:4000/system/admin/settings'
        : `http://localhost:4000/system/admin/settings?category=${selectedCategory}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch system settings');
      }
      return response.json();
    },
    enabled: !!token,
  });

  const updateSettingMutation = useMutation({
    mutationFn: async (setting: Partial<SystemSetting>) => {
      const response = await fetch('http://localhost:4000/system/admin/settings', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(setting),
      });
      if (!response.ok) {
        throw new Error('Failed to update setting');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
      setEditingSetting(null);
      setIsAddingNew(false);
      setNewSetting({ key: '', value: '', description: '', category: 'general' });
    },
  });

  const handleSaveSetting = (setting: Partial<SystemSetting>) => {
    updateSettingMutation.mutate(setting);
  };

  const handleAddNew = () => {
    if (newSetting.key && newSetting.value) {
      handleSaveSetting(newSetting);
    }
  };

  const categories = settingsData ? Object.keys(settingsData.by_category) : [];
  const displaySettings = selectedCategory === 'all' 
    ? settingsData?.settings || []
    : settingsData?.by_category[selectedCategory] || [];

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-lg shadow p-6">
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-full"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-lg font-medium text-red-800 mb-2">Error Loading Settings</h3>
          <p className="text-red-600">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
        <button
          onClick={() => setIsAddingNew(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Add New Setting
        </button>
      </div>

      {/* Category Filter */}
      <div className="mb-6">
        <div className="flex space-x-2">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded ${
              selectedCategory === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            All Categories ({settingsData?.total || 0})
          </button>
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded capitalize ${
                selectedCategory === category
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {category} ({settingsData?.by_category[category]?.length || 0})
            </button>
          ))}
        </div>
      </div>

      {/* Add New Setting Form */}
      {isAddingNew && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Setting</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Key</label>
              <input
                type="text"
                value={newSetting.key}
                onChange={(e) => setNewSetting({ ...newSetting, key: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-2"
                placeholder="setting_key"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <select
                value={newSetting.category}
                onChange={(e) => setNewSetting({ ...newSetting, category: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-2"
              >
                <option value="general">General</option>
                <option value="security">Security</option>
                <option value="email">Email</option>
                <option value="payment">Payment</option>
                <option value="ui">UI/UX</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Value</label>
              <input
                type="text"
                value={newSetting.value}
                onChange={(e) => setNewSetting({ ...newSetting, value: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-2"
                placeholder="Setting value"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                value={newSetting.description}
                onChange={(e) => setNewSetting({ ...newSetting, description: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-2"
                rows={3}
                placeholder="Description of this setting"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-3 mt-4">
            <button
              onClick={() => setIsAddingNew(false)}
              className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleAddNew}
              disabled={!newSetting.key || !newSetting.value || updateSettingMutation.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {updateSettingMutation.isPending ? 'Saving...' : 'Save Setting'}
            </button>
          </div>
        </div>
      )}

      {/* Settings List */}
      <div className="space-y-4">
        {displaySettings.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <p className="text-gray-500">No settings found for the selected category.</p>
          </div>
        ) : (
          displaySettings.map((setting) => (
            <div key={setting.key} className="bg-white rounded-lg shadow p-6">
              {editingSetting?.key === setting.key ? (
                <EditSettingForm
                  setting={editingSetting}
                  onSave={handleSaveSetting}
                  onCancel={() => setEditingSetting(null)}
                  isLoading={updateSettingMutation.isPending}
                />
              ) : (
                <ViewSetting
                  setting={setting}
                  onEdit={() => setEditingSetting(setting)}
                />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function ViewSetting({ setting, onEdit }: { setting: SystemSetting; onEdit: () => void }) {
  return (
    <div className="flex justify-between items-start">
      <div className="flex-1">
        <div className="flex items-center space-x-3 mb-2">
          <h3 className="text-lg font-medium text-gray-900">{setting.key}</h3>
          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
            {setting.category}
          </span>
        </div>
        <p className="text-gray-600 mb-2">{setting.description}</p>
        <div className="bg-gray-50 rounded p-3">
          <code className="text-sm text-gray-800">{setting.value}</code>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Last updated: {new Date(setting.updated_at).toLocaleString()}
        </p>
      </div>
      <button
        onClick={onEdit}
        className="ml-4 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
      >
        Edit
      </button>
    </div>
  );
}

function EditSettingForm({
  setting,
  onSave,
  onCancel,
  isLoading
}: {
  setting: SystemSetting | null;
  onSave: (setting: Partial<SystemSetting>) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  if (!setting) {
    return null;
  }

  const [editedSetting, setEditedSetting] = useState({
    key: setting.key,
    value: setting.value,
    description: setting.description,
    category: setting.category
  });

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Key</label>
          <input
            type="text"
            value={editedSetting.key}
            onChange={(e) => setEditedSetting({ ...editedSetting, key: e.target.value })}
            className="w-full border border-gray-300 rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
          <select
            value={editedSetting.category}
            onChange={(e) => setEditedSetting({ ...editedSetting, category: e.target.value })}
            className="w-full border border-gray-300 rounded px-3 py-2"
          >
            <option value="general">General</option>
            <option value="security">Security</option>
            <option value="email">Email</option>
            <option value="payment">Payment</option>
            <option value="ui">UI/UX</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">Value</label>
          <input
            type="text"
            value={editedSetting.value}
            onChange={(e) => setEditedSetting({ ...editedSetting, value: e.target.value })}
            className="w-full border border-gray-300 rounded px-3 py-2"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
          <textarea
            value={editedSetting.description}
            onChange={(e) => setEditedSetting({ ...editedSetting, description: e.target.value })}
            className="w-full border border-gray-300 rounded px-3 py-2"
            rows={3}
          />
        </div>
      </div>
      <div className="flex justify-end space-x-3">
        <button
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={() => onSave(editedSetting)}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
