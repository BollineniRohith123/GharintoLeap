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
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, UserPlus, User } from 'lucide-react';
import apiClient, { Lead } from '../../lib/api-client';

interface AssignLeadModalProps {
  lead: Lead;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AssignLeadModal({ lead, isOpen, onClose, onSuccess }: AssignLeadModalProps) {
  const [selectedDesignerId, setSelectedDesignerId] = useState('');

  const { toast } = useToast();

  // Fetch designers for assignment
  const { data: usersData, isLoading: loadingUsers } = useQuery({
    queryKey: ['users-for-assignment'],
    queryFn: () => apiClient.getUsers({ limit: 100 }),
    enabled: isOpen,
  });

  const assignLeadMutation = useMutation({
    mutationFn: (assignedTo: number) => apiClient.assignLead(lead.id, assignedTo),
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Lead assigned successfully',
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to assign lead',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDesignerId) {
      toast({
        title: 'Error',
        description: 'Please select a designer to assign the lead',
        variant: 'destructive',
      });
      return;
    }
    assignLeadMutation.mutate(parseInt(selectedDesignerId));
  };

  const designers = usersData?.users?.filter(user => 
    user.roles?.some(role => role === 'interior_designer')
  ) || [];

  const projectManagers = usersData?.users?.filter(user => 
    user.roles?.some(role => role === 'project_manager')
  ) || [];

  const allAssignableUsers = [...designers, ...projectManagers];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-gray-700 text-white sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Assign Lead
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Assign {lead.firstName} {lead.lastName}'s lead to a designer or project manager
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Lead Summary */}
          <div className="bg-gray-800/50 p-4 rounded-lg">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                {lead.firstName?.[0]?.toUpperCase() || 'L'}
              </div>
              <div>
                <h4 className="text-white font-medium">{lead.firstName} {lead.lastName}</h4>
                <p className="text-sm text-gray-400">{lead.email} • {lead.city}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs text-gray-400">
              <div>
                <span className="block text-gray-500">Project Type:</span>
                <span className="text-gray-300 capitalize">{lead.projectType?.replace('_', ' ')}</span>
              </div>
              <div>
                <span className="block text-gray-500">Timeline:</span>
                <span className="text-gray-300">{lead.timeline}</span>
              </div>
              <div>
                <span className="block text-gray-500">Budget:</span>
                <span className="text-gray-300">
                  {lead.budgetMin && lead.budgetMax
                    ? `₹${(lead.budgetMin / 100000).toFixed(0)}L - ₹${(lead.budgetMax / 100000).toFixed(0)}L`
                    : lead.budgetMin
                    ? `From ₹${(lead.budgetMin / 100000).toFixed(0)}L`
                    : lead.budgetMax
                    ? `Up to ₹${(lead.budgetMax / 100000).toFixed(0)}L`
                    : 'Not specified'}
                </span>
              </div>
              <div>
                <span className="block text-gray-500">Score:</span>
                <span className="text-green-400 font-semibold">{lead.score}/100</span>
              </div>
            </div>
          </div>

          {/* Current Assignment */}
          {lead.assignedTo && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-lg">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-yellow-400" />
                <span className="text-yellow-400 text-sm font-medium">Currently Assigned</span>
              </div>
              <p className="text-gray-300 text-sm mt-1">
                This lead is currently assigned to <strong>{lead.assignedTo.name}</strong>
              </p>
            </div>
          )}

          {/* Assignment Selection */}
          <div className="space-y-2">
            <Label htmlFor="assignee" className="text-gray-300">
              {lead.assignedTo ? 'Reassign to:' : 'Assign to:'} *
            </Label>
            {loadingUsers ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                <span className="ml-2 text-gray-400">Loading team members...</span>
              </div>
            ) : (
              <select
                id="assignee"
                required
                value={selectedDesignerId}
                onChange={(e) => setSelectedDesignerId(e.target.value)}
                className="w-full bg-gray-800 border-gray-600 text-white rounded-md px-3 py-2"
              >
                <option value="">Select a team member</option>
                {designers.length > 0 && (
                  <optgroup label="Interior Designers">
                    {designers.map((designer) => (
                      <option key={designer.id} value={designer.id}>
                        {designer.firstName} {designer.lastName} - {designer.city || 'Any City'}
                      </option>
                    ))}
                  </optgroup>
                )}
                {projectManagers.length > 0 && (
                  <optgroup label="Project Managers">
                    {projectManagers.map((pm) => (
                      <option key={pm.id} value={pm.id}>
                        {pm.firstName} {pm.lastName} - {pm.city || 'Any City'}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            )}
            
            {allAssignableUsers.length === 0 && !loadingUsers && (
              <p className="text-gray-400 text-sm mt-2">
                No designers or project managers available for assignment.
              </p>
            )}
          </div>

          {/* Selected User Info */}
          {selectedDesignerId && (
            <div className="bg-gray-800/50 p-3 rounded-lg">
              {(() => {
                const selectedUser = allAssignableUsers.find(u => u.id.toString() === selectedDesignerId);
                if (!selectedUser) return null;
                
                return (
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center text-white text-sm font-medium">
                      {selectedUser.firstName?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <div>
                      <p className="text-white font-medium">
                        {selectedUser.firstName} {selectedUser.lastName}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <span>{selectedUser.email}</span>
                        {selectedUser.city && (
                          <>
                            <span>•</span>
                            <span>{selectedUser.city}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()
            )}
            </div>
          )}

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
              disabled={assignLeadMutation.isPending || !selectedDesignerId}
              className="bg-green-500 hover:bg-green-600 text-white"
            >
              {assignLeadMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Assigning...
                </>
              ) : (
                lead.assignedTo ? 'Reassign Lead' : 'Assign Lead'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}