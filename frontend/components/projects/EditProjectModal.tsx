import React, { useState, useEffect } from 'react';
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
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Edit, DollarSign, Calendar, MapPin } from 'lucide-react';
import apiClient, { Project } from '../../lib/api-client';

interface EditProjectModalProps {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditProjectModal({ project, isOpen, onClose, onSuccess }: EditProjectModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    designerId: '',
    status: '',
    priority: '',
    budget: '',
    estimatedCost: '',
    actualCost: '',
    progressPercentage: 0,
    startDate: '',
    endDate: '',
    estimatedEndDate: '',
    city: '',
    address: '',
    areaSqft: '',
    propertyType: '',
  });

  const { toast } = useToast();

  // Fetch users for designer selection
  const { data: usersData } = useQuery({
    queryKey: ['users-for-project-edit'],
    queryFn: () => apiClient.getUsers({ limit: 100 }),
  });

  useEffect(() => {
    if (project) {
      setFormData({
        title: project.title || '',
        description: project.description || '',
        designerId: project.designer?.id?.toString() || '',
        status: project.status || '',
        priority: project.priority || '',
        budget: project.budget?.toString() || '',
        estimatedCost: project.estimatedCost?.toString() || '',
        actualCost: project.actualCost?.toString() || '',
        progressPercentage: project.progressPercentage || 0,
        startDate: project.startDate ? project.startDate.split('T')[0] : '',
        endDate: project.endDate ? project.endDate.split('T')[0] : '',
        estimatedEndDate: project.estimatedEndDate ? project.estimatedEndDate.split('T')[0] : '',
        city: project.city || '',
        address: project.address || '',
        areaSqft: project.areaSqft?.toString() || '',
        propertyType: project.propertyType || '',
      });
    }
  }, [project]);

  const updateProjectMutation = useMutation({
    mutationFn: (projectData: any) => apiClient.updateProject(project.id, projectData),
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Project updated successfully',
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update project',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const updateData: any = {
      title: formData.title,
      description: formData.description,
      status: formData.status,
      priority: formData.priority,
      progressPercentage: formData.progressPercentage,
      startDate: formData.startDate,
      endDate: formData.endDate,
      city: formData.city,
      address: formData.address,
      propertyType: formData.propertyType,
    };

    if (formData.designerId) {
      updateData.designerId = parseInt(formData.designerId);
    }
    if (formData.budget) {
      updateData.budget = parseFloat(formData.budget);
    }
    if (formData.estimatedCost) {
      updateData.estimatedCost = parseFloat(formData.estimatedCost);
    }
    if (formData.actualCost) {
      updateData.actualCost = parseFloat(formData.actualCost);
    }
    if (formData.estimatedEndDate) {
      updateData.estimatedEndDate = formData.estimatedEndDate;
    }
    if (formData.areaSqft) {
      updateData.areaSqft = parseInt(formData.areaSqft);
    }

    updateProjectMutation.mutate(updateData);
  };

  const designers = usersData?.users?.filter(user => 
    user.roles?.some(role => role === 'interior_designer')
  ) || [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-gray-700 text-white sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Edit Project
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Update project information and track progress for {project.title}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-white">Basic Information</h3>
            
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status" className="text-gray-300">
                  Status
                </Label>
                <select
                  id="status"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full bg-gray-800 border-gray-600 text-white rounded-md px-3 py-2"
                >
                  <option value="planning">Planning</option>
                  <option value="in_progress">In Progress</option>
                  <option value="review">Review</option>
                  <option value="completed">Completed</option>
                  <option value="on_hold">On Hold</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority" className="text-gray-300">
                  Priority
                </Label>
                <select
                  id="priority"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full bg-gray-800 border-gray-600 text-white rounded-md px-3 py-2"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
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
                <option value="">No designer assigned</option>
                {designers.map((designer) => (
                  <option key={designer.id} value={designer.id}>
                    {designer.firstName} {designer.lastName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Progress & Budget */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-white">Progress & Budget</h3>
            
            <div className="space-y-2">
              <Label htmlFor="progressPercentage" className="text-gray-300">
                Progress Percentage: {formData.progressPercentage}%
              </Label>
              <div className="space-y-2">
                <input
                  type="range"
                  id="progressPercentage"
                  min="0"
                  max="100"
                  value={formData.progressPercentage}
                  onChange={(e) => setFormData({ ...formData, progressPercentage: parseInt(e.target.value) })}
                  className="w-full"
                />
                <Progress value={formData.progressPercentage} className="h-2" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="budget" className="text-gray-300">
                  Budget (₹)
                </Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="budget"
                    type="number"
                    value={formData.budget}
                    onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                    className="pl-10 bg-gray-800 border-gray-600 text-white"
                    placeholder="Budget"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="estimatedCost" className="text-gray-300">
                  Estimated Cost (₹)
                </Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="estimatedCost"
                    type="number"
                    value={formData.estimatedCost}
                    onChange={(e) => setFormData({ ...formData, estimatedCost: e.target.value })}
                    className="pl-10 bg-gray-800 border-gray-600 text-white"
                    placeholder="Estimated cost"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="actualCost" className="text-gray-300">
                  Actual Cost (₹)
                </Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="actualCost"
                    type="number"
                    value={formData.actualCost}
                    onChange={(e) => setFormData({ ...formData, actualCost: e.target.value })}
                    className="pl-10 bg-gray-800 border-gray-600 text-white"
                    placeholder="Actual cost"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-white">Timeline</h3>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate" className="text-gray-300">
                  Start Date
                </Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="pl-10 bg-gray-800 border-gray-600 text-white"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate" className="text-gray-300">
                  End Date
                </Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="pl-10 bg-gray-800 border-gray-600 text-white"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="estimatedEndDate" className="text-gray-300">
                  Estimated End Date
                </Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="estimatedEndDate"
                    type="date"
                    value={formData.estimatedEndDate}
                    onChange={(e) => setFormData({ ...formData, estimatedEndDate: e.target.value })}
                    className="pl-10 bg-gray-800 border-gray-600 text-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Location & Property */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-white">Location & Property</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city" className="text-gray-300">
                  City
                </Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="pl-10 bg-gray-800 border-gray-600 text-white"
                    placeholder="Enter city"
                  />
                </div>
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
                  placeholder="Area in square feet"
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
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={updateProjectMutation.isPending}
              className="bg-green-500 hover:bg-green-600 text-white"
            >
              {updateProjectMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Project'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}