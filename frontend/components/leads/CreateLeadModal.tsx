import React, { useState } from 'react';
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
import { Loader2, Target, DollarSign, MapPin } from 'lucide-react';
import apiClient from '../../lib/api-client';

interface CreateLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateLeadModal({ isOpen, onClose, onSuccess }: CreateLeadModalProps) {
  const [formData, setFormData] = useState({
    source: 'website_form',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    city: '',
    budgetMin: '',
    budgetMax: '',
    projectType: 'full_home',
    propertyType: 'apartment',
    timeline: '1-3 months',
    description: '',
  });
  const [currentStep, setCurrentStep] = useState(1);

  const { toast } = useToast();

  const createLeadMutation = useMutation({
    mutationFn: (leadData: any) => apiClient.createLead(leadData),
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Lead created successfully',
      });
      onSuccess();
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create lead',
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    setFormData({
      source: 'website_form',
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      city: '',
      budgetMin: '',
      budgetMax: '',
      projectType: 'full_home',
      propertyType: 'apartment',
      timeline: '1-3 months',
      description: '',
    });
    setCurrentStep(1);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const leadData = {
      ...formData,
      budgetMin: formData.budgetMin ? parseFloat(formData.budgetMin) : undefined,
      budgetMax: formData.budgetMax ? parseFloat(formData.budgetMax) : undefined,
    };
    createLeadMutation.mutate(leadData);
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

  const isStep1Valid = formData.firstName && formData.lastName && formData.email && formData.phone;
  const isStep2Valid = formData.city && formData.projectType && formData.propertyType;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-gray-900 border-gray-700 text-white sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Create New Lead
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Step {currentStep} of 3: {currentStep === 1 ? 'Contact Information' : currentStep === 2 ? 'Project Details' : 'Requirements & Timeline'}
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
          {/* Step 1: Contact Information */}
          {currentStep === 1 && (
            <div className="space-y-4">
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

              <div className="space-y-2">
                <Label htmlFor="source" className="text-gray-300">
                  Lead Source
                </Label>
                <select
                  id="source"
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  className="w-full bg-gray-800 border-gray-600 text-white rounded-md px-3 py-2"
                >
                  <option value="website_form">Website Form</option>
                  <option value="referral">Referral</option>
                  <option value="social_media">Social Media</option>
                  <option value="advertisement">Advertisement</option>
                  <option value="walk_in">Walk-in</option>
                  <option value="phone_call">Phone Call</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
          )}

          {/* Step 2: Project Details */}
          {currentStep === 2 && (
            <div className="space-y-4">
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
                <Label htmlFor="projectType" className="text-gray-300">
                  Project Type *
                </Label>
                <select
                  id="projectType"
                  required
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
                  Property Type *
                </Label>
                <select
                  id="propertyType"
                  required
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
          )}

          {/* Step 3: Requirements & Budget */}
          {currentStep === 3 && (
            <div className="space-y-4">
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
                      placeholder="Min budget"
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
                      placeholder="Max budget"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-gray-300">
                  Project Description
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

              {/* Summary */}
              <div className="bg-gray-800/50 p-4 rounded-lg">
                <h4 className="text-white font-medium mb-2">Lead Summary</h4>
                <div className="space-y-1 text-sm text-gray-300">
                  <p><strong>Contact:</strong> {formData.firstName} {formData.lastName}</p>
                  <p><strong>Email:</strong> {formData.email}</p>
                  <p><strong>Project:</strong> {formData.projectType.replace('_', ' ')} - {formData.propertyType}</p>
                  <p><strong>Location:</strong> {formData.city}</p>
                  <p><strong>Timeline:</strong> {formData.timeline}</p>
                  {(formData.budgetMin || formData.budgetMax) && (
                    <p><strong>Budget:</strong> 
                      {formData.budgetMin && formData.budgetMax
                        ? `₹${Number(formData.budgetMin).toLocaleString()} - ₹${Number(formData.budgetMax).toLocaleString()}`
                        : formData.budgetMin
                        ? `From ₹${Number(formData.budgetMin).toLocaleString()}`
                        : `Up to ₹${Number(formData.budgetMax).toLocaleString()}`
                      }
                    </p>
                  )}
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
                  disabled={createLeadMutation.isPending}
                  className="bg-green-500 hover:bg-green-600 text-white"
                >
                  {createLeadMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Lead'
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