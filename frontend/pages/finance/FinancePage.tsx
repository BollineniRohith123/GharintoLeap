import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { DollarSign, FileText, Receipt, Wallet, Plus, Download } from 'lucide-react';
import apiClient from '../../src/lib/api-client';
import WalletPage from './WalletPage';

export default function FinancePage() {
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch financial data
  const { data: walletData, isLoading: walletLoading } = useQuery({
    queryKey: ['wallet'],
    queryFn: () => apiClient.getUserWallet(),
  });

  const { data: quotationsData } = useQuery({
    queryKey: ['quotations'],
    queryFn: () => apiClient.getQuotations(),
  });

  const { data: invoicesData } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => apiClient.getInvoices(),
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const quotations = quotationsData?.quotations || [];
  const invoices = invoicesData?.invoices || [];
  const totalQuotations = quotations.reduce((sum, q) => sum + q.total_amount, 0);
  const totalInvoices = invoices.reduce((sum, i) => sum + i.amount, 0);

  if (activeTab === 'wallet') {
    return <WalletPage />;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <DollarSign className="h-8 w-8" />
            Financial Management
          </h1>
          <p className="text-gray-400 mt-1">
            Manage finances, quotations, invoices, and wallet transactions
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button className="bg-green-500 hover:bg-green-600 text-white">
            <Plus className="h-4 w-4 mr-2" />
            New Quotation
          </Button>
          <Button variant="outline" className="border-gray-600 text-gray-300">
            <Download className="h-4 w-4 mr-2" />
            Export Reports
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-r from-green-500/20 to-green-600/20 border-green-500/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-400 text-sm font-medium">Wallet Balance</p>
                <p className="text-3xl font-bold text-white">
                  {walletLoading ? '...' : formatCurrency(walletData?.balance || 0)}
                </p>
              </div>
              <Wallet className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Quotations</p>
                <p className="text-2xl font-bold text-white">
                  {formatCurrency(totalQuotations)}
                </p>
              </div>
              <FileText className="h-8 w-8 text-blue-500" />
            </div>
            <p className="text-gray-500 text-xs mt-2">
              {quotations.length} quotations
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Invoices</p>
                <p className="text-2xl font-bold text-white">
                  {formatCurrency(totalInvoices)}
                </p>
              </div>
              <Receipt className="h-8 w-8 text-purple-500" />
            </div>
            <p className="text-gray-500 text-xs mt-2">
              {invoices.length} invoices
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-gray-700">
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-gray-400 text-sm">Quick Actions</p>
              <div className="mt-2 space-y-2">
                <Button size="sm" className="w-full bg-blue-500 hover:bg-blue-600">
                  New Quote
                </Button>
                <Button size="sm" variant="outline" className="w-full border-gray-600 text-gray-300">
                  View Reports
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-gray-800 border-gray-700">
          <TabsTrigger value="overview" className="text-gray-300 data-[state=active]:text-white">
            Overview
          </TabsTrigger>
          <TabsTrigger value="quotations" className="text-gray-300 data-[state=active]:text-white">
            Quotations ({quotations.length})
          </TabsTrigger>
          <TabsTrigger value="invoices" className="text-gray-300 data-[state=active]:text-white">
            Invoices ({invoices.length})
          </TabsTrigger>
          <TabsTrigger value="wallet" className="text-gray-300 data-[state=active]:text-white">
            Wallet
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-gray-900/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p className="text-gray-400">Financial activity overview will appear here</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-900/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Quick Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Quotations</span>
                    <span className="text-white">{quotations.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Invoices</span>
                    <span className="text-white">{invoices.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Wallet Balance</span>
                    <span className="text-green-400">{formatCurrency(walletData?.balance || 0)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="quotations">
          <Card className="bg-gray-900/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Quotations Management</CardTitle>
            </CardHeader>
            <CardContent>
              {quotations.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">No quotations found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {quotations.map((quotation) => (
                    <div key={quotation.id} className="p-4 border border-gray-700 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-white font-medium">{quotation.title}</h3>
                          <p className="text-gray-400 text-sm">{quotation.quotation_number}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-white font-medium">{formatCurrency(quotation.total_amount)}</p>
                          <Badge className="bg-blue-500/20 text-blue-300">{quotation.status}</Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices">
          <Card className="bg-gray-900/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Invoices Management</CardTitle>
            </CardHeader>
            <CardContent>
              {invoices.length === 0 ? (
                <div className="text-center py-12">
                  <Receipt className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">No invoices found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {invoices.map((invoice) => (
                    <div key={invoice.id} className="p-4 border border-gray-700 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-white font-medium">{invoice.invoice_number}</h3>
                          <p className="text-gray-400 text-sm">
                            {invoice.first_name} {invoice.last_name}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-white font-medium">{formatCurrency(invoice.amount)}</p>
                          <Badge className="bg-green-500/20 text-green-300">{invoice.status}</Badge>
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