import React, { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
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
import { Loader2, Edit, DollarSign, MapPin, Star } from 'lucide-react';
import apiClient, { Lead } from '../../lib/api-client';

interface EditLeadModalProps {
  lead: Lead;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditLeadModal({ lead, isOpen, onClose, onSuccess }: EditLeadModalProps) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    city: '',
    budgetMin: '',
    budgetMax: '',
    projectType: '',
    propertyType: '',
    timeline: '',
    description: '',
    status: '',
    score: 0,
  });

  const { toast } = useToast();

  useEffect(() => {
    if (lead) {
      setFormData({
        firstName: lead.firstName || '',
        lastName: lead.lastName || '',
        email: lead.email || '',
        phone: lead.phone || '',
        city: lead.city || '',
        budgetMin: lead.budgetMin?.toString() || '',
        budgetMax: lead.budgetMax?.toString() || '',
        projectType: lead.projectType || '',
        propertyType: lead.propertyType || '',
        timeline: lead.timeline || '',
        description: lead.description || '',
        status: lead.status || '',
        score: lead.score || 0,
      });
    }
  }, [lead]);

  const updateLeadMutation = useMutation({
    mutationFn: (leadData: any) => apiClient.updateLead(lead.id, leadData),
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Lead updated successfully',
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update lead',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const updateData: any = {
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      phone: formData.phone,
      city: formData.city,
      projectType: formData.projectType,
      propertyType: formData.propertyType,
      timeline: formData.timeline,
      description: formData.description,
      status: formData.status,
      score: formData.score,
    };

    if (formData.budgetMin) {
      updateData.budgetMin = parseFloat(formData.budgetMin);
    }
    if (formData.budgetMax) {
      updateData.budgetMax = parseFloat(formData.budgetMax);
    }

    updateLeadMutation.mutate(updateData);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-gray-700 text-white sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Edit Lead
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Update lead information and status for {lead.firstName} {lead.lastName}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-white">Contact Information</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-gray-300">
                  First Name *
                </Label>
                <Input
                  id="firstName"
                  required
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="bg-gray-800 border-gray-600 text-white"
                  placeholder="Enter first name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-gray-300">
                  Last Name *
                </Label>
                <Input
                  id="lastName"
                  required
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="bg-gray-800 border-gray-600 text-white"
                  placeholder="Enter last name"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-300">
                  Email Address *
                </Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="bg-gray-800 border-gray-600 text-white"
                  placeholder="Enter email address"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-gray-300">
                  Phone Number *
                </Label>
                <Input
                  id="phone"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="bg-gray-800 border-gray-600 text-white"
                  placeholder="Enter phone number"
                />
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
          </div>

          {/* Project Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-white">Project Details</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="projectType" className="text-gray-300">
                  Project Type
                </Label>
                <select
                  id="projectType"
                  value={formData.projectType}
                  onChange={(e) => setFormData({ ...formData, projectType: e.target.value })}
                  className="w-full bg-gray-800 border-gray-600 text-white rounded-md px-3 py-2"
                >
                  <option value="full_home">Full Home Interior</option>
                  <option value="multiple_rooms">Multiple Rooms</option>
                  <option value="single_room">Single Room</option>
                  <option value="kitchen">Kitchen Only</option>
                  <option value="bathroom">Bathroom Only</option>
                  <option value="office">Office Interior</option>
                  <option value="commercial">Commercial Space</option>
                </select>
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
                  <option value="independent_house">Independent House</option>
                  <option value="office">Office</option>
                  <option value="showroom">Showroom</option>
                  <option value="restaurant">Restaurant</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timeline" className="text-gray-300">
                Expected Timeline
              </Label>
              <select
                id="timeline"
                value={formData.timeline}
                onChange={(e) => setFormData({ ...formData, timeline: e.target.value })}
                className="w-full bg-gray-800 border-gray-600 text-white rounded-md px-3 py-2"
              >
                <option value="immediate">Immediate (Within 1 month)</option>
                <option value="1-3 months">1-3 Months</option>
                <option value="3-6 months">3-6 Months</option>
                <option value="6-12 months">6-12 Months</option>
                <option value="more_than_year">More than a year</option>
              </select>
            </div>
          </div>

          {/* Budget */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-white">Budget Range</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="budgetMin" className="text-gray-300">
                  Minimum Budget (₹)
                </Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="budgetMin"
                    type="number"
                    value={formData.budgetMin}
                    onChange={(e) => setFormData({ ...formData, budgetMin: e.target.value })}
                    className="pl-10 bg-gray-800 border-gray-600 text-white"
                    placeholder="Minimum budget"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="budgetMax" className="text-gray-300">
                  Maximum Budget (₹)
                </Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="budgetMax"
                    type="number"
                    value={formData.budgetMax}
                    onChange={(e) => setFormData({ ...formData, budgetMax: e.target.value })}
                    className="pl-10 bg-gray-800 border-gray-600 text-white"
                    placeholder="Maximum budget"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Status & Score */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-white">Lead Status & Scoring</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status" className="text-gray-300">
                  Lead Status
                </Label>
                <select
                  id="status"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full bg-gray-800 border-gray-600 text-white rounded-md px-3 py-2"
                >
                  <option value="new">New</option>
                  <option value="contacted">Contacted</option>
                  <option value="qualified">Qualified</option>
                  <option value="proposal_sent">Proposal Sent</option>
                  <option value="negotiation">Negotiation</option>
                  <option value="converted">Converted</option>
                  <option value="lost">Lost</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="score" className="text-gray-300">
                  Lead Score: <span className={getScoreColor(formData.score)}>{formData.score}</span>/100
                </Label>
                <div className="space-y-2">
                  <input
                    type="range"
                    id="score"
                    min="0"
                    max="100"
                    value={formData.score}
                    onChange={(e) => setFormData({ ...formData, score: parseInt(e.target.value) })}
                    className="w-full"
                  />
                  <div className="flex items-center gap-1">
                    <Star className={`h-4 w-4 ${getScoreColor(formData.score)}`} />
                    <span className={`text-sm ${getScoreColor(formData.score)}`}>
                      {formData.score >= 80 ? 'Hot Lead' : 
                       formData.score >= 60 ? 'Warm Lead' : 
                       formData.score >= 40 ? 'Cold Lead' : 'Very Cold Lead'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-white">Project Description</h3>
            
            <div className="space-y-2">
              <Label htmlFor="description" className="text-gray-300">
                Description
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="bg-gray-800 border-gray-600 text-white"
                placeholder="Describe the project requirements, style preferences, specific needs..."
                rows={4}
              />
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
              disabled={updateLeadMutation.isPending}
              className="bg-green-500 hover:bg-green-600 text-white"
            >
              {updateLeadMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Lead'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}