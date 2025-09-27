import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, FolderPlus, Calendar, DollarSign, MapPin } from 'lucide-react';
import apiClient from '../../lib/api-client';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateProjectModal({ isOpen, onClose, onSuccess }: CreateProjectModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    clientId: '',
    designerId: '',
    budget: '',
    startDate: '',
    endDate: '',
    city: '',
    address: '',
    areaSqft: '',
    propertyType: 'apartment',
  });
  const [currentStep, setCurrentStep] = useState(1);

  const { toast } = useToast();

  // Fetch users for client and designer selection
  const { data: usersData } = useQuery({
    queryKey: ['users-for-project'],
    queryFn: () => apiClient.getUsers({ limit: 100 }),
  });

  const createProjectMutation = useMutation({
    mutationFn: (projectData: any) => apiClient.createProject(projectData),
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Project created successfully',
      });
      onSuccess();
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create project',
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      clientId: '',
      designerId: '',
      budget: '',
      startDate: '',
      endDate: '',
      city: '',
      address: '',
      areaSqft: '',
      propertyType: 'apartment',
    });
    setCurrentStep(1);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createProjectMutation.mutate({
      title: formData.title,
      description: formData.description,
      clientId: parseInt(formData.clientId),
      designerId: formData.designerId ? parseInt(formData.designerId) : undefined,
      budget: parseFloat(formData.budget),
      startDate: formData.startDate,
      endDate: formData.endDate,
      city: formData.city,
      address: formData.address,
      areaSqft: formData.areaSqft ? parseInt(formData.areaSqft) : undefined,
      propertyType: formData.propertyType,
    });
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const nextStep = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const customers = usersData?.users?.filter(user => 
    user.roles?.some(role => role === 'customer')
  ) || [];
  
  const designers = usersData?.users?.filter(user => 
    user.roles?.some(role => role === 'interior_designer')
  ) || [];

  const isStep1Valid = formData.title && formData.clientId && formData.budget;
  const isStep2Valid = formData.startDate && formData.endDate && formData.city;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-gray-900 border-gray-700 text-white sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderPlus className="h-5 w-5" />
            Create New Project
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Step {currentStep} of 3: {currentStep === 1 ? 'Basic Information' : currentStep === 2 ? 'Timeline & Location' : 'Additional Details'}
          </DialogDescription>
        </DialogHeader>

        {/* Progress Indicator */}
        <div className="flex items-center justify-between mb-6">
          {[1, 2, 3].map((step) => (
            <div key={step} className="flex items-center">
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step <= currentStep
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-700 text-gray-400'
                }`}
              >
                {step}
              </div>
              {step < 3 && (
                <div
                  className={`h-1 w-16 mx-2 ${
                    step < currentStep ? 'bg-green-500' : 'bg-gray-700'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Step 1: Basic Information */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-gray-300">
                  Project Title *
                </Label>
                <Input
                  id="title"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="bg-gray-800 border-gray-600 text-white"
                  placeholder="Enter project title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-gray-300">
                  Description
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="bg-gray-800 border-gray-600 text-white"
                  placeholder="Enter project description"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="clientId" className="text-gray-300">
                  Client *
                </Label>
                <select
                  id="clientId"
                  required
                  value={formData.clientId}
                  onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                  className="w-full bg-gray-800 border-gray-600 text-white rounded-md px-3 py-2"
                >
                  <option value="">Select a client</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.firstName} {customer.lastName} ({customer.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="designerId" className="text-gray-300">
                  Designer
                </Label>
                <select
                  id="designerId"
                  value={formData.designerId}
                  onChange={(e) => setFormData({ ...formData, designerId: e.target.value })}
                  className="w-full bg-gray-800 border-gray-600 text-white rounded-md px-3 py-2"
                >
                  <option value="">Auto-assign designer</option>
                  {designers.map((designer) => (
                    <option key={designer.id} value={designer.id}>
                      {designer.firstName} {designer.lastName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="budget" className="text-gray-300">
                  Budget (₹) *
                </Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="budget"
                    type="number"
                    required
                    value={formData.budget}
                    onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                    className="pl-10 bg-gray-800 border-gray-600 text-white"
                    placeholder="Enter project budget"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Timeline & Location */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate" className="text-gray-300">
                    Start Date *
                  </Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="startDate"
                      type="date"
                      required
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="pl-10 bg-gray-800 border-gray-600 text-white"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate" className="text-gray-300">
                    End Date *
                  </Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="endDate"
                      type="date"
                      required
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="pl-10 bg-gray-800 border-gray-600 text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="city" className="text-gray-300">
                  City *
                </Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="city"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="pl-10 bg-gray-800 border-gray-600 text-white"
                    placeholder="Enter city"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address" className="text-gray-300">
                  Address
                </Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="bg-gray-800 border-gray-600 text-white"
                  placeholder="Enter full address"
                  rows={2}
                />
              </div>
            </div>
          )}

          {/* Step 3: Additional Details */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="propertyType" className="text-gray-300">
                  Property Type
                </Label>
                <select
                  id="propertyType"
                  value={formData.propertyType}
                  onChange={(e) => setFormData({ ...formData, propertyType: e.target.value })}
                  className="w-full bg-gray-800 border-gray-600 text-white rounded-md px-3 py-2"
                >
                  <option value="apartment">Apartment</option>
                  <option value="villa">Villa</option>
                  <option value="office">Office</option>
                  <option value="showroom">Showroom</option>
                  <option value="restaurant">Restaurant</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="areaSqft" className="text-gray-300">
                  Area (sq ft)
                </Label>
                <Input
                  id="areaSqft"
                  type="number"
                  value={formData.areaSqft}
                  onChange={(e) => setFormData({ ...formData, areaSqft: e.target.value })}
                  className="bg-gray-800 border-gray-600 text-white"
                  placeholder="Enter area in square feet"
                />
              </div>

              {/* Summary */}
              <div className="bg-gray-800/50 p-4 rounded-lg">
                <h4 className="text-white font-medium mb-2">Project Summary</h4>
                <div className="space-y-1 text-sm text-gray-300">
                  <p><strong>Title:</strong> {formData.title}</p>
                  <p><strong>Budget:</strong> ₹{Number(formData.budget).toLocaleString()}</p>
                  <p><strong>Duration:</strong> {formData.startDate} to {formData.endDate}</p>
                  <p><strong>Location:</strong> {formData.city}</p>
                  <p><strong>Property:</strong> {formData.propertyType}</p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-4">
            <div className="flex space-x-2">
              {currentStep > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={prevStep}
                  className="border-gray-600 text-gray-300 hover:bg-gray-800"
                >
                  Previous
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="border-gray-600 text-gray-300 hover:bg-gray-800"
              >
                Cancel
              </Button>
            </div>

            <div className="flex space-x-2">
              {currentStep < 3 ? (
                <Button
                  type="button"
                  onClick={nextStep}
                  disabled={(currentStep === 1 && !isStep1Valid) || (currentStep === 2 && !isStep2Valid)}
                  className="bg-blue-500 hover:bg-blue-600 text-white"
                >
                  Next
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={createProjectMutation.isPending}
                  className="bg-green-500 hover:bg-green-600 text-white"
                >
                  {createProjectMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Project'
                  )}
                </Button>
              )}
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}