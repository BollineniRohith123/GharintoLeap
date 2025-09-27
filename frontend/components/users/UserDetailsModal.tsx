import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  User as UserIcon,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Shield,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { User } from '../../lib/api-client';

interface UserDetailsModalProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
}

export default function UserDetailsModal({ user, isOpen, onClose }: UserDetailsModalProps) {
  const getRoleBadgeColor = (roles: string[]) => {
    if (roles.includes('super_admin')) return 'bg-purple-500/20 text-purple-300';
    if (roles.includes('admin')) return 'bg-red-500/20 text-red-300';
    if (roles.includes('project_manager')) return 'bg-blue-500/20 text-blue-300';
    if (roles.includes('interior_designer')) return 'bg-green-500/20 text-green-300';
    if (roles.includes('vendor')) return 'bg-orange-500/20 text-orange-300';
    if (roles.includes('finance_manager')) return 'bg-yellow-500/20 text-yellow-300';
    return 'bg-gray-500/20 text-gray-300';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-gray-700 text-white sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserIcon className="h-5 w-5" />
            User Details
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Detailed information about {user.firstName} {user.lastName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg text-white">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="h-16 w-16 rounded-full bg-green-500 flex items-center justify-center text-white text-xl font-bold">
                  {user.firstName?.[0]?.toUpperCase() || 'U'}
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white">
                    {user.firstName} {user.lastName}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    {user.isActive ? (
                      <Badge className="bg-green-500/20 text-green-300">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Active
                      </Badge>
                    ) : (
                      <Badge className="bg-red-500/20 text-red-300">
                        <XCircle className="h-3 w-3 mr-1" />
                        Inactive
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <Separator className="bg-gray-700" />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-3 text-gray-300">
                  <Mail className="h-4 w-4" />
                  <span>{user.email}</span>
                </div>
                {user.phone && (
                  <div className="flex items-center space-x-3 text-gray-300">
                    <Phone className="h-4 w-4" />
                    <span>{user.phone}</span>
                  </div>
                )}
                {user.city && (
                  <div className="flex items-center space-x-3 text-gray-300">
                    <MapPin className="h-4 w-4" />
                    <span>{user.city}</span>
                  </div>
                )}
                {user.createdAt && (
                  <div className="flex items-center space-x-3 text-gray-300">
                    <Calendar className="h-4 w-4" />
                    <span>Joined {new Date(user.createdAt).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Roles & Permissions */}
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg text-white flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Roles & Permissions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-300 mb-2">Assigned Roles</h4>
                <div className="flex flex-wrap gap-2">
                  {user.roles && user.roles.length > 0 ? (
                    user.roles.map((role) => (
                      <Badge
                        key={role}
                        className={`${getRoleBadgeColor(user.roles)}`}
                      >
                        {role.replace('_', ' ').toUpperCase()}
                      </Badge>
                    ))
                  ) : (
                    <Badge className="bg-gray-500/20 text-gray-300">
                      No Roles Assigned
                    </Badge>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-300 mb-2">Permissions</h4>
                <div className="max-h-32 overflow-y-auto">
                  {user.permissions && user.permissions.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {user.permissions.map((permission) => (
                        <Badge
                          key={permission}
                          variant="outline"
                          className="text-xs border-gray-600 text-gray-400"
                        >
                          {permission}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-400 text-sm">No specific permissions assigned</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Menu Access */}
          {user.menus && user.menus.length > 0 && (
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-lg text-white">Menu Access</CardTitle>
                <CardDescription className="text-gray-400">
                  Available navigation menus for this user
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {user.menus.map((menu) => (
                    <div
                      key={menu.name}
                      className="flex items-center space-x-2 p-2 rounded bg-gray-700/50"
                    >
                      <div className="h-6 w-6 rounded bg-gray-600 flex items-center justify-center">
                        <span className="text-xs text-gray-300">
                          {menu.icon || menu.displayName[0]}
                        </span>
                      </div>
                      <span className="text-sm text-gray-300">{menu.displayName}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}