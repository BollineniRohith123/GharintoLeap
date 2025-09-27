import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
  Wallet,
  CreditCard,
  TrendingUp,
  TrendingDown,
  Download,
  Filter,
  Calendar,
  DollarSign,
  ArrowUpRight,
  ArrowDownLeft,
  Search,
} from 'lucide-react';
import apiClient from '../../src/lib/api-client';

export default function WalletPage() {
  const [dateFilter, setDateFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch] = useState('');

  // Fetch wallet data
  const { data: walletData, isLoading: walletLoading } = useQuery({
    queryKey: ['wallet'],
    queryFn: () => apiClient.getUserWallet(),
  });

  // Fetch transactions
  const { data: transactionsData, isLoading: transactionsLoading } = useQuery({
    queryKey: ['wallet-transactions'],
    queryFn: () => apiClient.getWalletTransactions(),
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTransactionIcon = (type: string) => {
    return type === 'credit' ? (
      <ArrowUpRight className="h-4 w-4 text-green-500" />
    ) : (
      <ArrowDownLeft className="h-4 w-4 text-red-500" />
    );
  };

  const getTransactionColor = (type: string) => {
    return type === 'credit' ? 'text-green-400' : 'text-red-400';
  };

  const transactions = transactionsData?.transactions || [];
  const filteredTransactions = transactions.filter(transaction => {
    const matchesType = !typeFilter || transaction.type === typeFilter;
    const matchesSearch = !search || 
      transaction.description.toLowerCase().includes(search.toLowerCase()) ||
      transaction.reference_id?.toLowerCase().includes(search.toLowerCase());
    
    return matchesType && matchesSearch;
  });

  // Calculate stats
  const totalCredits = transactions
    .filter(t => t.type === 'credit')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const totalDebits = transactions
    .filter(t => t.type === 'debit')
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <Wallet className="h-8 w-8" />
            Wallet & Transactions
          </h1>
          <p className="text-gray-400 mt-1">
            Manage your wallet balance and view transaction history
          </p>
        </div>
        <Button className="bg-green-500 hover:bg-green-600 text-white">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Wallet Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-r from-green-500/20 to-green-600/20 border-green-500/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-400 text-sm font-medium">Current Balance</p>
                <p className="text-3xl font-bold text-white">
                  {walletLoading ? '...' : formatCurrency(walletData?.balance || 0)}
                </p>
              </div>
              <div className="h-12 w-12 bg-green-500/20 rounded-full flex items-center justify-center">
                <Wallet className="h-6 w-6 text-green-500" />
              </div>
            </div>
            <p className="text-green-300 text-xs mt-2">
              Last updated: {walletData ? formatDate(walletData.updated_at) : 'N/A'}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Credits</p>
                <p className="text-2xl font-bold text-green-400">
                  {formatCurrency(totalCredits)}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
            <p className="text-gray-500 text-xs mt-2">
              {transactions.filter(t => t.type === 'credit').length} transactions
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Debits</p>
                <p className="text-2xl font-bold text-red-400">
                  {formatCurrency(totalDebits)}
                </p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-500" />
            </div>
            <p className="text-gray-500 text-xs mt-2">
              {transactions.filter(t => t.type === 'debit').length} transactions
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Net Flow</p>
                <p className={`text-2xl font-bold ${(totalCredits - totalDebits) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatCurrency(totalCredits - totalDebits)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-500" />
            </div>
            <p className="text-gray-500 text-xs mt-2">
              This month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-gray-900/50 border-gray-700">
        <CardContent className="p-6">
          <div className="flex gap-4 items-end flex-wrap">
            <div className="flex-1 min-w-[250px]">
              <label className="text-sm font-medium text-gray-300 mb-2 block">
                Search Transactions
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by description or reference..."
                  className="pl-10 bg-gray-800 border-gray-600 text-white"
                />
              </div>
            </div>

            <div className="min-w-[150px]">
              <label className="text-sm font-medium text-gray-300 mb-2 block">
                Transaction Type
              </label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full bg-gray-800 border-gray-600 text-white rounded-md px-3 py-2"
              >
                <option value="">All Types</option>
                <option value="credit">Credits</option>
                <option value="debit">Debits</option>
              </select>
            </div>

            <div className="min-w-[150px]">
              <label className="text-sm font-medium text-gray-300 mb-2 block">
                Date Range
              </label>
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="bg-gray-800 border-gray-600 text-white"
              />
            </div>

            <Button className="bg-blue-500 hover:bg-blue-600">
              <Filter className="h-4 w-4 mr-2" />
              Apply Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card className="bg-gray-900/50 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center justify-between">
            <span>Transaction History ({filteredTransactions.length})</span>
            {transactionsLoading && (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-green-500 border-t-transparent" />
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {transactionsLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse flex items-center space-x-4">
                  <div className="rounded-full bg-gray-700 h-10 w-10" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-700 rounded w-1/4" />
                    <div className="h-3 bg-gray-700 rounded w-1/2" />
                  </div>
                  <div className="h-4 bg-gray-700 rounded w-20" />
                </div>
              ))}
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="h-12 w-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 text-lg">No transactions found</p>
              <p className="text-gray-500 text-sm">Your transaction history will appear here</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-gray-700">
                  <TableHead className="text-gray-300">Date</TableHead>
                  <TableHead className="text-gray-300">Description</TableHead>
                  <TableHead className="text-gray-300">Reference</TableHead>
                  <TableHead className="text-gray-300">Type</TableHead>
                  <TableHead className="text-gray-300 text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.map((transaction) => (
                  <TableRow key={transaction.id} className="border-gray-700 hover:bg-gray-800/50">
                    <TableCell className="text-gray-300">
                      {formatDate(transaction.created_at)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getTransactionIcon(transaction.type)}
                        <span className="text-white">{transaction.description}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-400">
                      {transaction.reference_id || 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        className={`${transaction.type === 'credit' 
                          ? 'bg-green-500/20 text-green-300' 
                          : 'bg-red-500/20 text-red-300'
                        } text-xs`}
                      >
                        {transaction.type.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className={`text-right font-medium ${getTransactionColor(transaction.type)}`}>
                      {transaction.type === 'credit' ? '+' : '-'}{formatCurrency(transaction.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}