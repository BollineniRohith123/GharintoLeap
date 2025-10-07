import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MessageSquare, Send, Bell, Mail, Users, Search, Filter, Plus, CheckCheck, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import apiClient from '@/lib/api-client';

interface Message {
  id: number;
  conversation_id: number;
  sender_id: number;
  sender_name: string;
  content: string;
  created_at: string;
  is_read: boolean;
}

interface Conversation {
  id: number;
  title: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
  participants: number;
}

interface Notification {
  id: number;
  title: string;
  content: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

export default function CommunicationsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('messages');
  const [selectedConversation, setSelectedConversation] = useState<number | null>(null);
  const [messageContent, setMessageContent] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch conversations
  const { data: conversationsData, isLoading: conversationsLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => apiClient.get('/communications/conversations'),
    enabled: activeTab === 'messages',
  });

  // Fetch messages for selected conversation
  const { data: messagesData, isLoading: messagesLoading } = useQuery({
    queryKey: ['messages', selectedConversation],
    queryFn: () => apiClient.get(`/communications/conversations/${selectedConversation}/messages`),
    enabled: !!selectedConversation,
  });

  // Fetch notifications
  const { data: notificationsData, isLoading: notificationsLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => apiClient.getNotifications(),
    enabled: activeTab === 'notifications',
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: (data: { conversation_id: number; content: string }) =>
      apiClient.post('/communications/messages', data),
    onSuccess: () => {
      setMessageContent('');
      queryClient.invalidateQueries({ queryKey: ['messages', selectedConversation] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      toast({
        title: 'Success',
        description: 'Message sent successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send message',
        variant: 'destructive',
      });
    },
  });

  // Mark notification as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: (id: number) => apiClient.markNotificationAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const handleSendMessage = () => {
    if (!messageContent.trim() || !selectedConversation) return;
    sendMessageMutation.mutate({
      conversation_id: selectedConversation,
      content: messageContent,
    });
  };

  const conversations = conversationsData?.data?.conversations || [];
  const messages = messagesData?.data?.messages || [];
  const notifications = notificationsData?.notifications || [];

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <MessageSquare className="h-8 w-8" />
            Communications
          </h1>
          <p className="text-gray-400 mt-1">
            Manage messages, notifications, and team communications
          </p>
        </div>
        <Button className="bg-blue-500 hover:bg-blue-600">
          <Plus className="h-4 w-4 mr-2" />
          New Message
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Unread Messages</p>
                <p className="text-2xl font-bold text-white mt-1">
                  {conversations.reduce((sum: number, c: Conversation) => sum + c.unread_count, 0)}
                </p>
              </div>
              <MessageSquare className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Active Conversations</p>
                <p className="text-2xl font-bold text-white mt-1">{conversations.length}</p>
              </div>
              <Users className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Notifications</p>
                <p className="text-2xl font-bold text-white mt-1">
                  {notifications.filter((n: Notification) => !n.is_read).length}
                </p>
              </div>
              <Bell className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Messages</p>
                <p className="text-2xl font-bold text-white mt-1">
                  {messages.length}
                </p>
              </div>
              <Mail className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-gray-800">
          <TabsTrigger value="messages" className="data-[state=active]:bg-blue-600">
            <MessageSquare className="w-4 h-4 mr-2" />
            Messages
          </TabsTrigger>
          <TabsTrigger value="notifications" className="data-[state=active]:bg-blue-600">
            <Bell className="w-4 h-4 mr-2" />
            Notifications
          </TabsTrigger>
        </TabsList>

        {/* Messages Tab */}
        <TabsContent value="messages" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Conversations List */}
            <Card className="bg-gray-800 border-gray-700 lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-white">Conversations</CardTitle>
                <div className="relative mt-2">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search conversations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-gray-700 border-gray-600 text-white"
                  />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {conversationsLoading ? (
                  <div className="p-8 text-center text-gray-400">Loading...</div>
                ) : conversations.length === 0 ? (
                  <div className="p-8 text-center">
                    <MessageSquare className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">No conversations yet</p>
                    <p className="text-gray-500 text-sm">Start a new conversation</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-700 max-h-[600px] overflow-y-auto">
                    {conversations.map((conv: Conversation) => (
                      <div
                        key={conv.id}
                        onClick={() => setSelectedConversation(conv.id)}
                        className={`p-4 cursor-pointer transition-colors hover:bg-gray-700/50 ${
                          selectedConversation === conv.id ? 'bg-gray-700' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-medium truncate">{conv.title}</p>
                            <p className="text-gray-400 text-sm truncate mt-1">{conv.last_message}</p>
                          </div>
                          {conv.unread_count > 0 && (
                            <Badge className="bg-blue-500 text-white ml-2">{conv.unread_count}</Badge>
                          )}
                        </div>
                        <p className="text-gray-500 text-xs mt-2">{formatTime(conv.last_message_at)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Messages View */}
            <Card className="bg-gray-800 border-gray-700 lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-white">
                  {selectedConversation ? 'Messages' : 'Select a conversation'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!selectedConversation ? (
                  <div className="h-[500px] flex items-center justify-center">
                    <div className="text-center">
                      <MessageSquare className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                      <p className="text-gray-400">Select a conversation to view messages</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Messages List */}
                    <div className="h-[400px] overflow-y-auto space-y-3 p-4 bg-gray-900 rounded-lg">
                      {messagesLoading ? (
                        <div className="text-center text-gray-400">Loading messages...</div>
                      ) : messages.length === 0 ? (
                        <div className="text-center text-gray-400">No messages yet</div>
                      ) : (
                        messages.map((msg: Message) => (
                          <div key={msg.id} className="flex items-start gap-3">
                            <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                              {msg.sender_name?.[0]?.toUpperCase() || 'U'}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="text-white font-medium text-sm">{msg.sender_name}</p>
                                <p className="text-gray-500 text-xs">{formatTime(msg.created_at)}</p>
                                {msg.is_read && <CheckCheck className="h-3 w-3 text-blue-500" />}
                              </div>
                              <p className="text-gray-300 text-sm mt-1">{msg.content}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Message Input */}
                    <div className="flex gap-2">
                      <Textarea
                        placeholder="Type your message..."
                        value={messageContent}
                        onChange={(e) => setMessageContent(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        className="bg-gray-700 border-gray-600 text-white resize-none"
                        rows={3}
                      />
                      <Button
                        onClick={handleSendMessage}
                        disabled={!messageContent.trim() || sendMessageMutation.isPending}
                        className="bg-blue-500 hover:bg-blue-600"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="mt-6">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white">Notifications</CardTitle>
                <Button variant="outline" size="sm" className="border-gray-600 text-gray-300">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {notificationsLoading ? (
                <div className="p-8 text-center text-gray-400">Loading notifications...</div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">No notifications</p>
                  <p className="text-gray-500 text-sm">You're all caught up!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {notifications.map((notification: Notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 rounded-lg border transition-colors cursor-pointer ${
                        !notification.is_read
                          ? 'bg-blue-900/20 border-blue-700 hover:bg-blue-900/30'
                          : 'bg-gray-900 border-gray-700 hover:bg-gray-900/50'
                      }`}
                      onClick={() => {
                        if (!notification.is_read) {
                          markAsReadMutation.mutate(notification.id);
                        }
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                          notification.type === 'success' ? 'bg-green-500/20 text-green-500' :
                          notification.type === 'warning' ? 'bg-yellow-500/20 text-yellow-500' :
                          notification.type === 'error' ? 'bg-red-500/20 text-red-500' :
                          'bg-blue-500/20 text-blue-500'
                        }`}>
                          <Bell className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-white font-medium">{notification.title}</p>
                            {!notification.is_read && (
                              <Badge className="bg-blue-500 text-white">New</Badge>
                            )}
                          </div>
                          <p className="text-gray-400 text-sm mt-1">{notification.content}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Clock className="h-3 w-3 text-gray-500" />
                            <p className="text-gray-500 text-xs">{formatTime(notification.created_at)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

