import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, Settings, MapPin, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';

interface City {
  id: number;
  name: string;
  display_name: string;
  state: string;
  state_code: string;
  country: string;
  timezone: string;
  is_active: boolean;
  is_operational: boolean;
  launch_date: string | null;
  gst_rate?: number;
  cgst_rate?: number;
  sgst_rate?: number;
  currency?: string;
}

const CityManagementPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const [filterActive, setFilterActive] = useState<string>('all');
  const [filterOperational, setFilterOperational] = useState<string>('all');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    display_name: '',
    state: '',
    state_code: '',
    country: 'India',
    timezone: 'Asia/Kolkata',
    is_active: true,
    is_operational: false,
    launch_date: '',
  });

  const [settingsData, setSettingsData] = useState({
    gst_rate: 18.00,
    cgst_rate: 9.00,
    sgst_rate: 9.00,
    igst_rate: 18.00,
    tds_rate: 1.00,
    currency: 'INR',
    currency_symbol: '₹',
    min_project_value: 50000,
    max_project_value: 10000000,
  });

  // Fetch cities
  const { data: citiesData, isLoading } = useQuery({
    queryKey: ['cities', filterActive, filterOperational],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      const params = new URLSearchParams();
      if (filterActive !== 'all') params.append('is_active', filterActive);
      if (filterOperational !== 'all') params.append('is_operational', filterOperational);

      const response = await fetch(`http://localhost:4000/cities?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch cities');
      return response.json();
    },
  });

  // Create city mutation
  const createCityMutation = useMutation({
    mutationFn: async (data: any) => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('http://localhost:4000/cities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create city');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cities'] });
      setIsCreateDialogOpen(false);
      resetForm();
    },
  });

  // Update city mutation
  const updateCityMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`http://localhost:4000/cities/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to update city');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cities'] });
      setIsEditDialogOpen(false);
      setSelectedCity(null);
    },
  });

  // Delete city mutation
  const deleteCityMutation = useMutation({
    mutationFn: async (id: number) => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`http://localhost:4000/cities/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete city');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cities'] });
    },
  });

  // Update city settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async ({ id, settings }: { id: number; settings: any }) => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`http://localhost:4000/cities/${id}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(settings)
      });
      if (!response.ok) throw new Error('Failed to update settings');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cities'] });
      setIsSettingsDialogOpen(false);
      setSelectedCity(null);
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      display_name: '',
      state: '',
      state_code: '',
      country: 'India',
      timezone: 'Asia/Kolkata',
      is_active: true,
      is_operational: false,
      launch_date: '',
    });
  };

  const handleCreate = () => {
    createCityMutation.mutate(formData);
  };

  const handleEdit = (city: City) => {
    setSelectedCity(city);
    setFormData({
      name: city.name,
      display_name: city.display_name,
      state: city.state,
      state_code: city.state_code || '',
      country: city.country,
      timezone: city.timezone,
      is_active: city.is_active,
      is_operational: city.is_operational,
      launch_date: city.launch_date || '',
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = () => {
    if (selectedCity) {
      updateCityMutation.mutate({ id: selectedCity.id, data: formData });
    }
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this city? This action cannot be undone.')) {
      deleteCityMutation.mutate(id);
    }
  };

  const handleOpenSettings = (city: City) => {
    setSelectedCity(city);
    setSettingsData({
      gst_rate: city.gst_rate || 18.00,
      cgst_rate: city.cgst_rate || 9.00,
      sgst_rate: city.sgst_rate || 9.00,
      igst_rate: 18.00,
      tds_rate: 1.00,
      currency: city.currency || 'INR',
      currency_symbol: '₹',
      min_project_value: 50000,
      max_project_value: 10000000,
    });
    setIsSettingsDialogOpen(true);
  };

  const handleUpdateSettings = () => {
    if (selectedCity) {
      updateSettingsMutation.mutate({ id: selectedCity.id, settings: settingsData });
    }
  };

  const cities = citiesData?.cities || [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">City Management</h1>
          <p className="text-gray-400 mt-1">Manage operational cities and regional settings</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)} className="bg-green-600 hover:bg-green-700">
          <Plus className="h-4 w-4 mr-2" />
          Add City
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <Select value={filterActive} onValueChange={setFilterActive}>
          <SelectTrigger className="w-48 bg-gray-800 border-gray-600">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-600">
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="true">Active Only</SelectItem>
            <SelectItem value="false">Inactive Only</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterOperational} onValueChange={setFilterOperational}>
          <SelectTrigger className="w-48 bg-gray-800 border-gray-600">
            <SelectValue placeholder="Filter by operational" />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-600">
            <SelectItem value="all">All Cities</SelectItem>
            <SelectItem value="true">Operational Only</SelectItem>
            <SelectItem value="false">Not Operational</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Cities Table */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">City</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">State</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Operational</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Launch Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-gray-400">Loading...</td>
              </tr>
            ) : cities.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-gray-400">No cities found</td>
              </tr>
            ) : (
              cities.map((city: City) => (
                <tr key={city.id} className="hover:bg-gray-750">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 text-green-500 mr-2" />
                      <div>
                        <div className="text-white font-medium">{city.display_name}</div>
                        <div className="text-gray-400 text-sm">{city.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-300">{city.state}</td>
                  <td className="px-6 py-4">
                    {city.is_active ? (
                      <span className="flex items-center text-green-500">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Active
                      </span>
                    ) : (
                      <span className="flex items-center text-red-500">
                        <XCircle className="h-4 w-4 mr-1" />
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {city.is_operational ? (
                      <span className="px-2 py-1 bg-green-900 text-green-300 rounded text-xs">Operational</span>
                    ) : (
                      <span className="px-2 py-1 bg-gray-700 text-gray-400 rounded text-xs">Not Operational</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-gray-300">
                    {city.launch_date ? new Date(city.launch_date).toLocaleDateString() : 'Not set'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(city)}
                        className="text-blue-400 hover:text-blue-300"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleOpenSettings(city)}
                        className="text-green-400 hover:text-green-300"
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(city.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create City Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New City</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">City Name (lowercase)</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value.toLowerCase() })}
                className="bg-gray-700 border-gray-600"
                placeholder="mumbai"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="display_name">Display Name</Label>
              <Input
                id="display_name"
                value={formData.display_name}
                onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                className="bg-gray-700 border-gray-600"
                placeholder="Mumbai"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="bg-gray-700 border-gray-600"
                placeholder="Maharashtra"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state_code">State Code</Label>
              <Input
                id="state_code"
                value={formData.state_code}
                onChange={(e) => setFormData({ ...formData, state_code: e.target.value })}
                className="bg-gray-700 border-gray-600"
                placeholder="MH"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                className="bg-gray-700 border-gray-600"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Input
                id="timezone"
                value={formData.timezone}
                onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                className="bg-gray-700 border-gray-600"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="launch_date">Launch Date</Label>
              <Input
                id="launch_date"
                type="date"
                value={formData.launch_date}
                onChange={(e) => setFormData({ ...formData, launch_date: e.target.value })}
                className="bg-gray-700 border-gray-600"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="is_active">Active</Label>
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>
              <div className="flex items-center justify-between mt-4">
                <Label htmlFor="is_operational">Operational</Label>
                <Switch
                  id="is_operational"
                  checked={formData.is_operational}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_operational: checked })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createCityMutation.isPending}>
              {createCityMutation.isPending ? 'Creating...' : 'Create City'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit City Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit City</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit_display_name">Display Name</Label>
              <Input
                id="edit_display_name"
                value={formData.display_name}
                onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                className="bg-gray-700 border-gray-600"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_state">State</Label>
              <Input
                id="edit_state"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="bg-gray-700 border-gray-600"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_state_code">State Code</Label>
              <Input
                id="edit_state_code"
                value={formData.state_code}
                onChange={(e) => setFormData({ ...formData, state_code: e.target.value })}
                className="bg-gray-700 border-gray-600"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_launch_date">Launch Date</Label>
              <Input
                id="edit_launch_date"
                type="date"
                value={formData.launch_date}
                onChange={(e) => setFormData({ ...formData, launch_date: e.target.value })}
                className="bg-gray-700 border-gray-600"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="edit_is_active">Active</Label>
                <Switch
                  id="edit_is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>
              <div className="flex items-center justify-between mt-4">
                <Label htmlFor="edit_is_operational">Operational</Label>
                <Switch
                  id="edit_is_operational"
                  checked={formData.is_operational}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_operational: checked })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={updateCityMutation.isPending}>
              {updateCityMutation.isPending ? 'Updating...' : 'Update City'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* City Settings Dialog */}
      <Dialog open={isSettingsDialogOpen} onOpenChange={setIsSettingsDialogOpen}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>Regional Settings - {selectedCity?.display_name}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="gst_rate">GST Rate (%)</Label>
              <Input
                id="gst_rate"
                type="number"
                step="0.01"
                value={settingsData.gst_rate}
                onChange={(e) => setSettingsData({ ...settingsData, gst_rate: parseFloat(e.target.value) })}
                className="bg-gray-700 border-gray-600"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cgst_rate">CGST Rate (%)</Label>
              <Input
                id="cgst_rate"
                type="number"
                step="0.01"
                value={settingsData.cgst_rate}
                onChange={(e) => setSettingsData({ ...settingsData, cgst_rate: parseFloat(e.target.value) })}
                className="bg-gray-700 border-gray-600"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sgst_rate">SGST Rate (%)</Label>
              <Input
                id="sgst_rate"
                type="number"
                step="0.01"
                value={settingsData.sgst_rate}
                onChange={(e) => setSettingsData({ ...settingsData, sgst_rate: parseFloat(e.target.value) })}
                className="bg-gray-700 border-gray-600"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tds_rate">TDS Rate (%)</Label>
              <Input
                id="tds_rate"
                type="number"
                step="0.01"
                value={settingsData.tds_rate}
                onChange={(e) => setSettingsData({ ...settingsData, tds_rate: parseFloat(e.target.value) })}
                className="bg-gray-700 border-gray-600"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Input
                id="currency"
                value={settingsData.currency}
                onChange={(e) => setSettingsData({ ...settingsData, currency: e.target.value })}
                className="bg-gray-700 border-gray-600"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency_symbol">Currency Symbol</Label>
              <Input
                id="currency_symbol"
                value={settingsData.currency_symbol}
                onChange={(e) => setSettingsData({ ...settingsData, currency_symbol: e.target.value })}
                className="bg-gray-700 border-gray-600"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="min_project_value">Min Project Value</Label>
              <Input
                id="min_project_value"
                type="number"
                value={settingsData.min_project_value}
                onChange={(e) => setSettingsData({ ...settingsData, min_project_value: parseInt(e.target.value) })}
                className="bg-gray-700 border-gray-600"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max_project_value">Max Project Value</Label>
              <Input
                id="max_project_value"
                type="number"
                value={settingsData.max_project_value}
                onChange={(e) => setSettingsData({ ...settingsData, max_project_value: parseInt(e.target.value) })}
                className="bg-gray-700 border-gray-600"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSettingsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateSettings} disabled={updateSettingsMutation.isPending}>
              {updateSettingsMutation.isPending ? 'Updating...' : 'Update Settings'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CityManagementPage;

