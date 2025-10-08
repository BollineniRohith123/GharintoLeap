import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, Menu as MenuIcon, ChevronRight, GripVertical } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { Checkbox } from '../../components/ui/checkbox';

interface Menu {
  id: number;
  name: string;
  display_name: string;
  icon: string | null;
  path: string | null;
  parent_id: number | null;
  sort_order: number;
  is_active: boolean;
  assigned_roles: string[];
}

interface Role {
  id: number;
  name: string;
  display_name: string;
}

const MenuConfigurationPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [selectedMenu, setSelectedMenu] = useState<Menu | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<number[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    display_name: '',
    icon: '',
    path: '',
    parent_id: '',
    sort_order: 0,
    is_active: true,
  });

  // Fetch all menus
  const { data: menusData, isLoading } = useQuery({
    queryKey: ['menus-all'],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('http://localhost:4000/menus/all', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch menus');
      return response.json();
    },
  });

  // Fetch roles
  const { data: rolesData } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('http://localhost:4000/roles', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch roles');
      return response.json();
    },
  });

  // Create menu mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('http://localhost:4000/menus', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create menu');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menus-all'] });
      setIsCreateDialogOpen(false);
      resetForm();
    },
  });

  // Update menu mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`http://localhost:4000/menus/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to update menu');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menus-all'] });
      setIsEditDialogOpen(false);
      setSelectedMenu(null);
    },
  });

  // Delete menu mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`http://localhost:4000/menus/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete menu');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menus-all'] });
    },
  });

  // Assign roles mutation
  const assignRolesMutation = useMutation({
    mutationFn: async ({ menuId, roleIds }: { menuId: number; roleIds: number[] }) => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`http://localhost:4000/menus/${menuId}/assign-roles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ role_ids: roleIds })
      });
      if (!response.ok) throw new Error('Failed to assign roles');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menus-all'] });
      setIsRoleDialogOpen(false);
      setSelectedMenu(null);
      setSelectedRoles([]);
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      display_name: '',
      icon: '',
      path: '',
      parent_id: '',
      sort_order: 0,
      is_active: true,
    });
  };

  const handleCreate = () => {
    const payload = {
      ...formData,
      parent_id: formData.parent_id ? parseInt(formData.parent_id) : null,
      path: formData.path || null,
      icon: formData.icon || null,
    };
    createMutation.mutate(payload);
  };

  const handleEdit = (menu: Menu) => {
    setSelectedMenu(menu);
    setFormData({
      name: menu.name,
      display_name: menu.display_name,
      icon: menu.icon || '',
      path: menu.path || '',
      parent_id: menu.parent_id?.toString() || '',
      sort_order: menu.sort_order,
      is_active: menu.is_active,
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = () => {
    if (selectedMenu) {
      const payload = {
        display_name: formData.display_name,
        icon: formData.icon || null,
        path: formData.path || null,
        parent_id: formData.parent_id ? parseInt(formData.parent_id) : null,
        sort_order: formData.sort_order,
        is_active: formData.is_active,
      };
      updateMutation.mutate({ id: selectedMenu.id, data: payload });
    }
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this menu item?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleManageRoles = (menu: Menu) => {
    setSelectedMenu(menu);
    const roles = rolesData?.roles || [];
    const assignedRoleIds = roles
      .filter((r: Role) => menu.assigned_roles?.includes(r.name))
      .map((r: Role) => r.id);
    setSelectedRoles(assignedRoleIds);
    setIsRoleDialogOpen(true);
  };

  const handleAssignRoles = () => {
    if (selectedMenu) {
      assignRolesMutation.mutate({ menuId: selectedMenu.id, roleIds: selectedRoles });
    }
  };

  const toggleRole = (roleId: number) => {
    setSelectedRoles(prev =>
      prev.includes(roleId) ? prev.filter(id => id !== roleId) : [...prev, roleId]
    );
  };

  const menus = menusData?.menus || [];
  const roles = rolesData?.roles || [];
  const parentMenus = menus.filter((m: Menu) => !m.parent_id);
  const childMenus = (parentId: number) => menus.filter((m: Menu) => m.parent_id === parentId);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Menu Configuration</h1>
          <p className="text-gray-400 mt-1">Manage sidebar menu items and role-based access</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)} className="bg-green-600 hover:bg-green-700">
          <Plus className="h-4 w-4 mr-2" />
          Add Menu Item
        </Button>
      </div>

      {/* Menu Tree */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        {isLoading ? (
          <p className="text-gray-400 text-center py-8">Loading...</p>
        ) : menus.length === 0 ? (
          <p className="text-gray-400 text-center py-8">No menu items found</p>
        ) : (
          <div className="space-y-2">
            {parentMenus.map((menu: Menu) => (
              <div key={menu.id} className="space-y-1">
                {/* Parent Menu */}
                <div className="flex items-center justify-between p-3 bg-gray-900 rounded-lg hover:bg-gray-750">
                  <div className="flex items-center gap-3">
                    <GripVertical className="h-4 w-4 text-gray-500" />
                    <MenuIcon className="h-4 w-4 text-blue-400" />
                    <div>
                      <div className="text-white font-medium">{menu.display_name}</div>
                      <div className="text-gray-400 text-sm">
                        {menu.path || 'No path'} • Order: {menu.sort_order}
                      </div>
                    </div>
                    {!menu.is_active && (
                      <span className="px-2 py-1 bg-red-900 text-red-300 rounded text-xs">Inactive</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleManageRoles(menu)}
                      className="text-purple-400 hover:text-purple-300"
                    >
                      Roles ({menu.assigned_roles?.length || 0})
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEdit(menu)}
                      className="text-blue-400 hover:text-blue-300"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(menu.id)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Child Menus */}
                {childMenus(menu.id).map((child: Menu) => (
                  <div key={child.id} className="flex items-center justify-between p-3 bg-gray-850 rounded-lg hover:bg-gray-750 ml-8">
                    <div className="flex items-center gap-3">
                      <ChevronRight className="h-4 w-4 text-gray-500" />
                      <div>
                        <div className="text-white">{child.display_name}</div>
                        <div className="text-gray-400 text-sm">
                          {child.path || 'No path'} • Order: {child.sort_order}
                        </div>
                      </div>
                      {!child.is_active && (
                        <span className="px-2 py-1 bg-red-900 text-red-300 rounded text-xs">Inactive</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleManageRoles(child)}
                        className="text-purple-400 hover:text-purple-300"
                      >
                        Roles ({child.assigned_roles?.length || 0})
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(child)}
                        className="text-blue-400 hover:text-blue-300"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(child.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Menu Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Menu Item</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>Menu Name (lowercase, no spaces)</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value.toLowerCase().replace(/\s/g, '_') })}
                className="bg-gray-700 border-gray-600"
                placeholder="city_management"
              />
            </div>
            <div className="space-y-2">
              <Label>Display Name</Label>
              <Input
                value={formData.display_name}
                onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                className="bg-gray-700 border-gray-600"
                placeholder="City Management"
              />
            </div>
            <div className="space-y-2">
              <Label>Icon (Lucide icon name)</Label>
              <Input
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                className="bg-gray-700 border-gray-600"
                placeholder="MapPin"
              />
            </div>
            <div className="space-y-2">
              <Label>Path (leave empty for parent menus)</Label>
              <Input
                value={formData.path}
                onChange={(e) => setFormData({ ...formData, path: e.target.value })}
                className="bg-gray-700 border-gray-600"
                placeholder="/system/cities"
              />
            </div>
            <div className="space-y-2">
              <Label>Parent Menu</Label>
              <Select value={formData.parent_id} onValueChange={(value) => setFormData({ ...formData, parent_id: value })}>
                <SelectTrigger className="bg-gray-700 border-gray-600">
                  <SelectValue placeholder="None (Top Level)" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  <SelectItem value="">None (Top Level)</SelectItem>
                  {parentMenus.map((menu: Menu) => (
                    <SelectItem key={menu.id} value={menu.id.toString()}>{menu.display_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Sort Order</Label>
              <Input
                type="number"
                value={formData.sort_order}
                onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) })}
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
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create Menu'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Menu Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Menu Item</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>Display Name</Label>
              <Input
                value={formData.display_name}
                onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                className="bg-gray-700 border-gray-600"
              />
            </div>
            <div className="space-y-2">
              <Label>Icon</Label>
              <Input
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                className="bg-gray-700 border-gray-600"
              />
            </div>
            <div className="space-y-2">
              <Label>Path</Label>
              <Input
                value={formData.path}
                onChange={(e) => setFormData({ ...formData, path: e.target.value })}
                className="bg-gray-700 border-gray-600"
              />
            </div>
            <div className="space-y-2">
              <Label>Sort Order</Label>
              <Input
                type="number"
                value={formData.sort_order}
                onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) })}
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
              {updateMutation.isPending ? 'Updating...' : 'Update Menu'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Role Assignment Dialog */}
      <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Roles to Menu</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-400 text-sm mb-4">
              Select which roles can see this menu item: <strong>{selectedMenu?.display_name}</strong>
            </p>
            <div className="space-y-3">
              {roles.map((role: Role) => (
                <div key={role.id} className="flex items-center space-x-3">
                  <Checkbox
                    id={`role-${role.id}`}
                    checked={selectedRoles.includes(role.id)}
                    onCheckedChange={() => toggleRole(role.id)}
                  />
                  <label
                    htmlFor={`role-${role.id}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {role.display_name}
                  </label>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRoleDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAssignRoles} disabled={assignRolesMutation.isPending}>
              {assignRolesMutation.isPending ? 'Assigning...' : 'Assign Roles'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MenuConfigurationPage;


