import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Plus, Package, AlertTriangle, CheckCircle } from 'lucide-react';
import backend from '~backend/client';

export default function MaterialsPage() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [stockFilter, setStockFilter] = useState('');

  const { data: materials, isLoading } = useQuery({
    queryKey: ['materials', search, categoryFilter, stockFilter],
    queryFn: () => ({
      materials: [
        {
          id: '1',
          name: 'Premium Oak Flooring',
          category: 'Flooring',
          vendor: { name: 'Wood Works Ltd', avatar: '' },
          price: 2500,
          unit: 'sq ft',
          stock: 150,
          lowStockThreshold: 50,
          status: 'available',
          sku: 'OAK-001'
        },
        {
          id: '2',
          name: 'Marble Kitchen Countertop',
          category: 'Countertops',
          vendor: { name: 'Stone Craft', avatar: '' },
          price: 8500,
          unit: 'sq ft',
          stock: 25,
          lowStockThreshold: 30,
          status: 'low_stock',
          sku: 'MAR-002'
        },
        {
          id: '3',
          name: 'LED Ceiling Lights',
          category: 'Lighting',
          vendor: { name: 'Bright Solutions', avatar: '' },
          price: 1200,
          unit: 'piece',
          stock: 0,
          lowStockThreshold: 20,
          status: 'out_of_stock',
          sku: 'LED-003'
        }
      ],
      total: 3
    }),
  });

  const getStockColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800';
      case 'low_stock': return 'bg-yellow-100 text-yellow-800';
      case 'out_of_stock': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStockIcon = (status: string) => {
    switch (status) {
      case 'available': return CheckCircle;
      case 'low_stock': return AlertTriangle;
      case 'out_of_stock': return AlertTriangle;
      default: return Package;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Materials</h1>
          <p className="text-muted-foreground">Manage material catalog and inventory</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Material
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Materials</p>
                <p className="text-2xl font-bold">{materials?.total || 0}</p>
              </div>
              <Package className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">In Stock</p>
                <p className="text-2xl font-bold">
                  {materials?.materials?.filter(m => m.status === 'available').length || 0}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Low Stock</p>
                <p className="text-2xl font-bold">
                  {materials?.materials?.filter(m => m.status === 'low_stock').length || 0}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Out of Stock</p>
                <p className="text-2xl font-bold">
                  {materials?.materials?.filter(m => m.status === 'out_of_stock').length || 0}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search materials..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Categories</SelectItem>
                <SelectItem value="flooring">Flooring</SelectItem>
                <SelectItem value="countertops">Countertops</SelectItem>
                <SelectItem value="lighting">Lighting</SelectItem>
                <SelectItem value="paint">Paint</SelectItem>
                <SelectItem value="tiles">Tiles</SelectItem>
              </SelectContent>
            </Select>
            <Select value={stockFilter} onValueChange={setStockFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by stock" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Stock</SelectItem>
                <SelectItem value="available">In Stock</SelectItem>
                <SelectItem value="low_stock">Low Stock</SelectItem>
                <SelectItem value="out_of_stock">Out of Stock</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              onClick={() => {
                setSearch('');
                setCategoryFilter('');
                setStockFilter('');
              }}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Materials Table */}
      <Card>
        <CardHeader>
          <CardTitle>Materials ({materials?.total?.toLocaleString() || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse flex items-center space-x-4">
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Material</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {materials?.materials?.map((material) => {
                  const StockIcon = getStockIcon(material.status);
                  return (
                    <TableRow key={material.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{material.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {material.category} • SKU: {material.sku}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={material.vendor.avatar} />
                            <AvatarFallback>
                              {material.vendor.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{material.vendor.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">₹{material.price.toLocaleString()}</p>
                          <p className="text-sm text-muted-foreground">per {material.unit}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{material.stock} {material.unit}</p>
                          <p className="text-sm text-muted-foreground">
                            Min: {material.lowStockThreshold}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <StockIcon className={`h-4 w-4 ${
                            material.status === 'available' ? 'text-green-600' :
                            material.status === 'low_stock' ? 'text-yellow-600' :
                            'text-red-600'
                          }`} />
                          <Badge variant="secondary" className={getStockColor(material.status)}>
                            {material.status.replace('_', ' ')}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button variant="ghost" size="sm">View</Button>
                          <Button variant="ghost" size="sm">Edit</Button>
                          <Button variant="ghost" size="sm">Order</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}