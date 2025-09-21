import { useQuery } from '@tanstack/react-query';
import { Package, TrendingUp, DollarSign, ShoppingCart } from 'lucide-react';
import { useBackend } from '../../contexts/AuthContext';
import StatsCard from './StatsCard';

export default function VendorDashboard() {
  const backend = useBackend();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Vendor Dashboard</h1>
        <p className="text-muted-foreground">
          Manage your inventory and track sales performance
        </p>
      </div>

      {/* Vendor Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Products"
          value="156"
          icon={Package}
          description="In your catalog"
        />
        <StatsCard
          title="Orders This Month"
          value="23"
          icon={ShoppingCart}
          description="New orders"
          trend={{ value: 15, isPositive: true }}
        />
        <StatsCard
          title="Monthly Revenue"
          value="₹78,500"
          icon={DollarSign}
          description="This month"
          trend={{ value: 8, isPositive: true }}
        />
        <StatsCard
          title="Growth Rate"
          value="12%"
          icon={TrendingUp}
          description="Month over month"
          trend={{ value: 3, isPositive: true }}
        />
      </div>

      {/* Recent Orders */}
      <div className="bg-card rounded-lg border p-6">
        <h2 className="text-xl font-semibold mb-4">Recent Orders</h2>
        <div className="space-y-3">
          {/* Mock orders data */}
          {[
            { id: '001', product: 'Modern Sofa Set', customer: 'John Doe', amount: 25000, status: 'pending' },
            { id: '002', product: 'Dining Table', customer: 'Sarah Wilson', amount: 15000, status: 'shipped' },
            { id: '003', product: 'Office Chair', customer: 'Mike Johnson', amount: 8000, status: 'delivered' },
          ].map((order) => (
            <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <h3 className="font-medium">{order.product}</h3>
                <p className="text-sm text-muted-foreground">
                  Order #{order.id} • {order.customer}
                </p>
              </div>
              <div className="text-right">
                <p className="font-medium">₹{order.amount.toLocaleString()}</p>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                  order.status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {order.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Products */}
      <div className="bg-card rounded-lg border p-6">
        <h2 className="text-xl font-semibold mb-4">Top Selling Products</h2>
        <div className="space-y-3">
          {/* Mock products data */}
          {[
            { name: 'Modern Sofa Set', sales: 12, revenue: 300000 },
            { name: 'Dining Table', sales: 8, revenue: 120000 },
            { name: 'Office Chair', sales: 15, revenue: 120000 },
            { name: 'Bed Frame', sales: 6, revenue: 90000 },
          ].map((product, index) => (
            <div key={product.name} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center space-x-3">
                <span className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                  {index + 1}
                </span>
                <div>
                  <h3 className="font-medium">{product.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {product.sales} units sold
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-medium">₹{product.revenue.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Revenue</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
