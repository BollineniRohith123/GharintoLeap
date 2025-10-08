import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, Settings, Play, TrendingUp } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { Slider } from '../../components/ui/slider';

interface AssignmentRule {
  id: number;
  name: string;
  description: string;
  rule_type: string;
  priority: number;
  is_active: boolean;
  config: any;
  created_by_name: string;
}

interface AlgorithmSetting {
  id: number;
  setting_key: string;
  setting_value: any;
  description: string;
  category: string;
  is_active: boolean;
}

const AssignmentConfigPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [isCreateRuleDialogOpen, setIsCreateRuleDialogOpen] = useState(false);
  const [isEditRuleDialogOpen, setIsEditRuleDialogOpen] = useState(false);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [isTestDialogOpen, setIsTestDialogOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState<AssignmentRule | null>(null);
  const [filterType, setFilterType] = useState<string>('all');

  const [ruleFormData, setRuleFormData] = useState({
    name: '',
    description: '',
    rule_type: 'lead_assignment',
    priority: 0,
    is_active: true,
    config: {
      criteria: '',
      strict: false,
    },
  });

  const [algorithmSettings, setAlgorithmSettings] = useState({
    location_weight: 0.4,
    expertise_weight: 0.3,
    performance_weight: 0.2,
    availability_weight: 0.1,
    max_leads_per_designer: 10,
  });

  const [testData, setTestData] = useState({
    city: '',
    project_type: '',
    budget: 100000,
  });

  // Fetch assignment rules
  const { data: rulesData, isLoading: rulesLoading } = useQuery({
    queryKey: ['assignment-rules', filterType],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      const params = new URLSearchParams();
      if (filterType !== 'all') params.append('rule_type', filterType);

      const response = await fetch(`http://localhost:4000/assignment-rules?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch assignment rules');
      return response.json();
    },
  });

  // Fetch algorithm settings
  const { data: settingsData, isLoading: settingsLoading } = useQuery({
    queryKey: ['assignment-config'],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('http://localhost:4000/assignment-config', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch algorithm settings');
      return response.json();
    },
  });

  // Create rule mutation
  const createRuleMutation = useMutation({
    mutationFn: async (data: any) => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('http://localhost:4000/assignment-rules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create rule');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignment-rules'] });
      setIsCreateRuleDialogOpen(false);
      resetRuleForm();
    },
  });

  // Update rule mutation
  const updateRuleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`http://localhost:4000/assignment-rules/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to update rule');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignment-rules'] });
      setIsEditRuleDialogOpen(false);
      setSelectedRule(null);
    },
  });

  // Delete rule mutation
  const deleteRuleMutation = useMutation({
    mutationFn: async (id: number) => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`http://localhost:4000/assignment-rules/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete rule');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignment-rules'] });
    },
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (settings: any) => {
      const token = localStorage.getItem('auth_token');
      const settingsArray = [
        {
          setting_key: 'location_matching_weight',
          setting_value: { weight: settings.location_weight },
          description: 'Weight for location matching in assignment algorithm',
          category: 'lead_assignment'
        },
        {
          setting_key: 'expertise_matching_weight',
          setting_value: { weight: settings.expertise_weight },
          description: 'Weight for expertise matching in assignment algorithm',
          category: 'lead_assignment'
        },
        {
          setting_key: 'performance_matching_weight',
          setting_value: { weight: settings.performance_weight },
          description: 'Weight for performance history in assignment algorithm',
          category: 'lead_assignment'
        },
        {
          setting_key: 'availability_matching_weight',
          setting_value: { weight: settings.availability_weight },
          description: 'Weight for designer availability in assignment algorithm',
          category: 'lead_assignment'
        },
        {
          setting_key: 'load_balancing_enabled',
          setting_value: { enabled: true, max_leads_per_designer: settings.max_leads_per_designer },
          description: 'Enable load balancing for lead distribution',
          category: 'lead_assignment'
        },
      ];

      const response = await fetch('http://localhost:4000/assignment-config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ settings: settingsArray })
      });
      if (!response.ok) throw new Error('Failed to update settings');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignment-config'] });
      setIsSettingsDialogOpen(false);
    },
  });

  // Test algorithm mutation
  const testAlgorithmMutation = useMutation({
    mutationFn: async (data: any) => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('http://localhost:4000/assignment-config/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          lead_data: data,
          designer_pool: [] // Empty for now, backend will use mock data
        })
      });
      if (!response.ok) throw new Error('Failed to test algorithm');
      return response.json();
    },
  });

  const resetRuleForm = () => {
    setRuleFormData({
      name: '',
      description: '',
      rule_type: 'lead_assignment',
      priority: 0,
      is_active: true,
      config: {
        criteria: '',
        strict: false,
      },
    });
  };

  const handleCreateRule = () => {
    createRuleMutation.mutate(ruleFormData);
  };

  const handleEditRule = (rule: AssignmentRule) => {
    setSelectedRule(rule);
    setRuleFormData({
      name: rule.name,
      description: rule.description,
      rule_type: rule.rule_type,
      priority: rule.priority,
      is_active: rule.is_active,
      config: rule.config,
    });
    setIsEditRuleDialogOpen(true);
  };

  const handleUpdateRule = () => {
    if (selectedRule) {
      updateRuleMutation.mutate({ id: selectedRule.id, data: ruleFormData });
    }
  };

  const handleDeleteRule = (id: number) => {
    if (confirm('Are you sure you want to delete this assignment rule?')) {
      deleteRuleMutation.mutate(id);
    }
  };

  const handleOpenSettings = () => {
    const settings = settingsData?.settings || [];
    const locationWeight = settings.find((s: AlgorithmSetting) => s.setting_key === 'location_matching_weight');
    const expertiseWeight = settings.find((s: AlgorithmSetting) => s.setting_key === 'expertise_matching_weight');
    const performanceWeight = settings.find((s: AlgorithmSetting) => s.setting_key === 'performance_matching_weight');
    const availabilityWeight = settings.find((s: AlgorithmSetting) => s.setting_key === 'availability_matching_weight');
    const loadBalancing = settings.find((s: AlgorithmSetting) => s.setting_key === 'load_balancing_enabled');

    setAlgorithmSettings({
      location_weight: locationWeight?.setting_value?.weight || 0.4,
      expertise_weight: expertiseWeight?.setting_value?.weight || 0.3,
      performance_weight: performanceWeight?.setting_value?.weight || 0.2,
      availability_weight: availabilityWeight?.setting_value?.weight || 0.1,
      max_leads_per_designer: loadBalancing?.setting_value?.max_leads_per_designer || 10,
    });
    setIsSettingsDialogOpen(true);
  };

  const handleUpdateSettings = () => {
    updateSettingsMutation.mutate(algorithmSettings);
  };

  const handleTestAlgorithm = () => {
    testAlgorithmMutation.mutate(testData);
  };

  const rules = rulesData?.rules || [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Assignment Algorithm Configuration</h1>
          <p className="text-gray-400 mt-1">Configure lead assignment rules and algorithm settings</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsTestDialogOpen(true)} variant="outline" className="border-purple-600 text-purple-400">
            <Play className="h-4 w-4 mr-2" />
            Test Algorithm
          </Button>
          <Button onClick={handleOpenSettings} variant="outline" className="border-blue-600 text-blue-400">
            <Settings className="h-4 w-4 mr-2" />
            Algorithm Settings
          </Button>
          <Button onClick={() => setIsCreateRuleDialogOpen(true)} className="bg-green-600 hover:bg-green-700">
            <Plus className="h-4 w-4 mr-2" />
            Add Rule
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-64 bg-gray-800 border-gray-600">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-600">
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="lead_assignment">Lead Assignment</SelectItem>
            <SelectItem value="project_assignment">Project Assignment</SelectItem>
            <SelectItem value="vendor_assignment">Vendor Assignment</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Rules Table */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Rule Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Priority</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {rulesLoading ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-gray-400">Loading...</td>
              </tr>
            ) : rules.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-gray-400">No assignment rules found</td>
              </tr>
            ) : (
              rules.map((rule: AssignmentRule) => (
                <tr key={rule.id} className="hover:bg-gray-750">
                  <td className="px-6 py-4">
                    <div className="text-white font-medium">{rule.name}</div>
                    <div className="text-gray-400 text-sm">{rule.description}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-blue-900 text-blue-300 rounded text-xs">
                      {rule.rule_type.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center text-purple-400">
                      <TrendingUp className="h-4 w-4 mr-1" />
                      {rule.priority}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {rule.is_active ? (
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
                        onClick={() => handleEditRule(rule)}
                        className="text-blue-400 hover:text-blue-300"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteRule(rule.id)}
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

      {/* Create Rule Dialog */}
      <Dialog open={isCreateRuleDialogOpen} onOpenChange={setIsCreateRuleDialogOpen}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Assignment Rule</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2 col-span-2">
              <Label>Rule Name</Label>
              <Input
                value={ruleFormData.name}
                onChange={(e) => setRuleFormData({ ...ruleFormData, name: e.target.value })}
                className="bg-gray-700 border-gray-600"
                placeholder="City-based Lead Assignment"
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Description</Label>
              <Input
                value={ruleFormData.description}
                onChange={(e) => setRuleFormData({ ...ruleFormData, description: e.target.value })}
                className="bg-gray-700 border-gray-600"
                placeholder="Assign leads to designers in the same city"
              />
            </div>
            <div className="space-y-2">
              <Label>Rule Type</Label>
              <Select value={ruleFormData.rule_type} onValueChange={(value) => setRuleFormData({ ...ruleFormData, rule_type: value })}>
                <SelectTrigger className="bg-gray-700 border-gray-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  <SelectItem value="lead_assignment">Lead Assignment</SelectItem>
                  <SelectItem value="project_assignment">Project Assignment</SelectItem>
                  <SelectItem value="vendor_assignment">Vendor Assignment</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority (lower = higher priority)</Label>
              <Input
                type="number"
                value={ruleFormData.priority}
                onChange={(e) => setRuleFormData({ ...ruleFormData, priority: parseInt(e.target.value) })}
                className="bg-gray-700 border-gray-600"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Active</Label>
                <Switch
                  checked={ruleFormData.is_active}
                  onCheckedChange={(checked) => setRuleFormData({ ...ruleFormData, is_active: checked })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateRuleDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateRule} disabled={createRuleMutation.isPending}>
              {createRuleMutation.isPending ? 'Creating...' : 'Create Rule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Rule Dialog */}
      <Dialog open={isEditRuleDialogOpen} onOpenChange={setIsEditRuleDialogOpen}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Assignment Rule</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2 col-span-2">
              <Label>Rule Name</Label>
              <Input
                value={ruleFormData.name}
                onChange={(e) => setRuleFormData({ ...ruleFormData, name: e.target.value })}
                className="bg-gray-700 border-gray-600"
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Description</Label>
              <Input
                value={ruleFormData.description}
                onChange={(e) => setRuleFormData({ ...ruleFormData, description: e.target.value })}
                className="bg-gray-700 border-gray-600"
              />
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Input
                type="number"
                value={ruleFormData.priority}
                onChange={(e) => setRuleFormData({ ...ruleFormData, priority: parseInt(e.target.value) })}
                className="bg-gray-700 border-gray-600"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Active</Label>
                <Switch
                  checked={ruleFormData.is_active}
                  onCheckedChange={(checked) => setRuleFormData({ ...ruleFormData, is_active: checked })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditRuleDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateRule} disabled={updateRuleMutation.isPending}>
              {updateRuleMutation.isPending ? 'Updating...' : 'Update Rule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Algorithm Settings Dialog */}
      <Dialog open={isSettingsDialogOpen} onOpenChange={setIsSettingsDialogOpen}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>Algorithm Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <Label>Location Matching Weight</Label>
                  <span className="text-sm text-gray-400">{(algorithmSettings.location_weight * 100).toFixed(0)}%</span>
                </div>
                <Slider
                  value={[algorithmSettings.location_weight * 100]}
                  onValueChange={(value) => setAlgorithmSettings({ ...algorithmSettings, location_weight: value[0] / 100 })}
                  max={100}
                  step={5}
                  className="w-full"
                />
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <Label>Expertise Matching Weight</Label>
                  <span className="text-sm text-gray-400">{(algorithmSettings.expertise_weight * 100).toFixed(0)}%</span>
                </div>
                <Slider
                  value={[algorithmSettings.expertise_weight * 100]}
                  onValueChange={(value) => setAlgorithmSettings({ ...algorithmSettings, expertise_weight: value[0] / 100 })}
                  max={100}
                  step={5}
                  className="w-full"
                />
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <Label>Performance Matching Weight</Label>
                  <span className="text-sm text-gray-400">{(algorithmSettings.performance_weight * 100).toFixed(0)}%</span>
                </div>
                <Slider
                  value={[algorithmSettings.performance_weight * 100]}
                  onValueChange={(value) => setAlgorithmSettings({ ...algorithmSettings, performance_weight: value[0] / 100 })}
                  max={100}
                  step={5}
                  className="w-full"
                />
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <Label>Availability Matching Weight</Label>
                  <span className="text-sm text-gray-400">{(algorithmSettings.availability_weight * 100).toFixed(0)}%</span>
                </div>
                <Slider
                  value={[algorithmSettings.availability_weight * 100]}
                  onValueChange={(value) => setAlgorithmSettings({ ...algorithmSettings, availability_weight: value[0] / 100 })}
                  max={100}
                  step={5}
                  className="w-full"
                />
              </div>
              <div className="pt-4 border-t border-gray-700">
                <Label>Max Leads Per Designer</Label>
                <Input
                  type="number"
                  value={algorithmSettings.max_leads_per_designer}
                  onChange={(e) => setAlgorithmSettings({ ...algorithmSettings, max_leads_per_designer: parseInt(e.target.value) })}
                  className="bg-gray-700 border-gray-600 mt-2"
                />
              </div>
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

      {/* Test Algorithm Dialog */}
      <Dialog open={isTestDialogOpen} onOpenChange={setIsTestDialogOpen}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-3xl">
          <DialogHeader>
            <DialogTitle>Test Assignment Algorithm</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>City</Label>
                <Input
                  value={testData.city}
                  onChange={(e) => setTestData({ ...testData, city: e.target.value })}
                  className="bg-gray-700 border-gray-600"
                  placeholder="Mumbai"
                />
              </div>
              <div className="space-y-2">
                <Label>Project Type</Label>
                <Input
                  value={testData.project_type}
                  onChange={(e) => setTestData({ ...testData, project_type: e.target.value })}
                  className="bg-gray-700 border-gray-600"
                  placeholder="Residential"
                />
              </div>
              <div className="space-y-2">
                <Label>Budget (₹)</Label>
                <Input
                  type="number"
                  value={testData.budget}
                  onChange={(e) => setTestData({ ...testData, budget: parseInt(e.target.value) })}
                  className="bg-gray-700 border-gray-600"
                />
              </div>
            </div>
            <Button onClick={handleTestAlgorithm} className="w-full" disabled={testAlgorithmMutation.isPending}>
              {testAlgorithmMutation.isPending ? 'Testing...' : 'Run Test'}
            </Button>
            {testAlgorithmMutation.data && (
              <div className="bg-gray-900 p-4 rounded-lg space-y-4">
                <h3 className="text-lg font-semibold text-white">Test Results</h3>
                <div className="space-y-2">
                  <p className="text-gray-400 text-sm">
                    Active Rules: {testAlgorithmMutation.data.active_rules?.length || 0}
                  </p>
                  {testAlgorithmMutation.data.recommended_designer && (
                    <div className="bg-green-900/20 border border-green-700 p-3 rounded">
                      <p className="text-green-400 font-medium">Recommended Designer</p>
                      <p className="text-white">{testAlgorithmMutation.data.recommended_designer.designer_name}</p>
                      <p className="text-gray-400 text-sm">Score: {testAlgorithmMutation.data.recommended_designer.total_score}</p>
                    </div>
                  )}
                  {testAlgorithmMutation.data.designer_scores && testAlgorithmMutation.data.designer_scores.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-gray-400 text-sm font-medium">All Designer Scores:</p>
                      {testAlgorithmMutation.data.designer_scores.slice(0, 5).map((score: any, idx: number) => (
                        <div key={idx} className="bg-gray-800 p-2 rounded flex justify-between">
                          <span className="text-white">{score.designer_name || `Designer ${score.designer_id}`}</span>
                          <span className="text-blue-400">{score.total_score}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTestDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AssignmentConfigPage;



