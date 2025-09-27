import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Bell,
  Check,
  CheckCheck,
  Clock,
  AlertCircle,
  Info,
  Calendar,
  User,
  Briefcase,
  DollarSign,
  MessageSquare,
  X,
} from 'lucide-react';
import apiClient from '../../src/lib/api-client';

export default function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  
  const queryClient = useQueryClient();

  // Fetch notifications
  const { data: notificationsData, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => apiClient.getNotifications(),
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Mark notification as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: (id: number) => apiClient.markNotificationAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const notifications = notificationsData?.notifications || [];
  const unreadCount = notifications.filter(n => !n.is_read).length;

  const getNotificationIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'info':
        return <Info className="h-4 w-4 text-blue-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'success':
        return <CheckCheck className="h-4 w-4 text-green-500" />;
      case 'project':
        return <Briefcase className="h-4 w-4 text-purple-500" />;
      case 'payment':
        return <DollarSign className="h-4 w-4 text-green-500" />;
      case 'message':
        return <MessageSquare className="h-4 w-4 text-blue-500" />;
      case 'user':
        return <User className="h-4 w-4 text-gray-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'info':
        return 'border-l-blue-500 bg-blue-500/5';
      case 'warning':
        return 'border-l-yellow-500 bg-yellow-500/5';
      case 'error':
        return 'border-l-red-500 bg-red-500/5';
      case 'success':
        return 'border-l-green-500 bg-green-500/5';
      case 'project':
        return 'border-l-purple-500 bg-purple-500/5';
      case 'payment':
        return 'border-l-green-500 bg-green-500/5';
      case 'message':
        return 'border-l-blue-500 bg-blue-500/5';
      default:
        return 'border-l-gray-500 bg-gray-500/5';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return date.toLocaleDateString('en-IN');
  };

  const handleMarkAsRead = (notification: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!notification.is_read) {
      markAsReadMutation.mutate(notification.id);
    }
  };

  const handleNotificationClick = (notification: any) => {
    if (!notification.is_read) {
      markAsReadMutation.mutate(notification.id);
    }
    // Here you could add navigation logic based on notification type
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs bg-red-500 text-white rounded-full flex items-center justify-center"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        align="end" 
        className="w-96 bg-gray-900 border-gray-700 max-h-96 overflow-hidden"
      >
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Notifications</h3>
            {unreadCount > 0 && (
              <Badge className="bg-red-500/20 text-red-300">
                {unreadCount} new
              </Badge>
            )}
          </div>
        </div>

        <div className="max-h-80 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse flex items-start space-x-3">
                  <div className="rounded-full bg-gray-700 h-8 w-8" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-gray-700 rounded w-3/4" />
                    <div className="h-2 bg-gray-700 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="h-12 w-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No notifications</p>
              <p className="text-gray-500 text-sm">You're all caught up!</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-700">
              {notifications.slice(0, 10).map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 cursor-pointer transition-colors hover:bg-gray-800/50 border-l-4 ${getNotificationColor(notification.type)} ${
                    !notification.is_read ? 'bg-gray-800/20' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {getNotificationIcon(notification.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className={`text-sm font-medium ${!notification.is_read ? 'text-white' : 'text-gray-300'}`}>
                            {notification.title}
                          </p>
                          <p className="text-sm text-gray-400 mt-1 line-clamp-2">
                            {notification.message}
                          </p>
                        </div>
                        
                        <div className="flex items-center space-x-2 ml-2">
                          {!notification.is_read && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full" />
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 hover:bg-gray-700"
                            onClick={(e) => handleMarkAsRead(notification, e)}
                          >
                            {notification.is_read ? (
                              <CheckCheck className="h-3 w-3 text-gray-500" />
                            ) : (
                              <Check className="h-3 w-3 text-gray-400 hover:text-white" />
                            )}
                          </Button>
                        </div>
                      </div>
                      
                      <div className="flex items-center mt-2 text-xs text-gray-500">
                        <Clock className="h-3 w-3 mr-1" />
                        <span>{formatTimeAgo(notification.created_at)}</span>
                        {notification.read_at && (
                          <span className="ml-2 text-green-400">
                            ✓ Read
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {notifications.length > 0 && (
          <div className="p-4 border-t border-gray-700">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-white"
                onClick={() => {
                  // Mark all as read
                  notifications
                    .filter(n => !n.is_read)
                    .forEach(n => markAsReadMutation.mutate(n.id));
                }}
                disabled={unreadCount === 0}
              >
                <CheckCheck className="h-4 w-4 mr-2" />
                Mark all read
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                className="text-blue-400 hover:text-blue-300"
                onClick={() => setIsOpen(false)}
              >
                View all
              </Button>
            </div>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}