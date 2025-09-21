import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Package,
  ShoppingCart,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Plus,
} from 'lucide-react';

export default function VendorDashboard() {
  const stats = [
    {
      title: 'Total Products',
      value: '150',
      icon: Package,
      color: 'text-blue-600',
    },
    {
      title: 'Active Orders',
      value: '23',
      icon: ShoppingCart,
      color: 'text-orange-600',
    },
    {
      title: 'Monthly Revenue',
      value: '₹2,76,500',
      icon: DollarSign,
      color: 'text-green-600',
    },
    {
      title: 'Low Stock Items',
      value: '5',
      icon: AlertTriangle,
      color: 'text-red-600',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Vendor Dashboard</h1>
        <p className="text-muted-foreground">
          Manage your inventory, orders, and grow your business
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
                <span className="text-green-600">+12%</span> from last month
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Orders */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
            <CardDescription>
              Latest orders from designers and project managers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                {
                  id: 'ORD-001',
                  customer: 'Design Studio Pro',
                  items: 'Premium Oak Flooring',
                  amount: 125000,
                  status: 'pending'
                },
                {
                  id: 'ORD-002',
                  customer: 'Interior Experts',
                  items: 'Marble Countertop',
                  amount: 127500,
                  status: 'shipped'
                },
                {
                  id: 'ORD-003',
                  customer: 'Modern Designs',
                  items: 'LED Lights',
                  amount: 24000,
                  status: 'delivered'
                }
              ].map((order) => (
                <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <p className="font-medium">{order.id}</p>
                    <p className="text-sm text-muted-foreground">{order.customer}</p>
                    <p className="text-sm">{order.items}</p>
                  </div>
                  <div className="text-right space-y-2">
                    <p className="font-medium">₹{order.amount.toLocaleString()}</p>
                    <Badge variant="secondary">
                      {order.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Manage your business</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full justify-start" variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              Add New Product
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Package className="mr-2 h-4 w-4" />
              Update Inventory
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <CheckCircle className="mr-2 h-4 w-4" />
              Process Orders
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <DollarSign className="mr-2 h-4 w-4" />
              View Analytics
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Inventory Status */}
      <Card>
        <CardHeader>
          <CardTitle>Inventory Status</CardTitle>
          <CardDescription>Monitor your stock levels</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              {
                name: 'Premium Oak Flooring',
                sku: 'OAK-001',
                stock: 150,
                status: 'available'
              },
              {
                name: 'Marble Kitchen Countertop',
                sku: 'MAR-002',
                stock: 25,
                status: 'low_stock'
              },
              {
                name: 'LED Ceiling Lights',
                sku: 'LED-003',
                stock: 0,
                status: 'out_of_stock'
              }
            ].map((material) => (
              <div key={material.sku} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <CheckCircle className={`h-5 w-5 ${
                    material.status === 'available' ? 'text-green-600' :
                    material.status === 'low_stock' ? 'text-yellow-600' :
                    'text-red-600'
                  }`} />
                  <div>
                    <p className="font-medium">{material.name}</p>
                    <p className="text-sm text-muted-foreground">SKU: {material.sku}</p>
                  </div>
                </div>
                <div className="text-right space-y-1">
                  <p className="font-medium">{material.stock} units</p>
                  <Badge variant="secondary">
                    {material.status.replace('_', ' ')}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}