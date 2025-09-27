import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/use-toast';
import {
  Users,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  UserCheck,
  UserX,
} from 'lucide-react';
import apiClient, { User } from '../../lib/api-client';
import CreateUserModal from '../../components/users/CreateUserModal';
import UserDetailsModal from '../../components/users/UserDetailsModal';
import EditUserModal from '../../components/users/EditUserModal';

export default function UsersPage() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [page, setPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch users
  const { data: usersData, isLoading, error } = useQuery({
    queryKey: ['users', { page, search, roleFilter, cityFilter }],
    queryFn: () =>
      apiClient.getUsers({
        page,
        limit: 20,
        search: search || undefined,
        role: roleFilter || undefined,
        city: cityFilter || undefined,
      }),
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: (userId: number) => apiClient.deleteUser(userId),
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'User deleted successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete user',
        variant: 'destructive',
      });
    },
  });

  // Toggle user status mutation
  const toggleUserStatusMutation = useMutation({
    mutationFn: ({ userId, isActive }: { userId: number; isActive: boolean }) =>
      apiClient.updateUser(userId, { isActive }),
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'User status updated successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update user status',
        variant: 'destructive',
      });
    },
  });

  const handleDeleteUser = (user: User) => {
    if (window.confirm(`Are you sure you want to delete ${user.firstName} ${user.lastName}?`)) {
      deleteUserMutation.mutate(user.id);
    }
  };

  const handleToggleUserStatus = (user: User) => {
    toggleUserStatusMutation.mutate({
      userId: user.id,
      isActive: !user.isActive,
    });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  const getRoleBadgeColor = (roles: string[]) => {
    if (roles.includes('super_admin')) return 'bg-purple-500/20 text-purple-300';
    if (roles.includes('admin')) return 'bg-red-500/20 text-red-300';
    if (roles.includes('project_manager')) return 'bg-blue-500/20 text-blue-300';
    if (roles.includes('interior_designer')) return 'bg-green-500/20 text-green-300';
    if (roles.includes('vendor')) return 'bg-orange-500/20 text-orange-300';
    if (roles.includes('finance_manager')) return 'bg-yellow-500/20 text-yellow-300';
    return 'bg-gray-500/20 text-gray-300';
  };

  if (error) {
    return (
      <div className="p-6">
        <Card className="bg-red-500/10 border-red-500/20">
          <CardContent className="p-6">
            <p className="text-red-400">Error loading users: {(error as any).message}</p>
            <Button
              onClick={() => queryClient.invalidateQueries({ queryKey: ['users'] })}
              className="mt-4"
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <Users className="h-8 w-8" />
            User Management
          </h1>
          <p className="text-gray-400 mt-1">
            Manage users, roles, and permissions
          </p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-green-500 hover:bg-green-600 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>

      {/* Filters */}
      <Card className="bg-gray-900/50 border-gray-700">
        <CardContent className="p-6">
          <form onSubmit={handleSearch} className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-300 mb-2 block">
                Search Users
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name or email..."
                  className="pl-10 bg-gray-800 border-gray-600 text-white"
                />
              </div>
            </div>

            <div className="min-w-[150px]">
              <label className="text-sm font-medium text-gray-300 mb-2 block">
                Role
              </label>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full bg-gray-800 border-gray-600 text-white rounded-md px-3 py-2"
              >
                <option value="">All Roles</option>
                <option value="super_admin">Super Admin</option>
                <option value="admin">Admin</option>
                <option value="project_manager">Project Manager</option>
                <option value="interior_designer">Interior Designer</option>
                <option value="customer">Customer</option>
                <option value="vendor">Vendor</option>
                <option value="finance_manager">Finance Manager</option>
              </select>
            </div>

            <div className="min-w-[150px]">
              <label className="text-sm font-medium text-gray-300 mb-2 block">
                City
              </label>
              <Input
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                placeholder="Filter by city"
                className="bg-gray-800 border-gray-600 text-white"
              />
            </div>

            <Button type="submit" className="bg-blue-500 hover:bg-blue-600">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="bg-gray-900/50 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center justify-between">
            <span>Users ({usersData?.total || 0})</span>
            {isLoading && (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-green-500 border-t-transparent" />
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse flex items-center space-x-4">
                  <div className="rounded-full bg-gray-700 h-10 w-10" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-700 rounded w-1/4" />
                    <div className="h-3 bg-gray-700 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-gray-700">
                  <TableHead className="text-gray-300">User</TableHead>
                  <TableHead className="text-gray-300">Email</TableHead>
                  <TableHead className="text-gray-300">Roles</TableHead>
                  <TableHead className="text-gray-300">City</TableHead>
                  <TableHead className="text-gray-300">Status</TableHead>
                  <TableHead className="text-gray-300">Joined</TableHead>
                  <TableHead className="text-gray-300 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usersData?.users?.map((user) => (
                  <TableRow key={user.id} className="border-gray-700 hover:bg-gray-800/50">
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center text-white text-sm font-medium">
                          {user.firstName?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <div>
                          <p className="text-white font-medium">
                            {user.firstName} {user.lastName}
                          </p>
                          <p className="text-gray-400 text-sm">{user.phone}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-300">{user.email}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.roles?.map((role) => (
                          <Badge
                            key={role}
                            className={`text-xs ${getRoleBadgeColor(user.roles)}`}
                          >
                            {role.replace('_', ' ').toUpperCase()}
                          </Badge>
                        )) || (
                          <Badge className="text-xs bg-gray-500/20 text-gray-300">
                            No Role
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-300">{user.city || 'N/A'}</TableCell>
                    <TableCell>
                      <Badge
                        className={`text-xs ${
                          user.isActive
                            ? 'bg-green-500/20 text-green-300'
                            : 'bg-red-500/20 text-red-300'
                        }`}
                      >
                        {user.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-300">
                      {user.createdAt
                        ? new Date(user.createdAt).toLocaleDateString()
                        : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-gray-800 border-gray-600">
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedUser(user);
                              setShowDetailsModal(true);
                            }}
                            className="text-gray-300 hover:bg-gray-700"
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedUser(user);
                              setShowEditModal(true);
                            }}
                            className="text-gray-300 hover:bg-gray-700"
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit User
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleToggleUserStatus(user)}
                            className="text-gray-300 hover:bg-gray-700"
                          >
                            {user.isActive ? (
                              <UserX className="mr-2 h-4 w-4" />
                            ) : (
                              <UserCheck className="mr-2 h-4 w-4" />
                            )}
                            {user.isActive ? 'Deactivate' : 'Activate'}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteUser(user)}
                            className="text-red-400 hover:bg-red-500/20"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete User
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Pagination */}
          {usersData && usersData.total > 20 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-gray-400 text-sm">
                Showing {((page - 1) * 20) + 1} to {Math.min(page * 20, usersData.total)} of {usersData.total} users
              </p>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="border-gray-600 text-gray-300"
                >
                  Previous
                </Button>
                <span className="text-gray-300 text-sm">
                  Page {page} of {Math.ceil(usersData.total / 20)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => p + 1)}
                  disabled={page >= Math.ceil(usersData.total / 20)}
                  className="border-gray-600 text-gray-300"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      {showCreateModal && (
        <CreateUserModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            queryClient.invalidateQueries({ queryKey: ['users'] });
          }}
        />
      )}

      {selectedUser && showDetailsModal && (
        <UserDetailsModal
          user={selectedUser}
          isOpen={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedUser(null);
          }}
        />
      )}

      {selectedUser && showEditModal && (
        <EditUserModal
          user={selectedUser}
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedUser(null);
          }}
          onSuccess={() => {
            setShowEditModal(false);
            setSelectedUser(null);
            queryClient.invalidateQueries({ queryKey: ['users'] });
          }}
        />
      )}
    </div>
  );
}