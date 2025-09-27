import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import {
  ArrowLeft,
  Edit,
  Star,
  Package,
  Building,
  IndianRupee,
  Clock,
  ShoppingCart,
  Eye,
  Heart,
  Share,
  Truck,
  Shield,
  Award,
} from 'lucide-react';
import apiClient, { Material } from '../../src/lib/api-client';

export default function MaterialDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const materialId = parseInt(id!);

  // Fetch material details
  const { data: material, isLoading, error } = useQuery({
    queryKey: ['material', materialId],
    queryFn: () => apiClient.getMaterialDetails(materialId),
    enabled: !!materialId,
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStockStatusColor = (quantity: number, minOrder: number) => {
    if (quantity === 0) return 'bg-red-500/20 text-red-300';
    if (quantity < minOrder * 2) return 'bg-yellow-500/20 text-yellow-300';
    return 'bg-green-500/20 text-green-300';
  };

  const getStockStatusText = (quantity: number, minOrder: number) => {
    if (quantity === 0) return 'Out of Stock';
    if (quantity < minOrder * 2) return 'Low Stock';
    return 'In Stock';
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-700 rounded w-1/3" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-96 bg-gray-700 rounded" />
            <div className="space-y-4">
              <div className="h-6 bg-gray-700 rounded w-3/4" />
              <div className="h-4 bg-gray-700 rounded w-1/2" />
              <div className="h-20 bg-gray-700 rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="bg-red-500/10 border-red-500/20">
          <CardContent className="p-6">
            <p className="text-red-400">Error loading material: {(error as any).message}</p>
            <Button
              onClick={() => navigate('/materials')}
              className="mt-4"
            >
              Back to Materials
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!material) {
    return (
      <div className="p-6">
        <Card className="bg-gray-900/50 border-gray-700">
          <CardContent className="p-6 text-center">
            <p className="text-gray-400">Material not found</p>
            <Button
              onClick={() => navigate('/materials')}
              className="mt-4"
            >
              Back to Materials
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const images = material.images || ['/api/placeholder/400/400'];
  const hasDiscount = material.discountedPrice && material.discountedPrice < material.price;
  const discountPercentage = hasDiscount ? 
    Math.round(((material.price - material.discountedPrice!) / material.price) * 100) : 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/materials')}
            className="text-gray-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Materials
          </Button>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" className="border-gray-600 text-gray-300">
            <Heart className="h-4 w-4 mr-2" />
            Save
          </Button>
          <Button variant="outline" className="border-gray-600 text-gray-300">
            <Share className="h-4 w-4 mr-2" />
            Share
          </Button>
          <Button className="bg-blue-500 hover:bg-blue-600 text-white">
            <Edit className="h-4 w-4 mr-2" />
            Edit Material
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Image Gallery */}
        <div className="space-y-4">
          <Card className="bg-gray-900/50 border-gray-700">
            <CardContent className="p-0">
              <div className="aspect-square bg-gray-800 rounded-lg overflow-hidden">
                <img
                  src={images[activeImageIndex]}
                  alt={material.name}
                  className="w-full h-full object-cover"
                />
              </div>
            </CardContent>
          </Card>
          
          {images.length > 1 && (
            <div className="flex space-x-2 overflow-x-auto">
              {images.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setActiveImageIndex(index)}
                  className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 ${
                    index === activeImageIndex ? 'border-blue-500' : 'border-gray-700'
                  }`}
                >
                  <img
                    src={image}
                    alt={`${material.name} ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Information */}
        <div className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-white">{material.name}</h1>
                <p className="text-gray-400 mt-1">
                  {material.brand} • {material.model}
                </p>
              </div>
              <Badge className={getStockStatusColor(material.stockQuantity, material.minOrderQuantity || 1)}>
                {getStockStatusText(material.stockQuantity, material.minOrderQuantity || 1)}
              </Badge>
            </div>

            <div className="flex items-center space-x-2">
              <Badge className="bg-blue-500/20 text-blue-300">
                {material.category}
              </Badge>
              {material.subcategory && (
                <Badge className="bg-purple-500/20 text-purple-300">
                  {material.subcategory}
                </Badge>
              )}
            </div>

            {/* Pricing */}
            <div className="space-y-2">
              <div className="flex items-baseline space-x-3">
                <span className="text-3xl font-bold text-white">
                  {formatCurrency(material.discountedPrice || material.price)}
                </span>
                <span className="text-gray-400">per {material.unit}</span>
                {hasDiscount && (
                  <>
                    <span className="text-lg text-gray-500 line-through">
                      {formatCurrency(material.price)}
                    </span>
                    <Badge className="bg-green-500/20 text-green-300">
                      {discountPercentage}% OFF
                    </Badge>
                  </>
                )}
              </div>
              <p className="text-sm text-gray-500">
                Minimum order: {material.minOrderQuantity || 1} {material.unit}
              </p>
            </div>

            {/* Description */}
            {material.description && (
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Description</h3>
                <p className="text-gray-300 leading-relaxed">{material.description}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <Button 
                className="flex-1 bg-green-500 hover:bg-green-600 text-white"
                disabled={material.stockQuantity === 0}
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Add to Cart
              </Button>
              <Button variant="outline" className="border-gray-600 text-gray-300">
                <Eye className="h-4 w-4 mr-2" />
                Quick View
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Information */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Specifications */}
        {material.specifications && Object.keys(material.specifications).length > 0 && (
          <Card className="bg-gray-900/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Package className="h-5 w-5" />
                Specifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(material.specifications).map(([key, value]) => (
                  <div key={key} className="flex justify-between">
                    <span className="text-gray-400 capitalize">{key.replace('_', ' ')}</span>
                    <span className="text-white font-medium">{String(value)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Vendor Information */}
        <Card className="bg-gray-900/50 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Building className="h-5 w-5" />
              Vendor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="text-white font-medium">{material.vendor.name}</h4>
                {material.vendor.rating && (
                  <div className="flex items-center space-x-2 mt-1">
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < Math.floor(material.vendor.rating!)
                              ? 'text-yellow-400 fill-current'
                              : 'text-gray-600'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-gray-400 text-sm">
                      {material.vendor.rating.toFixed(1)}
                    </span>
                  </div>
                )}
              </div>
              <Button 
                variant="outline" 
                className="w-full border-gray-600 text-gray-300"
                onClick={() => navigate(`/vendors/${material.vendor.id}`)}
              >
                View Vendor Profile
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stock & Delivery */}
        <Card className="bg-gray-900/50 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Stock & Delivery
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-400">Available Stock</span>
                <span className="text-white font-medium">
                  {material.stockQuantity.toLocaleString()} {material.unit}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-400">Minimum Order</span>
                <span className="text-white font-medium">
                  {(material.minOrderQuantity || 1).toLocaleString()} {material.unit}
                </span>
              </div>

              {material.leadTimeDays && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Lead Time</span>
                  <span className="text-white font-medium">
                    {material.leadTimeDays} days
                  </span>
                </div>
              )}

              <div className="pt-3 border-t border-gray-700">
                <div className="flex items-center space-x-2 text-sm text-green-400">
                  <Shield className="h-4 w-4" />
                  <span>Quality Assured</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-blue-400 mt-1">
                  <Award className="h-4 w-4" />
                  <span>Verified Supplier</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Related Materials Section */}
      <Card className="bg-gray-900/50 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Related Materials</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Package className="h-12 w-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">Related materials will be shown here</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}