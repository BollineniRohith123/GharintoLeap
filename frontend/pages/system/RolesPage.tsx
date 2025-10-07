import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Shield, Users, Edit, Trash2, Plus, Check, X } from 'lucide-react';

interface Permission {
  id: number;
  name: string;
  display_name: string;
  description?: string;
  resource: string;
  action: string;
}

interface Role {
  id: number;
  name: string;
  display_name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  permissions: Permission[];
  user_count: number;
}

export default function RolesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [showPermissionsDialog, setShowPermissionsDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedPermissions, setSelectedPermissions] = useState<number[]>([]);
  const [newRole, setNewRole] = useState({
    name: '',
    display_name: '',
    description: '',
  });

  // Fetch roles
  const { data: rolesData, isLoading: rolesLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('http://localhost:4000/system/roles', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch roles');
      return response.json();
    },
  });

  // Fetch all permissions
  const { data: permissionsData } = useQuery({
    queryKey: ['permissions'],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('http://localhost:4000/system/permissions', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch permissions');
      return response.json();
    },
  });

  // Update role permissions mutation
  const updatePermissionsMutation = useMutation({
    mutationFn: async ({ roleId, permissionIds }: { roleId: number; permissionIds: number[] }) => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`http://localhost:4000/system/roles/${roleId}/permissions`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ permission_ids: permissionIds }),
      });
      if (!response.ok) throw new Error('Failed to update permissions');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Role permissions updated successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setShowPermissionsDialog(false);
      setSelectedRole(null);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Create role mutation
  const createRoleMutation = useMutation({
    mutationFn: async (roleData: typeof newRole) => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('http://localhost:4000/system/roles', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(roleData),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create role');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Role created successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setShowCreateDialog(false);
      setNewRole({ name: '', display_name: '', description: '' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ roleId, data }: { roleId: number; data: Partial<Role> }) => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`http://localhost:4000/system/roles/${roleId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update role');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Role updated successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setShowEditDialog(false);
      setSelectedRole(null);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete role mutation
  const deleteRoleMutation = useMutation({
    mutationFn: async (roleId: number) => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`http://localhost:4000/system/roles/${roleId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete role');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Role deleted successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleManagePermissions = (role: Role) => {
    setSelectedRole(role);
    setSelectedPermissions(role.permissions.map(p => p.id));
    setShowPermissionsDialog(true);
  };

  const handleTogglePermission = (permissionId: number) => {
    setSelectedPermissions(prev =>
      prev.includes(permissionId)
        ? prev.filter(id => id !== permissionId)
        : [...prev, permissionId]
    );
  };

  const handleSavePermissions = () => {
    if (selectedRole) {
      updatePermissionsMutation.mutate({
        roleId: selectedRole.id,
        permissionIds: selectedPermissions,
      });
    }
  };

  const handleCreateRole = () => {
    createRoleMutation.mutate(newRole);
  };

  const handleEditRole = (role: Role) => {
    setSelectedRole(role);
    setShowEditDialog(true);
  };

  const handleUpdateRole = () => {
    if (selectedRole) {
      updateRoleMutation.mutate({
        roleId: selectedRole.id,
        data: {
          display_name: selectedRole.display_name,
          description: selectedRole.description,
          is_active: selectedRole.is_active,
        },
      });
    }
  };

  const handleDeleteRole = (role: Role) => {
    if (window.confirm(`Are you sure you want to delete the role "${role.display_name}"?`)) {
      deleteRoleMutation.mutate(role.id);
    }
  };

  // Group permissions by resource
  const groupedPermissions = permissionsData?.permissions.reduce((acc: any, perm: Permission) => {
    if (!acc[perm.resource]) {
      acc[perm.resource] = [];
    }
    acc[perm.resource].push(perm);
    return acc;
  }, {}) || {};

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-2">
              <Shield className="h-8 w-8" />
              Role & Permission Management
            </h1>
            <p className="text-gray-300 mt-2">
              Manage system roles and assign granular permissions
            </p>
          </div>
          <Button
            onClick={() => setShowCreateDialog(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Role
          </Button>
        </div>

        {/* Roles Table */}
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">System Roles</CardTitle>
            <CardDescription className="text-gray-400">
              {rolesData?.total || 0} roles configured
            </CardDescription>
          </CardHeader>
          <CardContent>
            {rolesLoading ? (
              <div className="text-center py-8 text-gray-400">Loading roles...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-700">
                    <TableHead className="text-gray-300">Role Name</TableHead>
                    <TableHead className="text-gray-300">Description</TableHead>
                    <TableHead className="text-gray-300">Permissions</TableHead>
                    <TableHead className="text-gray-300">Users</TableHead>
                    <TableHead className="text-gray-300">Status</TableHead>
                    <TableHead className="text-gray-300 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rolesData?.roles.map((role: Role) => (
                    <TableRow key={role.id} className="border-gray-700 hover:bg-gray-800/50">
                      <TableCell className="text-white font-medium">
                        {role.display_name}
                        <div className="text-xs text-gray-400">{role.name}</div>
                      </TableCell>
                      <TableCell className="text-gray-300">
                        {role.description || 'No description'}
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-blue-500/20 text-blue-300">
                          {role.permissions?.length || 0} permissions
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-gray-300">
                          <Users className="h-4 w-4" />
                          {role.user_count || 0}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            role.is_active
                              ? 'bg-green-500/20 text-green-300'
                              : 'bg-red-500/20 text-red-300'
                          }
                        >
                          {role.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleManagePermissions(role)}
                            className="text-blue-400 hover:text-blue-300"
                          >
                            <Shield className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditRole(role)}
                            className="text-yellow-400 hover:text-yellow-300"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteRole(role)}
                            className="text-red-400 hover:text-red-300"
                            disabled={role.user_count > 0}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Manage Permissions Dialog */}
        <Dialog open={showPermissionsDialog} onOpenChange={setShowPermissionsDialog}>
          <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Manage Permissions - {selectedRole?.display_name}</DialogTitle>
              <DialogDescription className="text-gray-400">
                Select permissions to assign to this role
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {Object.entries(groupedPermissions).map(([resource, permissions]: [string, any]) => (
                <Card key={resource} className="bg-gray-900/50 border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-lg text-white capitalize">
                      {resource.replace('_', ' ')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3">
                      {permissions.map((perm: Permission) => (
                        <div
                          key={perm.id}
                          className="flex items-center space-x-2 p-2 rounded hover:bg-gray-800/50 cursor-pointer"
                          onClick={() => handleTogglePermission(perm.id)}
                        >
                          <div
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                              selectedPermissions.includes(perm.id)
                                ? 'bg-blue-600 border-blue-600'
                                : 'border-gray-600'
                            }`}
                          >
                            {selectedPermissions.includes(perm.id) && (
                              <Check className="h-3 w-3 text-white" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="text-sm text-white">{perm.display_name}</div>
                            {perm.description && (
                              <div className="text-xs text-gray-400">{perm.description}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowPermissionsDialog(false)}
                className="border-gray-600 text-gray-300"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSavePermissions}
                className="bg-blue-600 hover:bg-blue-700"
                disabled={updatePermissionsMutation.isPending}
              >
                {updatePermissionsMutation.isPending ? 'Saving...' : 'Save Permissions'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create Role Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="bg-gray-800 border-gray-700 text-white">
            <DialogHeader>
              <DialogTitle>Create New Role</DialogTitle>
              <DialogDescription className="text-gray-400">
                Create a new role with custom permissions
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="role-name" className="text-gray-300">
                  Role Name (System ID)
                </Label>
                <Input
                  id="role-name"
                  placeholder="e.g., custom_manager"
                  value={newRole.name}
                  onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                  className="bg-gray-900 border-gray-700 text-white"
                />
                <p className="text-xs text-gray-400">
                  Use lowercase with underscores (e.g., custom_manager)
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="display-name" className="text-gray-300">
                  Display Name
                </Label>
                <Input
                  id="display-name"
                  placeholder="e.g., Custom Manager"
                  value={newRole.display_name}
                  onChange={(e) => setNewRole({ ...newRole, display_name: e.target.value })}
                  className="bg-gray-900 border-gray-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description" className="text-gray-300">
                  Description
                </Label>
                <Textarea
                  id="description"
                  placeholder="Describe the role's purpose and responsibilities"
                  value={newRole.description}
                  onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                  className="bg-gray-900 border-gray-700 text-white"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
                className="border-gray-600 text-gray-300"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateRole}
                className="bg-blue-600 hover:bg-blue-700"
                disabled={!newRole.name || !newRole.display_name || createRoleMutation.isPending}
              >
                {createRoleMutation.isPending ? 'Creating...' : 'Create Role'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Role Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="bg-gray-800 border-gray-700 text-white">
            <DialogHeader>
              <DialogTitle>Edit Role</DialogTitle>
              <DialogDescription className="text-gray-400">
                Update role details
              </DialogDescription>
            </DialogHeader>
            {selectedRole && (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label className="text-gray-300">Role Name (System ID)</Label>
                  <Input
                    value={selectedRole.name}
                    disabled
                    className="bg-gray-900 border-gray-700 text-gray-500"
                  />
                  <p className="text-xs text-gray-400">System ID cannot be changed</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-display-name" className="text-gray-300">
                    Display Name
                  </Label>
                  <Input
                    id="edit-display-name"
                    value={selectedRole.display_name}
                    onChange={(e) =>
                      setSelectedRole({ ...selectedRole, display_name: e.target.value })
                    }
                    className="bg-gray-900 border-gray-700 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-description" className="text-gray-300">
                    Description
                  </Label>
                  <Textarea
                    id="edit-description"
                    value={selectedRole.description || ''}
                    onChange={(e) =>
                      setSelectedRole({ ...selectedRole, description: e.target.value })
                    }
                    className="bg-gray-900 border-gray-700 text-white"
                    rows={3}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is-active"
                    checked={selectedRole.is_active}
                    onChange={(e) =>
                      setSelectedRole({ ...selectedRole, is_active: e.target.checked })
                    }
                    className="h-4 w-4 rounded border-gray-600 bg-gray-900 text-blue-600"
                  />
                  <Label htmlFor="is-active" className="text-gray-300">
                    Active
                  </Label>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowEditDialog(false)}
                className="border-gray-600 text-gray-300"
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateRole}
                className="bg-blue-600 hover:bg-blue-700"
                disabled={updateRoleMutation.isPending}
              >
                {updateRoleMutation.isPending ? 'Updating...' : 'Update Role'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

