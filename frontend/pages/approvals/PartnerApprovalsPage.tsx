import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { CheckCircle, XCircle, Clock, Building2, Palette, Briefcase } from 'lucide-react';

interface Vendor {
  id: number;
  company_name: string;
  business_type: string;
  gst_number: string;
  pan_number: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  created_at: string;
  user_id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
}

interface Designer {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  city: string;
  created_at: string;
}

interface ProjectManager {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  city: string;
  created_at: string;
}

export default function PartnerApprovalsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('vendors');
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{ id: number; name: string; type: string } | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Fetch pending vendors
  const { data: vendorsData, isLoading: vendorsLoading } = useQuery({
    queryKey: ['approvals', 'vendors', 'pending'],
    queryFn: async () => {
      const response = await apiClient.get('/approvals/vendors/pending');
      return response.data || [];
    }
  });

  // Fetch pending designers
  const { data: designersData, isLoading: designersLoading } = useQuery({
    queryKey: ['approvals', 'designers', 'pending'],
    queryFn: async () => {
      const response = await apiClient.get('/approvals/designers/pending');
      return response.data || [];
    }
  });

  // Fetch pending project managers
  const { data: pmsData, isLoading: pmsLoading } = useQuery({
    queryKey: ['approvals', 'project-managers', 'pending'],
    queryFn: async () => {
      const response = await apiClient.get('/approvals/project-managers/pending');
      return response.data || [];
    }
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async ({ id, type }: { id: number; type: string }) => {
      const response = await apiClient.post(`/approvals/${type}/${id}/approve`, {});
      return response.data;
    },
    onSuccess: (_, variables) => {
      toast({
        title: 'Approved',
        description: 'Partner approved successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['approvals', variables.type, 'pending'] });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to approve partner',
        variant: 'destructive',
      });
    }
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ id, type, reason }: { id: number; type: string; reason: string }) => {
      const response = await apiClient.post(`/approvals/${type}/${id}/reject`, { reason });
      return response.data;
    },
    onSuccess: (_, variables) => {
      toast({
        title: 'Rejected',
        description: 'Partner rejected successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['approvals', variables.type, 'pending'] });
      setRejectDialogOpen(false);
      setRejectionReason('');
      setSelectedItem(null);
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to reject partner',
        variant: 'destructive',
      });
    }
  });

  const handleApprove = (id: number, type: string) => {
    approveMutation.mutate({ id, type });
  };

  const handleRejectClick = (id: number, name: string, type: string) => {
    setSelectedItem({ id, name, type });
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = () => {
    if (!selectedItem) return;
    if (rejectionReason.length < 20) {
      toast({
        title: 'Invalid Reason',
        description: 'Rejection reason must be at least 20 characters',
        variant: 'destructive',
      });
      return;
    }
    rejectMutation.mutate({ id: selectedItem.id, type: selectedItem.type, reason: rejectionReason });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Partner Approvals</h1>
        <p className="text-gray-400 mt-2">Review and approve pending partner registrations</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-gray-800">
          <TabsTrigger value="vendors" className="data-[state=active]:bg-blue-600">
            <Building2 className="w-4 h-4 mr-2" />
            Vendors ({vendorsData?.total || 0})
          </TabsTrigger>
          <TabsTrigger value="designers" className="data-[state=active]:bg-blue-600">
            <Palette className="w-4 h-4 mr-2" />
            Interior Designers ({designersData?.total || 0})
          </TabsTrigger>
          <TabsTrigger value="project-managers" className="data-[state=active]:bg-blue-600">
            <Briefcase className="w-4 h-4 mr-2" />
            Project Managers ({pmsData?.total || 0})
          </TabsTrigger>
        </TabsList>

        {/* Vendors Tab */}
        <TabsContent value="vendors" className="space-y-4">
          {vendorsLoading ? (
            <div className="text-center py-8 text-gray-400">Loading...</div>
          ) : vendorsData?.vendors?.length === 0 ? (
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="py-8 text-center text-gray-400">
                <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No pending vendor approvals</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {vendorsData?.vendors?.map((vendor: Vendor) => (
                <Card key={vendor.id} className="bg-gray-800 border-gray-700">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-white">{vendor.company_name}</CardTitle>
                        <CardDescription className="text-gray-400">
                          {vendor.first_name} {vendor.last_name} • {vendor.email}
                        </CardDescription>
                      </div>
                      <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                        <Clock className="w-3 h-3 mr-1" />
                        Pending
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-400">Business Type:</span>
                        <p className="text-white font-medium">{vendor.business_type || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-gray-400">City:</span>
                        <p className="text-white font-medium">{vendor.city || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-gray-400">GST Number:</span>
                        <p className="text-white font-medium">{vendor.gst_number || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-gray-400">PAN Number:</span>
                        <p className="text-white font-medium">{vendor.pan_number || 'N/A'}</p>
                      </div>
                      <div className="col-span-2">
                        <span className="text-gray-400">Address:</span>
                        <p className="text-white font-medium">{vendor.address || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-gray-400">Phone:</span>
                        <p className="text-white font-medium">{vendor.phone || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-gray-400">Registered:</span>
                        <p className="text-white font-medium">{formatDate(vendor.created_at)}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-4 border-t border-gray-700">
                      <Button
                        onClick={() => handleApprove(vendor.id, 'vendors')}
                        disabled={approveMutation.isPending}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Approve
                      </Button>
                      <Button
                        onClick={() => handleRejectClick(vendor.id, vendor.company_name, 'vendors')}
                        disabled={rejectMutation.isPending}
                        variant="destructive"
                        className="flex-1"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Reject
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Designers Tab */}
        <TabsContent value="designers" className="space-y-4">
          {designersLoading ? (
            <div className="text-center py-8 text-gray-400">Loading...</div>
          ) : designersData?.designers?.length === 0 ? (
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="py-8 text-center text-gray-400">
                <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No pending interior designer approvals</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {designersData?.designers?.map((designer: Designer) => (
                <Card key={designer.id} className="bg-gray-800 border-gray-700">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-white">{designer.first_name} {designer.last_name}</CardTitle>
                        <CardDescription className="text-gray-400">{designer.email}</CardDescription>
                      </div>
                      <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                        <Clock className="w-3 h-3 mr-1" />
                        Pending
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-400">Phone:</span>
                        <p className="text-white font-medium">{designer.phone || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-gray-400">City:</span>
                        <p className="text-white font-medium">{designer.city || 'N/A'}</p>
                      </div>
                      <div className="col-span-2">
                        <span className="text-gray-400">Registered:</span>
                        <p className="text-white font-medium">{formatDate(designer.created_at)}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-4 border-t border-gray-700">
                      <Button
                        onClick={() => handleApprove(designer.id, 'designers')}
                        disabled={approveMutation.isPending}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Approve
                      </Button>
                      <Button
                        onClick={() => handleRejectClick(designer.id, `${designer.first_name} ${designer.last_name}`, 'designers')}
                        disabled={rejectMutation.isPending}
                        variant="destructive"
                        className="flex-1"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Reject
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Project Managers Tab */}
        <TabsContent value="project-managers" className="space-y-4">
          {pmsLoading ? (
            <div className="text-center py-8 text-gray-400">Loading...</div>
          ) : pmsData?.projectManagers?.length === 0 ? (
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="py-8 text-center text-gray-400">
                <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No pending project manager approvals</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {pmsData?.projectManagers?.map((pm: ProjectManager) => (
                <Card key={pm.id} className="bg-gray-800 border-gray-700">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-white">{pm.first_name} {pm.last_name}</CardTitle>
                        <CardDescription className="text-gray-400">{pm.email}</CardDescription>
                      </div>
                      <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                        <Clock className="w-3 h-3 mr-1" />
                        Pending
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-400">Phone:</span>
                        <p className="text-white font-medium">{pm.phone || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-gray-400">City:</span>
                        <p className="text-white font-medium">{pm.city || 'N/A'}</p>
                      </div>
                      <div className="col-span-2">
                        <span className="text-gray-400">Registered:</span>
                        <p className="text-white font-medium">{formatDate(pm.created_at)}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-4 border-t border-gray-700">
                      <Button
                        onClick={() => handleApprove(pm.id, 'project-managers')}
                        disabled={approveMutation.isPending}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Approve
                      </Button>
                      <Button
                        onClick={() => handleRejectClick(pm.id, `${pm.first_name} ${pm.last_name}`, 'project-managers')}
                        disabled={rejectMutation.isPending}
                        variant="destructive"
                        className="flex-1"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Reject
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Rejection Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="bg-gray-800 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Reject Partner</DialogTitle>
            <DialogDescription className="text-gray-400">
              Please provide a reason for rejecting {selectedItem?.name}. This will be sent to the partner.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Enter rejection reason (minimum 20 characters)..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="bg-gray-900 border-gray-700 text-white min-h-[120px]"
            />
            <p className="text-sm text-gray-400">
              {rejectionReason.length}/20 characters minimum
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectConfirm}
              disabled={rejectionReason.length < 20 || rejectMutation.isPending}
            >
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

