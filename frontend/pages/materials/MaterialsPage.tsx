import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Plus, Package, AlertTriangle, CheckCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import backend from '~backend/client';

export default function MaterialsPage() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const { toast } = useToast();

  const { data: materialsData, isLoading, error } = useQuery({
    queryKey: ['materials'],
    queryFn: () => backend.materials.listMaterials(),
  });

  const { data: stats } = useQuery({
    queryKey: ['material-stats'],
    queryFn: () => backend.materials.getMaterialStats(),
  });

  const { data: categories } = useQuery({
    queryKey: ['material-categories'],
    queryFn: () => backend.materials.getCategories(),
  });

  const getStockStatus = (material: any) => {
    if (material.stock_quantity === 0) return 'out_of_stock';
    if (material.stock_quantity <= 10) return 'low_stock';
    return 'available';
  };

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

  const filteredMaterials = materialsData?.materials?.filter(material => {
    const matchesSearch = search === '' || 
      material.name.toLowerCase().includes(search.toLowerCase()) ||
      material.category.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === '' || material.category === categoryFilter;
    return matchesSearch && matchesCategory;
  }) || [];

  if (error) {
    toast({
      title: 'Error loading materials',
      description: 'Failed to load materials. Please try again.',
      variant: 'destructive',
    });
  }

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
                <p className="text-2xl font-bold">{stats?.total_materials || 0}</p>
              </div>
              <Package className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Categories</p>
                <p className="text-2xl font-bold">{stats?.categories || 0}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Materials</p>
                <p className="text-2xl font-bold">{stats?.active_materials || 0}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Value</p>
                <p className="text-2xl font-bold">₹{(stats?.total_value || 0).toLocaleString()}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-purple-500" />
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                {categories?.categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              onClick={() => {
                setSearch('');
                setCategoryFilter('');
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
          <CardTitle>Materials ({filteredMaterials.length})</CardTitle>
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
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMaterials.map((material) => {
                  const stockStatus = getStockStatus(material);
                  const StockIcon = getStockIcon(stockStatus);
                  return (
                    <TableRow key={material.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{material.name}</p>
                          <p className="text-sm text-muted-foreground">ID: {material.id}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{material.category}</Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">₹{material.price.toLocaleString()}</p>
                          <p className="text-sm text-muted-foreground">per {material.unit}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{material.stock_quantity} {material.unit}</p>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <StockIcon className={`h-4 w-4 ${
                            stockStatus === 'available' ? 'text-green-600' :
                            stockStatus === 'low_stock' ? 'text-yellow-600' :
                            'text-red-600'
                          }`} />
                          <Badge variant="secondary" className={getStockColor(stockStatus)}>
                            {stockStatus.replace('_', ' ')}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button variant="ghost" size="sm">View</Button>
                          <Button variant="ghost" size="sm">Edit</Button>
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