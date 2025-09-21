import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Plus, Package, AlertTriangle, CheckCircle, Star, Edit, Eye, ShoppingCart } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import backend from '~backend/client';
import type { Material, MaterialSearchRequest } from '~backend/materials/material_service';

export default function MaterialsPage() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const { toast } = useToast();

  const searchParams: MaterialSearchRequest = {
    search: search || undefined,
    category: categoryFilter || undefined,
    brand: brandFilter || undefined,
    in_stock_only: inStockOnly || undefined,
    page,
    limit,
    sort_by: 'created_at',
    sort_order: 'desc'
  };

  const { data: materialsData, isLoading, error } = useQuery({
    queryKey: ['materials', searchParams],
    queryFn: () => backend.materials.searchMaterials(searchParams),
  });

  const { data: stats } = useQuery({
    queryKey: ['material-stats'],
    queryFn: () => backend.materials.getMaterialStats(),
  });

  const { data: categories } = useQuery({
    queryKey: ['material-categories'],
    queryFn: () => backend.materials.getCategories(),
  });

  const getStockStatus = (material: Material) => {
    if (material.stock_quantity === 0) return 'out_of_stock';
    if (material.stock_quantity <= material.min_order_quantity) return 'low_stock';
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

  const handleClearFilters = () => {
    setSearch('');
    setCategoryFilter('');
    setBrandFilter('');
    setInStockOnly(false);
    setPage(1);
  };

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
                <p className="text-2xl font-bold">{stats?.total_materials?.toLocaleString() || 0}</p>
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
                <p className="text-sm font-medium text-muted-foreground">Low Stock</p>
                <p className="text-2xl font-bold">{stats?.low_stock_count || 0}</p>
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
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
            <Input
              placeholder="Filter by brand..."
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
            />
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="inStockOnly"
                checked={inStockOnly}
                onChange={(e) => setInStockOnly(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="inStockOnly" className="text-sm font-medium">
                In Stock Only
              </label>
            </div>
            <Button variant="outline" onClick={handleClearFilters}>
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Materials Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Materials ({materialsData?.total?.toLocaleString() || 0})</CardTitle>
            <div className="flex space-x-2">
              {page > 1 && (
                <Button variant="outline" size="sm" onClick={() => setPage(page - 1)}>
                  Previous
                </Button>
              )}
              {materialsData && page < materialsData.total_pages && (
                <Button variant="outline" size="sm" onClick={() => setPage(page + 1)}>
                  Next
                </Button>
              )}
            </div>
          </div>
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
                {materialsData?.materials?.map((material) => {
                  const stockStatus = getStockStatus(material);
                  const StockIcon = getStockIcon(stockStatus);
                  return (
                    <TableRow key={material.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{material.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {material.category}
                            {material.brand && ` • ${material.brand}`}
                            {material.model && ` (${material.model})`}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>
                              {material.vendor?.company_name?.charAt(0) || 'V'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <span className="font-medium">{material.vendor?.company_name}</span>
                            {material.vendor?.is_verified && (
                              <div className="flex items-center space-x-1">
                                <CheckCircle className="h-3 w-3 text-green-500" />
                                <span className="text-xs text-green-600">Verified</span>
                              </div>
                            )}
                            {material.vendor?.rating && (
                              <div className="flex items-center space-x-1">
                                <Star className="h-3 w-3 text-yellow-500 fill-current" />
                                <span className="text-xs">{material.vendor.rating.toFixed(1)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">₹{material.price.toLocaleString()}</p>
                          {material.discounted_price && material.discounted_price < material.price && (
                            <p className="text-sm text-green-600">
                              Sale: ₹{material.discounted_price.toLocaleString()}
                            </p>
                          )}
                          <p className="text-sm text-muted-foreground">per {material.unit}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{material.stock_quantity} {material.unit}</p>
                          <p className="text-sm text-muted-foreground">
                            Min: {material.min_order_quantity}
                          </p>
                          {material.lead_time_days > 0 && (
                            <p className="text-xs text-muted-foreground">
                              Lead: {material.lead_time_days} days
                            </p>
                          )}
                        </div>
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
                        <div className="flex space-x-1">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <ShoppingCart className="h-4 w-4" />
                          </Button>
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