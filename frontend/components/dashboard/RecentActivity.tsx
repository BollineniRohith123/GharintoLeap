import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, User, Building2, Target } from 'lucide-react';

export default function RecentActivity() {
  // Mock data - in a real app, this would come from an API
  const activities = [
    {
      id: 1,
      type: 'project_created',
      title: 'New project created',
      description: 'Modern Apartment Renovation by John Doe',
      time: '2 hours ago',
      icon: Building2,
      status: 'success'
    },
    {
      id: 2,
      type: 'lead_assigned',
      title: 'Lead assigned',
      description: 'Kitchen renovation lead assigned to Sarah Wilson',
      time: '4 hours ago',
      icon: Target,
      status: 'info'
    },
    {
      id: 3,
      type: 'user_registered',
      title: 'New user registered',
      description: 'Designer Mike Johnson joined the platform',
      time: '6 hours ago',
      icon: User,
      status: 'success'
    },
    {
      id: 4,
      type: 'project_completed',
      title: 'Project completed',
      description: 'Luxury Villa Interior completed successfully',
      time: '1 day ago',
      icon: Building2,
      status: 'success'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'info':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Calendar className="h-5 w-5" />
          <span>Recent Activity</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-start space-x-3 p-3 border rounded-lg">
              <div className={`p-2 rounded-full ${getStatusColor(activity.status)}`}>
                <activity.icon className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium">{activity.title}</h4>
                <p className="text-sm text-muted-foreground">{activity.description}</p>
                <p className="text-xs text-muted-foreground mt-1">{activity.time}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
