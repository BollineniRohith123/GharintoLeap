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
import { Loader2, ArrowRight, DollarSign, Calendar, Target } from 'lucide-react';
import apiClient, { Lead } from '../../lib/api-client';

interface ConvertLeadModalProps {
  lead: Lead;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ConvertLeadModal({ lead, isOpen, onClose, onSuccess }: ConvertLeadModalProps) {
  const [formData, setFormData] = useState({
    projectTitle: `Interior Design Project for ${lead.firstName} ${lead.lastName}`,
    projectDescription: lead.description || '',
    budget: lead.budgetMax?.toString() || lead.budgetMin?.toString() || '',
    designerId: lead.assignedTo?.id?.toString() || '',
  });

  const { toast } = useToast();

  // Fetch designers
  const { data: usersData } = useQuery({
    queryKey: ['users-for-conversion'],
    queryFn: () => apiClient.getUsers({ limit: 100 }),
    enabled: isOpen,
  });

  const convertLeadMutation = useMutation({
    mutationFn: (conversionData: any) => apiClient.convertLead(lead.id, conversionData),
    onSuccess: (data) => {
      toast({
        title: 'Success',
        description: `Lead converted to project successfully! Project ID: ${data.project.id}`,
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to convert lead',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const conversionData = {
      projectTitle: formData.projectTitle,
      projectDescription: formData.projectDescription,
      budget: parseFloat(formData.budget),
      designerId: formData.designerId ? parseInt(formData.designerId) : undefined,
    };

    convertLeadMutation.mutate(conversionData);
  };

  const designers = usersData?.users?.filter(user => 
    user.roles?.some(role => role === 'interior_designer')
  ) || [];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-gray-700 text-white sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRight className="h-5 w-5" />
            Convert Lead to Project
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Convert {lead.firstName} {lead.lastName}'s qualified lead into a project
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Lead Summary */}
          <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-lg">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-full bg-green-500 flex items-center justify-center">
                <Target className="h-5 w-5 text-white" />
              </div>
              <div>
                <h4 className="text-white font-medium">Ready for Conversion</h4>
                <p className="text-sm text-gray-400">High-quality lead with score {lead.score}/100</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Client:</span>
                <p className="text-white">{lead.firstName} {lead.lastName}</p>
                <p className="text-gray-300 text-xs">{lead.email} • {lead.phone}</p>
              </div>
              <div>
                <span className="text-gray-400">Location:</span>
                <p className="text-white">{lead.city}</p>
              </div>
              <div>
                <span className="text-gray-400">Project Type:</span>
                <p className="text-white capitalize">{lead.projectType?.replace('_', ' ')}</p>
              </div>
              <div>
                <span className="text-gray-400">Property:</span>
                <p className="text-white capitalize">{lead.propertyType}</p>
              </div>
            </div>
          </div>

          {/* Project Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-white">Project Information</h3>
            
            <div className="space-y-2">
              <Label htmlFor="projectTitle" className="text-gray-300">
                Project Title *
              </Label>
              <Input
                id="projectTitle"
                required
                value={formData.projectTitle}
                onChange={(e) => setFormData({ ...formData, projectTitle: e.target.value })}
                className="bg-gray-800 border-gray-600 text-white"
                placeholder="Enter project title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="projectDescription" className="text-gray-300">
                Project Description
              </Label>
              <Textarea
                id="projectDescription"
                value={formData.projectDescription}
                onChange={(e) => setFormData({ ...formData, projectDescription: e.target.value })}
                className="bg-gray-800 border-gray-600 text-white"
                placeholder="Describe the project requirements..."
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="budget" className="text-gray-300">
                  Project Budget (₹) *
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
                {formData.budget && (
                  <p className="text-xs text-gray-400">
                    Budget: {formatCurrency(parseFloat(formData.budget))}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="designerId" className="text-gray-300">
                  Assign Designer
                </Label>
                <select
                  id="designerId"
                  value={formData.designerId}
                  onChange={(e) => setFormData({ ...formData, designerId: e.target.value })}
                  className="w-full bg-gray-800 border-gray-600 text-white rounded-md px-3 py-2"
                >
                  <option value="">
                    {lead.assignedTo ? `Keep current (${lead.assignedTo.name})` : 'Auto-assign designer'}
                  </option>
                  {designers.map((designer) => (
                    <option key={designer.id} value={designer.id}>
                      {designer.firstName} {designer.lastName}
                      {designer.city && ` - ${designer.city}`}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Budget Comparison */}
          {(lead.budgetMin || lead.budgetMax) && formData.budget && (
            <div className="bg-gray-800/50 p-4 rounded-lg">
              <h4 className="text-white font-medium mb-2">Budget Comparison</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Lead Budget Range:</span>
                  <span className="text-gray-300">
                    {lead.budgetMin && lead.budgetMax
                      ? `${formatCurrency(lead.budgetMin)} - ${formatCurrency(lead.budgetMax)}`
                      : lead.budgetMin
                      ? `From ${formatCurrency(lead.budgetMin)}`
                      : `Up to ${formatCurrency(lead.budgetMax!)}`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Project Budget:</span>
                  <span className="text-white font-medium">
                    {formatCurrency(parseFloat(formData.budget))}
                  </span>
                </div>
                {lead.budgetMax && parseFloat(formData.budget) > lead.budgetMax && (
                  <p className="text-yellow-400 text-xs mt-2">
                    ⚠️ Project budget exceeds lead's maximum budget
                  </p>
                )}
                {lead.budgetMin && parseFloat(formData.budget) < lead.budgetMin && (
                  <p className="text-red-400 text-xs mt-2">
                    ⚠️ Project budget is below lead's minimum budget
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Timeline Information */}
          <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-blue-400" />
              <span className="text-blue-400 text-sm font-medium">Timeline Information</span>
            </div>
            <p className="text-gray-300 text-sm">
              Client expects project completion timeline: <strong>{lead.timeline}</strong>
            </p>
            <p className="text-gray-400 text-xs mt-1">
              Project dates will be set based on this timeline preference
            </p>
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
              disabled={convertLeadMutation.isPending || !formData.budget}
              className="bg-green-500 hover:bg-green-600 text-white"
            >
              {convertLeadMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Converting...
                </>
              ) : (
                <>
                  <ArrowRight className="mr-2 h-4 w-4" />
                  Convert to Project
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}