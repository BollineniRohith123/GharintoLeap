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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import {
  Wallet,
  Plus,
  Minus,
  Search,
  Download,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Loader2,
  RefreshCw,
} from 'lucide-react';

export default function FinancialManagementPage() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [showDebitModal, setShowDebitModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedUserName, setSelectedUserName] = useState('');
  const [selectedUserBalance, setSelectedUserBalance] = useState(0);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [confirmLargeAmount, setConfirmLargeAmount] = useState(false);
  const [activeTab, setActiveTab] = useState<'wallets' | 'transactions' | 'monitoring'>('wallets');
  const [transactionPage, setTransactionPage] = useState(1);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch wallets
  const { data: walletsData, isLoading: walletsLoading } = useQuery({
    queryKey: ['wallets', { search, roleFilter, cityFilter }],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (roleFilter && roleFilter !== 'all') params.append('role', roleFilter);
      if (cityFilter && cityFilter !== 'all') params.append('city', cityFilter);

      const response = await fetch(`http://localhost:4000/finance/wallets?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch wallets');
      return response.json();
    },
    enabled: activeTab === 'wallets',
  });

  // Fetch transactions
  const { data: transactionsData, isLoading: transactionsLoading } = useQuery({
    queryKey: ['transactions', transactionPage],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`http://localhost:4000/finance/transactions?page=${transactionPage}&limit=20`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch transactions');
      return response.json();
    },
    enabled: activeTab === 'transactions',
  });

  // Fetch recent transactions
  const { data: recentTransactions } = useQuery({
    queryKey: ['recentTransactions'],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('http://localhost:4000/finance/transactions/recent', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch recent transactions');
      return response.json();
    },
    enabled: activeTab === 'monitoring',
    refetchInterval: 30000,
  });

  // Fetch flagged transactions
  const { data: flaggedTransactions } = useQuery({
    queryKey: ['flaggedTransactions'],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('http://localhost:4000/finance/transactions/flagged', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch flagged transactions');
      return response.json();
    },
    enabled: activeTab === 'monitoring',
  });

  // Credit mutation
  const creditMutation = useMutation({
    mutationFn: async ({ userId, amount, reason }: { userId: number; amount: number; reason: string }) => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`http://localhost:4000/finance/wallets/${userId}/credit`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount, reason }),
      });
      if (!response.ok) throw new Error('Failed to add credits');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Success',
        description: `₹${data.transaction.amount} credited successfully. New balance: ₹${data.transaction.newBalance}`,
      });
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['recentTransactions'] });
      setShowCreditModal(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add credits',
        variant: 'destructive',
      });
    },
  });

  // Debit mutation
  const debitMutation = useMutation({
    mutationFn: async ({ userId, amount, reason }: { userId: number; amount: number; reason: string }) => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`http://localhost:4000/finance/wallets/${userId}/debit`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount, reason }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to deduct credits');
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Success',
        description: `₹${data.transaction.amount} debited successfully. New balance: ₹${data.transaction.newBalance}`,
      });
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['recentTransactions'] });
      setShowDebitModal(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to deduct credits',
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    setSelectedUserId(null);
    setSelectedUserName('');
    setSelectedUserBalance(0);
    setAmount('');
    setReason('');
    setConfirmLargeAmount(false);
  };

  const handleCredit = () => {
    if (!selectedUserId || !amount || !reason) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all fields',
        variant: 'destructive',
      });
      return;
    }

    const amountNum = parseFloat(amount);
    if (amountNum <= 0) {
      toast({
        title: 'Validation Error',
        description: 'Amount must be greater than 0',
        variant: 'destructive',
      });
      return;
    }

    if (reason.length < 10) {
      toast({
        title: 'Validation Error',
        description: 'Reason must be at least 10 characters',
        variant: 'destructive',
      });
      return;
    }

    if (amountNum > 10000 && !confirmLargeAmount) {
      toast({
        title: 'Confirmation Required',
        description: 'Please confirm the large amount transaction',
        variant: 'destructive',
      });
      return;
    }

    creditMutation.mutate({ userId: selectedUserId, amount: amountNum, reason });
  };

  const handleDebit = () => {
    if (!selectedUserId || !amount || !reason) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all fields',
        variant: 'destructive',
      });
      return;
    }

    const amountNum = parseFloat(amount);
    if (amountNum <= 0) {
      toast({
        title: 'Validation Error',
        description: 'Amount must be greater than 0',
        variant: 'destructive',
      });
      return;
    }

    if (reason.length < 10) {
      toast({
        title: 'Validation Error',
        description: 'Reason must be at least 10 characters',
        variant: 'destructive',
      });
      return;
    }

    if (amountNum > 10000 && !confirmLargeAmount) {
      toast({
        title: 'Confirmation Required',
        description: 'Please confirm the large amount transaction',
        variant: 'destructive',
      });
      return;
    }

    debitMutation.mutate({ userId: selectedUserId, amount: amountNum, reason });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Financial Management</h1>
          <p className="text-gray-400 mt-1">Manage user wallets and transactions</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowCreditModal(true)}
            className="bg-green-500 hover:bg-green-600"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Credits
          </Button>
          <Button
            onClick={() => setShowDebitModal(true)}
            variant="outline"
            className="border-red-500 text-red-500 hover:bg-red-500/10"
          >
            <Minus className="h-4 w-4 mr-2" />
            Deduct Credits
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-700">
        <button
          onClick={() => setActiveTab('wallets')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'wallets'
              ? 'text-green-500 border-b-2 border-green-500'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          Wallet Overview
        </button>
        <button
          onClick={() => setActiveTab('transactions')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'transactions'
              ? 'text-green-500 border-b-2 border-green-500'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          Transaction History
        </button>
        <button
          onClick={() => setActiveTab('monitoring')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'monitoring'
              ? 'text-green-500 border-b-2 border-green-500'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          Monitoring
        </button>
      </div>

      {/* Wallet Overview Tab */}
      {activeTab === 'wallets' && (
        <div className="space-y-4">
          {/* Total Platform Balance */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-green-500" />
                Total Platform Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-500">
                {walletsData ? formatCurrency(walletsData.totalPlatformBalance || 0) : '₹0'}
              </div>
              <p className="text-sm text-gray-400 mt-1">
                Across {walletsData?.total || 0} user wallets
              </p>
            </CardContent>
          </Card>

          {/* Filters */}
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-gray-800 border-gray-600 pl-10"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-48 bg-gray-800 border-gray-600">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-600">
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="customer">Customer</SelectItem>
                <SelectItem value="vendor">Vendor</SelectItem>
                <SelectItem value="interior_designer">Interior Designer</SelectItem>
                <SelectItem value="project_manager">Project Manager</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
            <Select value={cityFilter} onValueChange={setCityFilter}>
              <SelectTrigger className="w-48 bg-gray-800 border-gray-600">
                <SelectValue placeholder="Filter by city" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-600">
                <SelectItem value="all">All Cities</SelectItem>
                <SelectItem value="Mumbai">Mumbai</SelectItem>
                <SelectItem value="Delhi">Delhi</SelectItem>
                <SelectItem value="Bangalore">Bangalore</SelectItem>
                <SelectItem value="Hyderabad">Hyderabad</SelectItem>
                <SelectItem value="Chennai">Chennai</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Wallets Table */}
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-0">
              {walletsLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin text-green-500" />
                </div>
              ) : walletsData?.wallets?.length === 0 ? (
                <div className="text-center p-8 text-gray-400">
                  No wallets found
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-700">
                      <TableHead>User</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead className="text-right">Total Earned</TableHead>
                      <TableHead className="text-right">Total Spent</TableHead>
                      <TableHead>Last Transaction</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {walletsData?.wallets?.map((wallet: any) => (
                      <TableRow key={wallet.wallet_id} className="border-gray-700">
                        <TableCell className="font-medium">
                          {wallet.first_name} {wallet.last_name}
                        </TableCell>
                        <TableCell className="text-gray-400">{wallet.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {wallet.roles?.[0] || 'N/A'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-400">{wallet.city || 'N/A'}</TableCell>
                        <TableCell className="text-right font-semibold text-green-500">
                          {formatCurrency(wallet.balance || 0)}
                        </TableCell>
                        <TableCell className="text-right text-gray-400">
                          {formatCurrency(wallet.total_earned || 0)}
                        </TableCell>
                        <TableCell className="text-right text-gray-400">
                          {formatCurrency(wallet.total_spent || 0)}
                        </TableCell>
                        <TableCell className="text-gray-400 text-sm">
                          {formatDate(wallet.last_transaction_date)}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-green-500 text-green-500 hover:bg-green-500/10"
                              onClick={() => {
                                setSelectedUserId(wallet.user_id);
                                setSelectedUserName(`${wallet.first_name} ${wallet.last_name}`);
                                setSelectedUserBalance(wallet.balance || 0);
                                setShowCreditModal(true);
                              }}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-500 text-red-500 hover:bg-red-500/10"
                              onClick={() => {
                                setSelectedUserId(wallet.user_id);
                                setSelectedUserName(`${wallet.first_name} ${wallet.last_name}`);
                                setSelectedUserBalance(wallet.balance || 0);
                                setShowDebitModal(true);
                              }}
                            >
                              <Minus className="h-3 w-3" />
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
        </div>
      )}

      {/* Transaction History Tab */}
      {activeTab === 'transactions' && (
        <div className="space-y-4">
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-0">
              {transactionsLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin text-green-500" />
                </div>
              ) : transactionsData?.transactions?.length === 0 ? (
                <div className="text-center p-8 text-gray-400">
                  No transactions found
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow className="border-gray-700">
                        <TableHead>Date/Time</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">Balance After</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactionsData?.transactions?.map((txn: any) => (
                        <TableRow key={txn.id} className="border-gray-700">
                          <TableCell className="text-sm text-gray-400">
                            {formatDate(txn.created_at)}
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{txn.first_name} {txn.last_name}</div>
                              <div className="text-xs text-gray-400">{txn.email}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {txn.type === 'credit' ? (
                              <Badge className="bg-green-500/20 text-green-500 border-green-500">
                                <TrendingUp className="h-3 w-3 mr-1" />
                                Credit
                              </Badge>
                            ) : (
                              <Badge className="bg-red-500/20 text-red-500 border-red-500">
                                <TrendingDown className="h-3 w-3 mr-1" />
                                Debit
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className={`text-right font-semibold ${
                            txn.type === 'credit' ? 'text-green-500' : 'text-red-500'
                          }`}>
                            {txn.type === 'credit' ? '+' : '-'}{formatCurrency(txn.amount)}
                          </TableCell>
                          <TableCell className="text-right text-gray-400">
                            {formatCurrency(txn.balance_after || 0)}
                          </TableCell>
                          <TableCell className="text-sm text-gray-400 max-w-xs truncate">
                            {txn.description}
                          </TableCell>
                          <TableCell>
                            <Badge variant={txn.status === 'completed' ? 'default' : 'outline'}>
                              {txn.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {/* Pagination */}
                  {transactionsData?.pagination && (
                    <div className="flex items-center justify-between p-4 border-t border-gray-700">
                      <div className="text-sm text-gray-400">
                        Showing page {transactionsData.pagination.page} of {transactionsData.pagination.totalPages}
                        {' '}({transactionsData.pagination.total} total transactions)
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={transactionPage === 1}
                          onClick={() => setTransactionPage(p => p - 1)}
                        >
                          Previous
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={transactionPage >= transactionsData.pagination.totalPages}
                          onClick={() => setTransactionPage(p => p + 1)}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Monitoring Tab */}
      {activeTab === 'monitoring' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Recent Transactions Feed */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <RefreshCw className="h-5 w-5 text-blue-500" />
                    Recent Transactions
                  </span>
                  <span className="text-xs text-gray-400">Auto-refresh: 30s</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentTransactions?.transactions?.map((txn: any) => (
                  <div key={txn.id} className="flex items-center justify-between p-3 bg-gray-900 rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium text-sm">
                        {txn.first_name} {txn.last_name}
                      </div>
                      <div className="text-xs text-gray-400">{formatDate(txn.created_at)}</div>
                    </div>
                    <div className="text-right">
                      <div className={`font-semibold ${
                        txn.type === 'credit' ? 'text-green-500' : 'text-red-500'
                      }`}>
                        {txn.type === 'credit' ? '+' : '-'}{formatCurrency(txn.amount)}
                      </div>
                      <div className="text-xs text-gray-400">{txn.type}</div>
                    </div>
                  </div>
                ))}
                {(!recentTransactions?.transactions || recentTransactions.transactions.length === 0) && (
                  <div className="text-center text-gray-400 py-4">
                    No recent transactions
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Flagged Transactions */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  Flagged Transactions (&gt; ₹50,000)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {flaggedTransactions?.transactions?.map((txn: any) => (
                  <div key={txn.id} className="flex items-center justify-between p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium text-sm">
                        {txn.first_name} {txn.last_name}
                      </div>
                      <div className="text-xs text-gray-400">{formatDate(txn.created_at)}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        Current Balance: {formatCurrency(txn.current_balance)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-semibold ${
                        txn.type === 'credit' ? 'text-green-500' : 'text-red-500'
                      }`}>
                        {txn.type === 'credit' ? '+' : '-'}{formatCurrency(txn.amount)}
                      </div>
                      <Badge variant="outline" className="text-xs mt-1 border-yellow-500 text-yellow-500">
                        {txn.type}
                      </Badge>
                    </div>
                  </div>
                ))}
                {(!flaggedTransactions?.transactions || flaggedTransactions.transactions.length === 0) && (
                  <div className="text-center text-gray-400 py-4">
                    No flagged transactions
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Credit Modal */}
      <Dialog open={showCreditModal} onOpenChange={setShowCreditModal}>
        <DialogContent className="bg-gray-800 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-green-500">Add Credits to Wallet</DialogTitle>
            <DialogDescription>
              Add credits to a user's wallet. This action will be logged in the audit trail.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {/* User Selection */}
            <div className="space-y-2">
              <Label>Select User</Label>
              <Select
                value={selectedUserId?.toString() || ''}
                onValueChange={(value) => {
                  const wallet = walletsData?.wallets?.find((w: any) => w.user_id.toString() === value);
                  if (wallet) {
                    setSelectedUserId(wallet.user_id);
                    setSelectedUserName(`${wallet.first_name} ${wallet.last_name}`);
                    setSelectedUserBalance(wallet.balance || 0);
                  }
                }}
              >
                <SelectTrigger className="bg-gray-900 border-gray-600">
                  <SelectValue placeholder="Select a user" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  {walletsData?.wallets?.map((wallet: any) => (
                    <SelectItem key={wallet.user_id} value={wallet.user_id.toString()}>
                      {wallet.first_name} {wallet.last_name} ({wallet.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label>Amount (₹)</Label>
              <Input
                type="number"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="bg-gray-900 border-gray-600"
                min="0"
                step="100"
              />
            </div>

            {/* Reason */}
            <div className="space-y-2">
              <Label>Reason (min. 10 characters)</Label>
              <Textarea
                placeholder="Enter reason for adding credits..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="bg-gray-900 border-gray-600"
                rows={3}
              />
            </div>

            {/* Transaction Preview */}
            {selectedUserId && amount && parseFloat(amount) > 0 && (
              <div className="p-4 bg-gray-900 rounded-lg space-y-2">
                <div className="text-sm font-medium text-gray-300">Transaction Preview</div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">User:</span>
                  <span className="font-medium">{selectedUserName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Current Balance:</span>
                  <span className="font-medium">{formatCurrency(selectedUserBalance)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Amount to Add:</span>
                  <span className="font-medium text-green-500">+{formatCurrency(parseFloat(amount))}</span>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t border-gray-700">
                  <span className="text-gray-400">New Balance:</span>
                  <span className="font-bold text-green-500">
                    {formatCurrency(selectedUserBalance + parseFloat(amount))}
                  </span>
                </div>
              </div>
            )}

            {/* Large Amount Confirmation */}
            {amount && parseFloat(amount) > 10000 && (
              <div className="flex items-start space-x-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <input
                  type="checkbox"
                  id="confirmLargeCredit"
                  checked={confirmLargeAmount}
                  onChange={(e) => setConfirmLargeAmount(e.target.checked)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <label
                    htmlFor="confirmLargeCredit"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    <AlertTriangle className="h-4 w-4 inline mr-1 text-yellow-500" />
                    I confirm this large amount transaction (&gt; ₹10,000)
                  </label>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 justify-end pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreditModal(false);
                  resetForm();
                }}
                disabled={creditMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCredit}
                disabled={creditMutation.isPending}
                className="bg-green-500 hover:bg-green-600"
              >
                {creditMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Credits
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Debit Modal */}
      <Dialog open={showDebitModal} onOpenChange={setShowDebitModal}>
        <DialogContent className="bg-gray-800 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-red-500">Deduct Credits from Wallet</DialogTitle>
            <DialogDescription>
              Deduct credits from a user's wallet. This action will be logged in the audit trail.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {/* User Selection */}
            <div className="space-y-2">
              <Label>Select User</Label>
              <Select
                value={selectedUserId?.toString() || ''}
                onValueChange={(value) => {
                  const wallet = walletsData?.wallets?.find((w: any) => w.user_id.toString() === value);
                  if (wallet) {
                    setSelectedUserId(wallet.user_id);
                    setSelectedUserName(`${wallet.first_name} ${wallet.last_name}`);
                    setSelectedUserBalance(wallet.balance || 0);
                  }
                }}
              >
                <SelectTrigger className="bg-gray-900 border-gray-600">
                  <SelectValue placeholder="Select a user" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  {walletsData?.wallets?.map((wallet: any) => (
                    <SelectItem key={wallet.user_id} value={wallet.user_id.toString()}>
                      {wallet.first_name} {wallet.last_name} ({wallet.email}) - Balance: {formatCurrency(wallet.balance || 0)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label>Amount (₹)</Label>
              <Input
                type="number"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="bg-gray-900 border-gray-600"
                min="0"
                step="100"
              />
              {selectedUserId && amount && parseFloat(amount) > selectedUserBalance && (
                <p className="text-xs text-red-500">
                  Insufficient balance! Current balance: {formatCurrency(selectedUserBalance)}
                </p>
              )}
            </div>

            {/* Reason */}
            <div className="space-y-2">
              <Label>Reason (min. 10 characters)</Label>
              <Textarea
                placeholder="Enter reason for deducting credits..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="bg-gray-900 border-gray-600"
                rows={3}
              />
            </div>

            {/* Transaction Preview */}
            {selectedUserId && amount && parseFloat(amount) > 0 && parseFloat(amount) <= selectedUserBalance && (
              <div className="p-4 bg-gray-900 rounded-lg space-y-2">
                <div className="text-sm font-medium text-gray-300">Transaction Preview</div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">User:</span>
                  <span className="font-medium">{selectedUserName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Current Balance:</span>
                  <span className="font-medium">{formatCurrency(selectedUserBalance)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Amount to Deduct:</span>
                  <span className="font-medium text-red-500">-{formatCurrency(parseFloat(amount))}</span>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t border-gray-700">
                  <span className="text-gray-400">New Balance:</span>
                  <span className="font-bold text-red-500">
                    {formatCurrency(selectedUserBalance - parseFloat(amount))}
                  </span>
                </div>
              </div>
            )}

            {/* Large Amount Confirmation */}
            {amount && parseFloat(amount) > 10000 && (
              <div className="flex items-start space-x-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <input
                  type="checkbox"
                  id="confirmLargeDebit"
                  checked={confirmLargeAmount}
                  onChange={(e) => setConfirmLargeAmount(e.target.checked)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <label
                    htmlFor="confirmLargeDebit"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    <AlertTriangle className="h-4 w-4 inline mr-1 text-yellow-500" />
                    I confirm this large amount transaction (&gt; ₹10,000)
                  </label>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 justify-end pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDebitModal(false);
                  resetForm();
                }}
                disabled={debitMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleDebit}
                disabled={debitMutation.isPending}
                className="bg-red-500 hover:bg-red-600"
              >
                {debitMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Minus className="h-4 w-4 mr-2" />
                    Deduct Credits
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

