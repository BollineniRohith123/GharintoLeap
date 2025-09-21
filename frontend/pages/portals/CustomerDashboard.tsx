import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Home,
  Calendar,
  CreditCard,
  MessageSquare,
  FileText,
  Star,
  Clock,
  CheckCircle,
  DollarSign,
  Camera,
} from 'lucide-react';
import backend from '~backend/client';
import { useAuth } from '../../contexts/AuthContext';

export default function CustomerDashboard() {
  const { token } = useAuth();

  const authenticatedBackend = token 
    ? backend.with({ auth: () => ({ authorization: `Bearer ${token}` }) })
    : backend;

  const { data: projects } = useQuery({
    queryKey: ['customer-projects'],
    queryFn: () => authenticatedBackend.projects.listProjects({ limit: 5 }),
  });

  const { data: payments } = useQuery({
    queryKey: ['customer-payments'],
    queryFn: () => ({
      payments: [
        {
          id: '1',
          description: 'Design Phase Payment',
          amount: 50000,
          status: 'paid',
          dueDate: '2024-02-15',
          paidDate: '2024-02-14'
        },
        {
          id: '2', 
          description: 'Material Procurement',
          amount: 150000,
          status: 'pending',
          dueDate: '2024-03-20'
        },
        {
          id: '3',
          description: 'Installation Phase',
          amount: 75000,
          status: 'upcoming',
          dueDate: '2024-04-15'
        }
      ]
    }),
  });

  const stats = [
    {
      title: 'Active Projects',
      value: projects?.projects?.filter(p => p.status === 'in_progress').length || 0,
      icon: Home,
      color: 'text-blue-600',
    },
    {
      title: 'Payments Due',
      value: payments?.payments?.filter(p => p.status === 'pending').length || 0,
      icon: CreditCard,
      color: 'text-orange-600',
    },
    {
      title: 'Completed Milestones',
      value: '8/12',
      icon: CheckCircle,
      color: 'text-green-600',
    },
    {
      title: 'Messages',
      value: '3 new',
      icon: MessageSquare,
      color: 'text-purple-600',
    },
  ];

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'upcoming': return 'bg-blue-100 text-blue-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getProjectStatusColor = (status: string) => {
    switch (status) {
      case 'planning': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'on_hold': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Welcome Back!</h1>
        <p className="text-muted-foreground">
          Track your project progress and manage your home transformation journey
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        {/* Project Progress */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Your Projects</CardTitle>
            <CardDescription>
              Track the progress of your home transformation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {projects?.projects?.slice(0, 2).map((project) => (
                <div key={project.id} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">{project.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {project.location} • {project.designer?.name}
                      </p>
                    </div>
                    <Badge
                      variant="secondary"
                      className={getProjectStatusColor(project.status)}
                    >
                      {project.status?.replace('_', ' ')}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Overall Progress</span>
                      <span>{project.progress || 0}%</span>
                    </div>
                    <Progress value={project.progress || 0} className="h-2" />
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>Started: {project.startDate ? new Date(project.startDate).toLocaleDateString() : 'N/A'}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>Due: {project.endDate ? new Date(project.endDate).toLocaleDateString() : 'N/A'}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span>₹{(project.budget || 0).toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <Button size="sm" variant="outline">
                      View Details
                    </Button>
                    <Button size="sm" variant="outline">
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Message Team
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks and features</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full justify-start" variant="outline">
              <Camera className="mr-2 h-4 w-4" />
              View Progress Photos
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <FileText className="mr-2 h-4 w-4" />
              Download Documents
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <CreditCard className="mr-2 h-4 w-4" />
              Make Payment
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Star className="mr-2 h-4 w-4" />
              Rate & Review
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Payment Schedule */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Schedule</CardTitle>
            <CardDescription>Upcoming and completed payments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {payments?.payments?.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-1">
                    <p className="font-medium">{payment.description}</p>
                    <p className="text-sm text-muted-foreground">
                      Due: {new Date(payment.dueDate).toLocaleDateString()}
                    </p>
                    {payment.paidDate && (
                      <p className="text-sm text-green-600">
                        Paid: {new Date(payment.paidDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className="text-right space-y-2">
                    <p className="font-medium">₹{payment.amount.toLocaleString()}</p>
                    <Badge
                      variant="secondary"
                      className={getPaymentStatusColor(payment.status)}
                    >
                      {payment.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Updates */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Updates</CardTitle>
            <CardDescription>Latest activities on your projects</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                {
                  title: 'Kitchen Design Approved',
                  description: 'Your kitchen design has been approved and we\'re moving to the next phase.',
                  time: '2 hours ago',
                  type: 'approval'
                },
                {
                  title: 'Material Delivered',
                  description: 'Premium oak flooring has been delivered to your site.',
                  time: '1 day ago',
                  type: 'delivery'
                },
                {
                  title: 'Payment Reminder',
                  description: 'Material procurement payment is due in 3 days.',
                  time: '2 days ago',
                  type: 'payment'
                },
                {
                  title: 'Site Visit Scheduled',
                  description: 'Quality inspection scheduled for tomorrow at 10 AM.',
                  time: '3 days ago',
                  type: 'visit'
                }
              ].map((update, index) => (
                <div key={index} className="flex space-x-3">
                  <div className="flex-shrink-0">
                    <div className={`w-2 h-2 rounded-full mt-2 ${
                      update.type === 'approval' ? 'bg-green-500' :
                      update.type === 'delivery' ? 'bg-blue-500' :
                      update.type === 'payment' ? 'bg-orange-500' :
                      'bg-purple-500'
                    }`} />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="font-medium text-sm">{update.title}</p>
                    <p className="text-sm text-muted-foreground">{update.description}</p>
                    <p className="text-xs text-muted-foreground">{update.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Project Gallery */}
      <Card>
        <CardHeader>
          <CardTitle>Project Gallery</CardTitle>
          <CardDescription>Latest photos from your project sites</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="aspect-square bg-muted rounded-lg flex items-center justify-center">
                <Camera className="h-8 w-8 text-muted-foreground" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}