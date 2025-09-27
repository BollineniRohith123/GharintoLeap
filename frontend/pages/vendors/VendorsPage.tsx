import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Building,
  MapPin,
  Star,
  Package,
  Phone,
  Mail,
  Search,
  Filter,
  Plus,
  Eye,
  Award,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import apiClient from '../../src/lib/api-client';

export default function VendorsPage() {
  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [businessTypeFilter, setBusinessTypeFilter] = useState('');
  const [verifiedFilter, setVerifiedFilter] = useState('');
  const [page, setPage] = useState(1);

  // Fetch vendors
  const { data: vendorsData, isLoading, error } = useQuery({
    queryKey: ['vendors', { page, search, cityFilter, businessTypeFilter, verifiedFilter }],
    queryFn: () =>
      apiClient.getVendors({
        page,
        limit: 20,
        city: cityFilter || undefined,
        businessType: businessTypeFilter || undefined,
        isVerified: verifiedFilter ? verifiedFilter === 'true' : undefined,
      }),
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  const clearFilters = () => {
    setSearch('');
    setCityFilter('');
    setBusinessTypeFilter('');
    setVerifiedFilter('');
    setPage(1);
  };

  const getBusinessTypeColor = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'manufacturer':
        return 'bg-blue-500/20 text-blue-300';
      case 'distributor':
        return 'bg-green-500/20 text-green-300';
      case 'retailer':
        return 'bg-purple-500/20 text-purple-300';
      case 'wholesaler':
        return 'bg-orange-500/20 text-orange-300';
      default:
        return 'bg-gray-500/20 text-gray-300';
    }
  };

  const formatRating = (rating: number) => {
    return rating.toFixed(1);
  };

  if (error) {
    return (
      <div className="p-6">
        <Card className="bg-red-500/10 border-red-500/20">
          <CardContent className="p-6">
            <p className="text-red-400">Error loading vendors: {(error as any).message}</p>
            <Button
              onClick={() => window.location.reload()}
              className="mt-4"
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const vendors = vendorsData?.vendors || [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <Building className="h-8 w-8" />
            Vendor Directory
          </h1>
          <p className="text-gray-400 mt-1">
            Discover and connect with verified suppliers and vendors
          </p>
        </div>
        <Button className="bg-green-500 hover:bg-green-600 text-white">
          <Plus className="h-4 w-4 mr-2" />
          Add Vendor
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gray-900/50 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Vendors</p>
                <p className="text-2xl font-bold text-white">{vendorsData?.total || 0}</p>
              </div>
              <Building className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gray-900/50 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Verified</p>
                <p className="text-2xl font-bold text-white">
                  {vendors.filter(v => v.isVerified).length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Avg Rating</p>
                <p className="text-2xl font-bold text-white">
                  {vendors.length > 0 
                    ? (vendors.reduce((sum, v) => sum + v.rating, 0) / vendors.length).toFixed(1)
                    : '0.0'
                  }
                </p>
              </div>
              <Star className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Materials</p>
                <p className="text-2xl font-bold text-white">
                  {vendors.reduce((sum, v) => sum + v.materialCount, 0)}
                </p>
              </div>
              <Package className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-gray-900/50 border-gray-700">
        <CardContent className="p-6">
          <form onSubmit={handleSearch} className="flex gap-4 items-end flex-wrap">
            <div className="flex-1 min-w-[250px]">
              <label className="text-sm font-medium text-gray-300 mb-2 block">
                Search Vendors
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by company name or contact..."
                  className="pl-10 bg-gray-800 border-gray-600 text-white"
                />
              </div>
            </div>

            <div className="min-w-[140px]">
              <label className="text-sm font-medium text-gray-300 mb-2 block">
                Business Type
              </label>
              <select
                value={businessTypeFilter}
                onChange={(e) => setBusinessTypeFilter(e.target.value)}
                className="w-full bg-gray-800 border-gray-600 text-white rounded-md px-3 py-2"
              >
                <option value="">All Types</option>
                <option value="Manufacturer">Manufacturer</option>
                <option value="Distributor">Distributor</option>
                <option value="Retailer">Retailer</option>
                <option value="Wholesaler">Wholesaler</option>
              </select>
            </div>

            <div className="min-w-[120px]">
              <label className="text-sm font-medium text-gray-300 mb-2 block">
                City
              </label>
              <Input
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                placeholder="Filter by city"
                className="bg-gray-800 border-gray-600 text-white"
              />
            </div>

            <div className="min-w-[120px]">
              <label className="text-sm font-medium text-gray-300 mb-2 block">
                Verification
              </label>
              <select
                value={verifiedFilter}
                onChange={(e) => setVerifiedFilter(e.target.value)}
                className="w-full bg-gray-800 border-gray-600 text-white rounded-md px-3 py-2"
              >
                <option value="">All Vendors</option>
                <option value="true">Verified Only</option>
                <option value="false">Unverified</option>
              </select>
            </div>

            <Button type="submit" className="bg-blue-500 hover:bg-blue-600">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={clearFilters}
              className="border-gray-600 text-gray-300"
            >
              Clear
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Vendors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {isLoading ? (
          [...Array(9)].map((_, i) => (
            <Card key={i} className="bg-gray-900/50 border-gray-700 animate-pulse">
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="h-4 bg-gray-700 rounded w-3/4" />
                  <div className="h-3 bg-gray-700 rounded w-1/2" />
                  <div className="h-2 bg-gray-700 rounded w-full" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : vendors.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <Building className="h-12 w-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">No vendors found</p>
            <p className="text-gray-500 text-sm">Try adjusting your search criteria</p>
          </div>
        ) : (
          vendors.map((vendor) => (
            <Card key={vendor.id} className="bg-gray-900/50 border-gray-700 hover:border-blue-500/50 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-white">{vendor.companyName}</h3>
                      {vendor.isVerified && (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      )}
                    </div>
                    <Badge className={getBusinessTypeColor(vendor.businessType)}>
                      {vendor.businessType}
                    </Badge>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="space-y-4">
                  {/* Rating */}
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < Math.floor(vendor.rating)
                              ? 'text-yellow-400 fill-current'
                              : 'text-gray-600'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-gray-300 text-sm">{formatRating(vendor.rating)}</span>
                    <span className="text-gray-500 text-xs">({vendor.totalOrders} orders)</span>
                  </div>

                  {/* Contact Info */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <Phone className="h-3 w-3" />
                      <span>{vendor.contact.phone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <Mail className="h-3 w-3" />
                      <span className="truncate">{vendor.contact.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <MapPin className="h-3 w-3" />
                      <span>{vendor.city}, {vendor.state}</span>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-700">
                    <div className="text-center">
                      <p className="text-lg font-semibold text-white">{vendor.materialCount}</p>
                      <p className="text-xs text-gray-400">Materials</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-semibold text-white">{vendor.totalOrders}</p>
                      <p className="text-xs text-gray-400">Orders</p>
                    </div>
                  </div>

                  {/* Business Details */}
                  {(vendor.gstNumber || vendor.panNumber) && (
                    <div className="text-xs text-gray-500 space-y-1">
                      {vendor.gstNumber && (
                        <div>GST: {vendor.gstNumber}</div>
                      )}
                      {vendor.panNumber && (
                        <div>PAN: {vendor.panNumber}</div>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex space-x-2">
                    <Button 
                      size="sm" 
                      className="flex-1 bg-blue-500 hover:bg-blue-600"
                      onClick={() => {/* Navigate to vendor details */}}
                    >
                      View Profile
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="border-gray-600 text-gray-300"
                    >
                      Contact
                    </Button>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-700">
                    <span>Since {new Date(vendor.createdAt).getFullYear()}</span>
                    {vendor.isVerified ? (
                      <div className="flex items-center gap-1 text-green-400">
                        <Award className="h-3 w-3" />
                        <span>Verified</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-yellow-400">
                        <AlertCircle className="h-3 w-3" />
                        <span>Pending</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Pagination */}
      {vendorsData && vendorsData.total > 20 && (
        <div className="flex items-center justify-between">
          <p className="text-gray-400 text-sm">
            Showing {((page - 1) * 20) + 1} to {Math.min(page * 20, vendorsData.total)} of {vendorsData.total} vendors
          </p>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="border-gray-600 text-gray-300"
            >
              Previous
            </Button>
            <span className="text-gray-300 text-sm">
              Page {page} of {Math.ceil(vendorsData.total / 20)}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => p + 1)}
              disabled={page >= Math.ceil(vendorsData.total / 20)}
              className="border-gray-600 text-gray-300"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}