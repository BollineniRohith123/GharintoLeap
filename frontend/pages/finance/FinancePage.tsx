import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DollarSign, TrendingUp, CreditCard, Wallet, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import backend from '~backend/client';

export default function FinancePage() {
  const [timeframe, setTimeframe] = useState('30d');

  const { data: wallet } = useQuery({
    queryKey: ['wallet'],
    queryFn: () => backend.payments.getWallet(),
  });

  const { data: transactions } = useQuery({
    queryKey: ['transactions', timeframe],
    queryFn: () => ({
      transactions: [
        {
          id: '1',
          type: 'credit',
          description: 'Project milestone payment - Sharma Residence',
          amount: 25000,
          date: '2024-03-15T10:30:00Z',
          status: 'completed',
          projectId: 'PRJ-001'
        },
        {
          id: '2',
          type: 'debit',
          description: 'Lead acquisition - Luxury Villa Project',
          amount: 500,
          date: '2024-03-14T15:45:00Z',
          status: 'completed',
          leadId: 'LD-002'
        },
        {
          id: '3',
          type: 'credit',
          description: 'Credit purchase cashback',
          amount: 50,
          date: '2024-03-13T09:15:00Z',
          status: 'completed'
        },
        {
          id: '4',
          type: 'debit',
          description: 'Withdrawal to bank account',
          amount: 15000,
          date: '2024-03-12T14:20:00Z',
          status: 'pending'
        }
      ],
      total: 4
    }),
  });

  const stats = [
    {
      title: 'Wallet Balance',
      value: `₹${(wallet?.balance || 0).toLocaleString()}`,
      change: '+₹5,000',
      trend: 'up',
      icon: Wallet,
      color: 'text-green-600',
    },
    {
      title: 'Credits Available',
      value: `${wallet?.credits || 0} credits`,
      change: '+50',
      trend: 'up',
      icon: CreditCard,
      color: 'text-blue-600',
    },
    {
      title: 'Monthly Earnings',
      value: `₹${(wallet?.monthlyEarnings || 0).toLocaleString()}`,
      change: '+₹15,000',
      trend: 'up',
      icon: TrendingUp,
      color: 'text-purple-600',
    },
    {
      title: 'Total Spent',
      value: `₹${(wallet?.totalSpent || 0).toLocaleString()}`,
      change: '+₹2,500',
      trend: 'up',
      icon: DollarSign,
      color: 'text-orange-600',
    },
  ];

  const getTransactionColor = (type: string) => {
    return type === 'credit' ? 'text-green-600' : 'text-red-600';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Finance</h1>
          <p className="text-muted-foreground">
            Manage your wallet, transactions, and earnings
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Button variant="outline">
            <CreditCard className="mr-2 h-4 w-4" />
            Buy Credits
          </Button>
          <Button>
            <Wallet className="mr-2 h-4 w-4" />
            Withdraw Funds
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground flex items-center">
                    {stat.trend === 'up' ? (
                      <ArrowUpRight className="h-3 w-3 text-green-600 mr-1" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3 text-red-600 mr-1" />
                    )}
                    <span className={stat.trend === 'up' ? 'text-green-600' : 'text-red-600'}>
                      {stat.change}
                    </span>{' '}
                    from last month
                  </p>
                </div>
                <stat.icon className={`h-8 w-8 ${stat.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Manage your finances</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full justify-start" variant="outline">
              <CreditCard className="mr-2 h-4 w-4" />
              Purchase Credits (₹10/credit)
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Wallet className="mr-2 h-4 w-4" />
              Withdraw to Bank Account
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <DollarSign className="mr-2 h-4 w-4" />
              View Financial Reports
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <TrendingUp className="mr-2 h-4 w-4" />
              Earnings Analytics
            </Button>
          </CardContent>
        </Card>

        {/* Account Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Account Summary</CardTitle>
            <CardDescription>Your financial overview</CardDescription>
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
                <p className="text-sm text-muted-foreground">Credits</p>
                <p className="text-2xl font-bold text-blue-600">
                  {wallet?.credits || 0}
                </p>
              </div>
            </div>

            <div className="pt-4 border-t">
              <div className="flex justify-between items-center text-sm">
                <span>This Month's Earnings</span>
                <span className="font-medium text-green-600">
                  ₹{(wallet?.monthlyEarnings || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm mt-2">
                <span>Total Withdrawals</span>
                <span className="font-medium">
                  ₹{(wallet?.totalWithdrawals || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm mt-2">
                <span>Credit Purchases</span>
                <span className="font-medium">
                  ₹{(wallet?.creditPurchases || 0).toLocaleString()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transactions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>Your latest financial activities</CardDescription>
            </div>
            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
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
              {transactions?.transactions?.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>
                    <Badge variant={transaction.type === 'credit' ? 'default' : 'secondary'}>
                      {transaction.type}
                    </Badge>
                  </TableCell>
                  <TableCell>{transaction.description}</TableCell>
                  <TableCell>
                    <span className={getTransactionColor(transaction.type)}>
                      {transaction.type === 'credit' ? '+' : '-'}₹{transaction.amount.toLocaleString()}
                    </span>
                  </TableCell>
                  <TableCell>
                    {new Date(transaction.date).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getStatusColor(transaction.status)}>
                      {transaction.status}
                    </Badge>
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