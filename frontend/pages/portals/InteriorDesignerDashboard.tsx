import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Users,
  DollarSign,
  Star,
  Briefcase,
  Calendar,
  TrendingUp,
  Palette,
  Award,
  CreditCard,
  Eye,
  Plus,
} from 'lucide-react';
import backend from '~backend/client';
import { useAuth } from '../../contexts/AuthContext';

export default function InteriorDesignerDashboard() {
  const { token } = useAuth();

  const authenticatedBackend = token 
    ? backend.with({ auth: () => ({ authorization: `Bearer ${token}` }) })
    : backend;

  const { data: leads, isLoading: leadsLoading } = useQuery({
    queryKey: ['designer-leads'],
    queryFn: () => authenticatedBackend.leads.listLeads({ limit: 5 }),
  });

  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ['designer-projects'],
    queryFn: () => authenticatedBackend.projects.listProjects({ limit: 5 }),
  });

  const { data: wallet } = useQuery({
    queryKey: ['designer-wallet'],
    queryFn: () => authenticatedBackend.payments.getWallet(),
  });

  const { data: analytics } = useQuery({
    queryKey: ['designer-analytics'],
    queryFn: () => authenticatedBackend.analytics.getDashboardData(),
  });

  const stats = [
    {
      title: 'Available Leads',
      value: leads?.total || 0,
      change: '+12',
      trend: 'up',
      icon: Users,
      color: 'text-blue-600',
    },
    {
      title: 'Active Projects',
      value: projects?.projects?.filter(p => p.status === 'in_progress').length || 0,
      change: '+3',
      trend: 'up',
      icon: Briefcase,
      color: 'text-green-600',
    },
    {
      title: 'Wallet Balance',
      value: `₹${(wallet?.balance || 0).toLocaleString()}`,
      change: '+₹15,000',
      trend: 'up',
      icon: DollarSign,
      color: 'text-purple-600',
    },
    {
      title: 'Rating',
      value: '4.8/5.0',
      change: '+0.2',
      trend: 'up',
      icon: Star,
      color: 'text-yellow-600',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Designer Dashboard</h1>
        <p className="text-muted-foreground">
          Manage your leads, projects, and grow your interior design business
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
              <p className="text-xs text-muted-foreground">
                <span className={stat.trend === 'up' ? 'text-green-600' : 'text-red-600'}>
                  {stat.change}
                </span>{' '}
                from last month
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        {/* Lead Marketplace */}
        <Card className="col-span-4">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Lead Marketplace</CardTitle>
                <CardDescription>
                  Browse and acquire new project leads
                </CardDescription>
              </div>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Browse Leads
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {leadsLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse flex items-center space-x-4">
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {leads?.leads?.slice(0, 3).map((lead) => (
                  <div key={lead.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <p className="font-medium">{lead.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {lead.projectType} • {lead.budgetRange} • {lead.city}
                      </p>
                      <div className="flex items-center space-x-2">
                        <Badge variant="secondary" className="text-xs">
                          Score: {lead.score}/100
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {lead.status}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-green-600">₹500 credits</span>
                      <Button size="sm">Acquire</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Manage your business</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full justify-start" variant="outline">
              <Palette className="mr-2 h-4 w-4" />
              Create New Design
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Calendar className="mr-2 h-4 w-4" />
              Generate BOQ
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <CreditCard className="mr-2 h-4 w-4" />
              Purchase Credits
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Award className="mr-2 h-4 w-4" />
              Portfolio Management
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Active Projects */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Active Projects</CardTitle>
                <CardDescription>Your ongoing design projects</CardDescription>
              </div>
              <Button variant="outline" size="sm">
                <Eye className="mr-2 h-4 w-4" />
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {projectsLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse flex items-center space-x-4">
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {projects?.projects?.slice(0, 3).map((project) => (
                  <div key={project.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{project.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {project.customer?.name} • {project.location}
                        </p>
                      </div>
                      <Badge
                        variant={project.status === 'completed' ? 'default' : 'secondary'}
                      >
                        {project.status}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span>Progress</span>
                        <span>{project.progress || 0}%</span>
                      </div>
                      <Progress value={project.progress || 0} className="h-2" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Earnings & Wallet */}
        <Card>
          <CardHeader>
            <CardTitle>Earnings & Wallet</CardTitle>
            <CardDescription>Track your financial performance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Available Balance</p>
                <p className="text-2xl font-bold text-green-600">
                  ₹{(wallet?.balance || 0).toLocaleString()}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">This Month</p>
                <p className="text-2xl font-bold">
                  ₹{(wallet?.monthlyEarnings || 0).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Credits Available</span>
                <span className="font-medium">{wallet?.credits || 0} credits</span>
              </div>
              <Progress value={(wallet?.credits || 0) * 10} className="h-2" />
            </div>

            <div className="flex space-x-2">
              <Button size="sm" className="flex-1">
                Withdraw Funds
              </Button>
              <Button size="sm" variant="outline" className="flex-1">
                Buy Credits
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>Your latest financial activities</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[
                {
                  type: 'Credit',
                  description: 'Project milestone payment - Sharma Residence',
                  amount: '+₹25,000',
                  date: '2024-03-15',
                  status: 'Completed',
                },
                {
                  type: 'Debit',
                  description: 'Lead acquisition - Luxury Villa Project',
                  amount: '-₹500',
                  date: '2024-03-14',
                  status: 'Completed',
                },
                {
                  type: 'Credit',
                  description: 'Credit purchase cashback',
                  amount: '+₹50',
                  date: '2024-03-13',
                  status: 'Completed',
                },
              ].map((transaction, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Badge variant={transaction.type === 'Credit' ? 'default' : 'secondary'}>
                      {transaction.type}
                    </Badge>
                  </TableCell>
                  <TableCell>{transaction.description}</TableCell>
                  <TableCell>
                    <span className={transaction.type === 'Credit' ? 'text-green-600' : 'text-red-600'}>
                      {transaction.amount}
                    </span>
                  </TableCell>
                  <TableCell>{transaction.date}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{transaction.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}