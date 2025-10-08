import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, History, Calculator, TrendingUp } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';

interface CommissionConfig {
  id: number;
  name: string;
  role_name: string;
  tier: string;
  service_type: string | null;
  city_id: number | null;
  city_name: string | null;
  commission_type: string;
  commission_value: number;
  min_amount: number;
  max_amount: number | null;
  is_active: boolean;
  effective_from: string;
  effective_to: string | null;
  created_by_name: string;
}

const CommissionConfigPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<CommissionConfig | null>(null);
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterTier, setFilterTier] = useState<string>('all');
  const [filterActive, setFilterActive] = useState<string>('all');

  const [formData, setFormData] = useState({
    name: '',
    role_name: '',
    tier: 'standard',
    service_type: '',
    city_id: '',
    commission_type: 'percentage',
    commission_value: 0,
    min_amount: 0,
    max_amount: '',
    is_active: true,
    effective_from: new Date().toISOString().split('T')[0],
    effective_to: '',
  });

  const [previewData, setPreviewData] = useState({
    role_name: '',
    tier: 'standard',
    service_type: '',
    city_id: '',
    amount: 100000,
  });

  // Fetch commission configs
  const { data: configsData, isLoading } = useQuery({
    queryKey: ['commission-config', filterRole, filterTier, filterActive],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      const params = new URLSearchParams();
      if (filterRole !== 'all') params.append('role_name', filterRole);
      if (filterTier !== 'all') params.append('tier', filterTier);
      if (filterActive !== 'all') params.append('is_active', filterActive);

      const response = await fetch(`http://localhost:4000/commission-config?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch commission configs');
      return response.json();
    },
  });

  // Fetch cities for dropdown
  const { data: citiesData } = useQuery({
    queryKey: ['cities'],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('http://localhost:4000/cities?is_active=true', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch cities');
      return response.json();
    },
  });

  // Fetch commission history
  const { data: historyData } = useQuery({
    queryKey: ['commission-history', selectedConfig?.id],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      const params = new URLSearchParams();
      if (selectedConfig?.id) params.append('commission_config_id', selectedConfig.id.toString());

      const response = await fetch(`http://localhost:4000/commission-config/history?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch history');
      return response.json();
    },
    enabled: isHistoryDialogOpen && !!selectedConfig,
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('http://localhost:4000/commission-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create commission config');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commission-config'] });
      setIsCreateDialogOpen(false);
      resetForm();
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`http://localhost:4000/commission-config/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to update commission config');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commission-config'] });
      setIsEditDialogOpen(false);
      setSelectedConfig(null);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`http://localhost:4000/commission-config/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete commission config');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commission-config'] });
    },
  });

  // Preview mutation
  const previewMutation = useMutation({
    mutationFn: async (data: any) => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('http://localhost:4000/commission-config/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to preview commission');
      return response.json();
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      role_name: '',
      tier: 'standard',
      service_type: '',
      city_id: '',
      commission_type: 'percentage',
      commission_value: 0,
      min_amount: 0,
      max_amount: '',
      is_active: true,
      effective_from: new Date().toISOString().split('T')[0],
      effective_to: '',
    });
  };

  const handleCreate = () => {
    const payload = {
      ...formData,
      city_id: formData.city_id ? parseInt(formData.city_id) : null,
      max_amount: formData.max_amount ? parseInt(formData.max_amount) : null,
      service_type: formData.service_type || null,
      effective_to: formData.effective_to || null,
    };
    createMutation.mutate(payload);
  };

  const handleEdit = (config: CommissionConfig) => {
    setSelectedConfig(config);
    setFormData({
      name: config.name,
      role_name: config.role_name,
      tier: config.tier,
      service_type: config.service_type || '',
      city_id: config.city_id?.toString() || '',
      commission_type: config.commission_type,
      commission_value: config.commission_value,
      min_amount: config.min_amount,
      max_amount: config.max_amount?.toString() || '',
      is_active: config.is_active,
      effective_from: config.effective_from.split('T')[0],
      effective_to: config.effective_to?.split('T')[0] || '',
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = () => {
    if (selectedConfig) {
      const payload = {
        name: formData.name,
        commission_type: formData.commission_type,
        commission_value: formData.commission_value,
        min_amount: formData.min_amount,
        max_amount: formData.max_amount ? parseInt(formData.max_amount) : null,
        is_active: formData.is_active,
        effective_from: formData.effective_from,
        effective_to: formData.effective_to || null,
      };
      updateMutation.mutate({ id: selectedConfig.id, data: payload });
    }
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this commission configuration?')) {
      deleteMutation.mutate(id);
    }
  };

  const handlePreview = () => {
    const payload = {
      ...previewData,
      city_id: previewData.city_id ? parseInt(previewData.city_id) : null,
      service_type: previewData.service_type || null,
    };
    previewMutation.mutate(payload);
  };

  const handleShowHistory = (config: CommissionConfig) => {
    setSelectedConfig(config);
    setIsHistoryDialogOpen(true);
  };

  const configs = configsData?.configs || [];
  const cities = citiesData?.cities || [];
  const history = historyData?.history || [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Commission Configuration</h1>
          <p className="text-gray-400 mt-1">Manage commission rates for roles, tiers, and service types</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsPreviewDialogOpen(true)} variant="outline" className="border-green-600 text-green-400">
            <Calculator className="h-4 w-4 mr-2" />
            Preview Calculator
          </Button>
          <Button onClick={() => setIsCreateDialogOpen(true)} className="bg-green-600 hover:bg-green-700">
            <Plus className="h-4 w-4 mr-2" />
            Add Configuration
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <Select value={filterRole} onValueChange={setFilterRole}>
          <SelectTrigger className="w-48 bg-gray-800 border-gray-600">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-600">
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="interior_designer">Interior Designer</SelectItem>
            <SelectItem value="project_manager">Project Manager</SelectItem>
            <SelectItem value="vendor">Vendor</SelectItem>
            <SelectItem value="platform">Platform</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterTier} onValueChange={setFilterTier}>
          <SelectTrigger className="w-48 bg-gray-800 border-gray-600">
            <SelectValue placeholder="Filter by tier" />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-600">
            <SelectItem value="all">All Tiers</SelectItem>
            <SelectItem value="standard">Standard</SelectItem>
            <SelectItem value="gold">Gold</SelectItem>
            <SelectItem value="platinum">Platinum</SelectItem>
            <SelectItem value="senior">Senior</SelectItem>
          </SelectContent>
        </Select>

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
      </div>

      {/* Configs Table */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Tier</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Commission</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">City</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-gray-400">Loading...</td>
              </tr>
            ) : configs.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-gray-400">No commission configurations found</td>
              </tr>
            ) : (
              configs.map((config: CommissionConfig) => (
                <tr key={config.id} className="hover:bg-gray-750">
                  <td className="px-6 py-4">
                    <div className="text-white font-medium">{config.name}</div>
                    <div className="text-gray-400 text-sm">
                      {config.service_type || 'All Services'}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-300">{config.role_name.replace('_', ' ')}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-blue-900 text-blue-300 rounded text-xs uppercase">
                      {config.tier}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center text-green-400">
                      <TrendingUp className="h-4 w-4 mr-1" />
                      {config.commission_value}
                      {config.commission_type === 'percentage' ? '%' : ' ₹'}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-300">
                    {config.city_name || 'All Cities'}
                  </td>
                  <td className="px-6 py-4">
                    {config.is_active ? (
                      <span className="px-2 py-1 bg-green-900 text-green-300 rounded text-xs">Active</span>
                    ) : (
                      <span className="px-2 py-1 bg-gray-700 text-gray-400 rounded text-xs">Inactive</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(config)}
                        className="text-blue-400 hover:text-blue-300"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleShowHistory(config)}
                        className="text-purple-400 hover:text-purple-300"
                      >
                        <History className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(config.id)}
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

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Commission Configuration</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2 col-span-2">
              <Label htmlFor="name">Configuration Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-gray-700 border-gray-600"
                placeholder="e.g., Designer Standard Commission"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role_name">Role</Label>
              <Select value={formData.role_name} onValueChange={(value) => setFormData({ ...formData, role_name: value })}>
                <SelectTrigger className="bg-gray-700 border-gray-600">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  <SelectItem value="interior_designer">Interior Designer</SelectItem>
                  <SelectItem value="project_manager">Project Manager</SelectItem>
                  <SelectItem value="vendor">Vendor</SelectItem>
                  <SelectItem value="platform">Platform</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tier">Tier</Label>
              <Select value={formData.tier} onValueChange={(value) => setFormData({ ...formData, tier: value })}>
                <SelectTrigger className="bg-gray-700 border-gray-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="gold">Gold</SelectItem>
                  <SelectItem value="platinum">Platinum</SelectItem>
                  <SelectItem value="senior">Senior</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="commission_type">Commission Type</Label>
              <Select value={formData.commission_type} onValueChange={(value) => setFormData({ ...formData, commission_type: value })}>
                <SelectTrigger className="bg-gray-700 border-gray-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  <SelectItem value="percentage">Percentage</SelectItem>
                  <SelectItem value="fixed">Fixed Amount</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="commission_value">
                Commission Value {formData.commission_type === 'percentage' ? '(%)' : '(₹)'}
              </Label>
              <Input
                id="commission_value"
                type="number"
                step="0.01"
                value={formData.commission_value}
                onChange={(e) => setFormData({ ...formData, commission_value: parseFloat(e.target.value) })}
                className="bg-gray-700 border-gray-600"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city_id">City (Optional)</Label>
              <Select value={formData.city_id} onValueChange={(value) => setFormData({ ...formData, city_id: value })}>
                <SelectTrigger className="bg-gray-700 border-gray-600">
                  <SelectValue placeholder="All Cities" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  <SelectItem value="">All Cities</SelectItem>
                  {cities.map((city: any) => (
                    <SelectItem key={city.id} value={city.id.toString()}>{city.display_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="service_type">Service Type (Optional)</Label>
              <Input
                id="service_type"
                value={formData.service_type}
                onChange={(e) => setFormData({ ...formData, service_type: e.target.value })}
                className="bg-gray-700 border-gray-600"
                placeholder="e.g., Residential, Commercial"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="effective_from">Effective From</Label>
              <Input
                id="effective_from"
                type="date"
                value={formData.effective_from}
                onChange={(e) => setFormData({ ...formData, effective_from: e.target.value })}
                className="bg-gray-700 border-gray-600"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="effective_to">Effective To (Optional)</Label>
              <Input
                id="effective_to"
                type="date"
                value={formData.effective_to}
                onChange={(e) => setFormData({ ...formData, effective_to: e.target.value })}
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
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create Configuration'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Commission Configuration</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2 col-span-2">
              <Label>Configuration Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-gray-700 border-gray-600"
              />
            </div>
            <div className="space-y-2">
              <Label>Commission Type</Label>
              <Select value={formData.commission_type} onValueChange={(value) => setFormData({ ...formData, commission_type: value })}>
                <SelectTrigger className="bg-gray-700 border-gray-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  <SelectItem value="percentage">Percentage</SelectItem>
                  <SelectItem value="fixed">Fixed Amount</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Commission Value</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.commission_value}
                onChange={(e) => setFormData({ ...formData, commission_value: parseFloat(e.target.value) })}
                className="bg-gray-700 border-gray-600"
              />
            </div>
            <div className="space-y-2">
              <Label>Effective From</Label>
              <Input
                type="date"
                value={formData.effective_from}
                onChange={(e) => setFormData({ ...formData, effective_from: e.target.value })}
                className="bg-gray-700 border-gray-600"
              />
            </div>
            <div className="space-y-2">
              <Label>Effective To (Optional)</Label>
              <Input
                type="date"
                value={formData.effective_to}
                onChange={(e) => setFormData({ ...formData, effective_to: e.target.value })}
                className="bg-gray-700 border-gray-600"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Active</Label>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Updating...' : 'Update Configuration'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Calculator Dialog */}
      <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>Commission Calculator</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={previewData.role_name} onValueChange={(value) => setPreviewData({ ...previewData, role_name: value })}>
                  <SelectTrigger className="bg-gray-700 border-gray-600">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    <SelectItem value="interior_designer">Interior Designer</SelectItem>
                    <SelectItem value="project_manager">Project Manager</SelectItem>
                    <SelectItem value="vendor">Vendor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tier</Label>
                <Select value={previewData.tier} onValueChange={(value) => setPreviewData({ ...previewData, tier: value })}>
                  <SelectTrigger className="bg-gray-700 border-gray-600">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="gold">Gold</SelectItem>
                    <SelectItem value="platinum">Platinum</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>City (Optional)</Label>
                <Select value={previewData.city_id} onValueChange={(value) => setPreviewData({ ...previewData, city_id: value })}>
                  <SelectTrigger className="bg-gray-700 border-gray-600">
                    <SelectValue placeholder="All Cities" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    <SelectItem value="">All Cities</SelectItem>
                    {cities.map((city: any) => (
                      <SelectItem key={city.id} value={city.id.toString()}>{city.display_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Amount (₹)</Label>
                <Input
                  type="number"
                  value={previewData.amount}
                  onChange={(e) => setPreviewData({ ...previewData, amount: parseInt(e.target.value) })}
                  className="bg-gray-700 border-gray-600"
                />
              </div>
            </div>
            <Button onClick={handlePreview} className="w-full" disabled={previewMutation.isPending}>
              {previewMutation.isPending ? 'Calculating...' : 'Calculate Commission'}
            </Button>
            {previewMutation.data && (
              <div className="bg-gray-900 p-4 rounded-lg space-y-3">
                <h3 className="text-lg font-semibold text-white">Calculation Result</h3>
                {previewMutation.data.applicable_config ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-gray-400 text-sm">Configuration</p>
                        <p className="text-white font-medium">{previewMutation.data.applicable_config.name}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm">Commission Rate</p>
                        <p className="text-white font-medium">
                          {previewMutation.data.applicable_config.commission_value}
                          {previewMutation.data.applicable_config.commission_type === 'percentage' ? '%' : ' ₹'}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm">Base Amount</p>
                        <p className="text-white font-medium">₹{previewMutation.data.calculation_details.base_amount.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm">Commission Amount</p>
                        <p className="text-green-400 font-bold">₹{previewMutation.data.commission_amount.toLocaleString()}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-gray-400 text-sm">Net Amount</p>
                        <p className="text-white font-bold text-xl">₹{previewMutation.data.net_amount.toLocaleString()}</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-yellow-400">{previewMutation.data.message}</p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPreviewDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-3xl">
          <DialogHeader>
            <DialogTitle>Commission Configuration History</DialogTitle>
          </DialogHeader>
          <div className="py-4 max-h-96 overflow-y-auto">
            {history.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No history available</p>
            ) : (
              <div className="space-y-3">
                {history.map((item: any) => (
                  <div key={item.id} className="bg-gray-900 p-4 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className={`px-2 py-1 rounded text-xs ${
                          item.action === 'created' ? 'bg-green-900 text-green-300' :
                          item.action === 'updated' ? 'bg-blue-900 text-blue-300' :
                          item.action === 'deleted' ? 'bg-red-900 text-red-300' :
                          'bg-gray-700 text-gray-300'
                        }`}>
                          {item.action.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-gray-400 text-sm">{item.changed_by_name}</p>
                        <p className="text-gray-500 text-xs">
                          {new Date(item.changed_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    {item.reason && (
                      <p className="text-gray-300 text-sm mt-2">{item.reason}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsHistoryDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CommissionConfigPage;



