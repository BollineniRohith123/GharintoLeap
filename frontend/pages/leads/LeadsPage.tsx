import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import {
  Target,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Eye,
  UserPlus,
  ArrowRight,
  Star,
  Phone,
  Mail,
  MapPin,
  DollarSign,
  Clock,
  TrendingUp,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import apiClient, { Lead } from '../../lib/api-client';
import CreateLeadModal from '../../components/leads/CreateLeadModal';
import LeadDetailsModal from '../../components/leads/LeadDetailsModal';
import EditLeadModal from '../../components/leads/EditLeadModal';
import AssignLeadModal from '../../components/leads/AssignLeadModal';
import ConvertLeadModal from '../../components/leads/ConvertLeadModal';

export default function LeadsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [minScoreFilter, setMinScoreFilter] = useState('');
  const [page, setPage] = useState(1);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch leads
  const { data: leadsData, isLoading, error } = useQuery({
    queryKey: ['leads', { page, search, statusFilter, cityFilter, minScoreFilter }],
    queryFn: () =>
      apiClient.getLeads({
        page,
        limit: 20,
        status: statusFilter || undefined,
        city: cityFilter || undefined,
        minScore: minScoreFilter ? parseInt(minScoreFilter) : undefined,
      }),
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('');
    setCityFilter('');
    setMinScoreFilter('');
    setPage(1);
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'new':
        return 'bg-blue-500/20 text-blue-300';
      case 'contacted':
        return 'bg-yellow-500/20 text-yellow-300';
      case 'qualified':
        return 'bg-green-500/20 text-green-300';
      case 'proposal_sent':
        return 'bg-purple-500/20 text-purple-300';
      case 'negotiation':
        return 'bg-orange-500/20 text-orange-300';
      case 'converted':
        return 'bg-green-600/20 text-green-400';
      case 'lost':
        return 'bg-red-500/20 text-red-300';
      default:
        return 'bg-gray-500/20 text-gray-300';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  const getTimelineColor = (timeline: string) => {
    switch (timeline?.toLowerCase()) {
      case 'immediate':
        return 'bg-red-500/20 text-red-300';
      case '1-3 months':
        return 'bg-orange-500/20 text-orange-300';
      case '3-6 months':
        return 'bg-yellow-500/20 text-yellow-300';
      case '6-12 months':
        return 'bg-blue-500/20 text-blue-300';
      default:
        return 'bg-gray-500/20 text-gray-300';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (error) {
    return (
      <div className="p-6">
        <Card className="bg-red-500/10 border-red-500/20">
          <CardContent className="p-6">
            <p className="text-red-400">Error loading leads: {(error as any).message}</p>
            <Button
              onClick={() => queryClient.invalidateQueries({ queryKey: ['leads'] })}
              className="mt-4"
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const leads = leadsData?.leads || [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <Target className="h-8 w-8" />
            Lead Management
          </h1>
          <p className="text-gray-400 mt-1">
            Track and convert potential customers into projects
          </p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-green-500 hover:bg-green-600 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Lead
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="bg-gray-900/50 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Leads</p>
                <p className="text-2xl font-bold text-white">{leadsData?.total || 0}</p>
              </div>
              <Target className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gray-900/50 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">New Leads</p>
                <p className="text-2xl font-bold text-white">
                  {leads.filter(l => l.status === 'new').length}
                </p>
              </div>
              <Plus className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gray-900/50 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Qualified</p>
                <p className="text-2xl font-bold text-white">
                  {leads.filter(l => l.status === 'qualified').length}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gray-900/50 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Converted</p>
                <p className="text-2xl font-bold text-white">
                  {leads.filter(l => l.status === 'converted').length}
                </p>
              </div>
              <ArrowRight className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gray-900/50 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Avg Score</p>
                <p className="text-2xl font-bold text-white">
                  {leads.length > 0 ? Math.round(leads.reduce((sum, l) => sum + l.score, 0) / leads.length) : 0}
                </p>
              </div>
              <Star className="h-8 w-8 text-yellow-500" />
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
                Search Leads
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, email, or phone..."
                  className="pl-10 bg-gray-800 border-gray-600 text-white"
                />
              </div>
            </div>

            <div className="min-w-[140px]">
              <label className="text-sm font-medium text-gray-300 mb-2 block">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full bg-gray-800 border-gray-600 text-white rounded-md px-3 py-2"
              >
                <option value="">All Status</option>
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="qualified">Qualified</option>
                <option value="proposal_sent">Proposal Sent</option>
                <option value="negotiation">Negotiation</option>
                <option value="converted">Converted</option>
                <option value="lost">Lost</option>
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
                Min Score
              </label>
              <Input
                type="number"
                min="0"
                max="100"
                value={minScoreFilter}
                onChange={(e) => setMinScoreFilter(e.target.value)}
                placeholder="Min score"
                className="bg-gray-800 border-gray-600 text-white"
              />
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

      {/* Leads Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          [...Array(9)].map((_, i) => (
            <Card key={i} className="bg-gray-900/50 border-gray-700 animate-pulse">
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="h-4 bg-gray-700 rounded w-3/4" />
                  <div className="h-3 bg-gray-700 rounded w-1/2" />
                  <div className="h-2 bg-gray-700 rounded w-full" />
                  <div className="h-3 bg-gray-700 rounded w-2/3" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : leads.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <Target className="h-12 w-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">No leads found</p>
            <p className="text-gray-500 text-sm">Create your first lead to start tracking potential customers</p>
          </div>
        ) : (
          leads.map((lead) => (
            <Card key={lead.id} className="bg-gray-900/50 border-gray-700 hover:border-green-500/50 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-semibold text-white">
                        {lead.firstName} {lead.lastName}
                      </h3>
                      <div className="flex items-center gap-1">
                        <Star className={`h-4 w-4 ${getScoreColor(lead.score)}`} />
                        <span className={`text-sm font-medium ${getScoreColor(lead.score)}`}>
                          {lead.score}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusBadgeColor(lead.status)}>
                        {lead.status?.replace('_', ' ').toUpperCase()}
                      </Badge>
                      <Badge className={getTimelineColor(lead.timeline)}>
                        {lead.timeline?.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-gray-800 border-gray-600">
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedLead(lead);
                          setShowDetailsModal(true);
                        }}
                        className="text-gray-300 hover:bg-gray-700"
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedLead(lead);
                          setShowEditModal(true);
                        }}
                        className="text-gray-300 hover:bg-gray-700"
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Lead
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedLead(lead);
                          setShowAssignModal(true);
                        }}
                        className="text-gray-300 hover:bg-gray-700"
                      >
                        <UserPlus className="mr-2 h-4 w-4" />
                        Assign Lead
                      </DropdownMenuItem>
                      {lead.status === 'qualified' && (
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedLead(lead);
                            setShowConvertModal(true);
                          }}
                          className="text-green-400 hover:bg-green-500/20"
                        >
                          <ArrowRight className="mr-2 h-4 w-4" />
                          Convert to Project
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {/* Contact Info */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <Mail className="h-3 w-3" />
                      <span className="truncate">{lead.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <Phone className="h-3 w-3" />
                      <span>{lead.phone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <MapPin className="h-3 w-3" />
                      <span>{lead.city}</span>
                    </div>
                  </div>

                  {/* Budget Range */}
                  {(lead.budgetMin || lead.budgetMax) && (
                    <div className="flex items-center gap-2 text-sm">
                      <DollarSign className="h-3 w-3 text-green-400" />
                      <span className="text-gray-300">
                        {lead.budgetMin && lead.budgetMax
                          ? `${formatCurrency(lead.budgetMin)} - ${formatCurrency(lead.budgetMax)}`
                          : lead.budgetMin
                          ? `From ${formatCurrency(lead.budgetMin)}`
                          : `Up to ${formatCurrency(lead.budgetMax!)}`}
                      </span>
                    </div>
                  )}

                  {/* Project Details */}
                  <div className="text-xs text-gray-400 space-y-1">
                    <div className="flex justify-between">
                      <span>Project Type:</span>
                      <span className="text-gray-300 capitalize">{lead.projectType?.replace('_', ' ')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Property:</span>
                      <span className="text-gray-300 capitalize">{lead.propertyType}</span>
                    </div>
                  </div>

                  {/* Assignment */}
                  {lead.assignedTo && (
                    <div className="flex items-center gap-2 text-xs">
                      <UserPlus className="h-3 w-3 text-blue-400" />
                      <span className="text-gray-400">Assigned to:</span>
                      <span className="text-blue-400">{lead.assignedTo.name}</span>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-700">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{new Date(lead.createdAt).toLocaleDateString()}</span>
                    </div>
                    <span className="capitalize">{lead.source?.replace('_', ' ')}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Pagination */}
      {leadsData && leadsData.total > 20 && (
        <div className="flex items-center justify-between">
          <p className="text-gray-400 text-sm">
            Showing {((page - 1) * 20) + 1} to {Math.min(page * 20, leadsData.total)} of {leadsData.total} leads
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
              Page {page} of {Math.ceil(leadsData.total / 20)}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => p + 1)}
              disabled={page >= Math.ceil(leadsData.total / 20)}
              className="border-gray-600 text-gray-300"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Modals */}
      {showCreateModal && (
        <CreateLeadModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            queryClient.invalidateQueries({ queryKey: ['leads'] });
          }}
        />
      )}

      {selectedLead && showDetailsModal && (
        <LeadDetailsModal
          lead={selectedLead}
          isOpen={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedLead(null);
          }}
        />
      )}

      {selectedLead && showEditModal && (
        <EditLeadModal
          lead={selectedLead}
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedLead(null);
          }}
          onSuccess={() => {
            setShowEditModal(false);
            setSelectedLead(null);
            queryClient.invalidateQueries({ queryKey: ['leads'] });
          }}
        />
      )}

      {selectedLead && showAssignModal && (
        <AssignLeadModal
          lead={selectedLead}
          isOpen={showAssignModal}
          onClose={() => {
            setShowAssignModal(false);
            setSelectedLead(null);
          }}
          onSuccess={() => {
            setShowAssignModal(false);
            setSelectedLead(null);
            queryClient.invalidateQueries({ queryKey: ['leads'] });
          }}
        />
      )}

      {selectedLead && showConvertModal && (
        <ConvertLeadModal
          lead={selectedLead}
          isOpen={showConvertModal}
          onClose={() => {
            setShowConvertModal(false);
            setSelectedLead(null);
          }}
          onSuccess={() => {
            setShowConvertModal(false);
            setSelectedLead(null);
            queryClient.invalidateQueries({ queryKey: ['leads'] });
            queryClient.invalidateQueries({ queryKey: ['projects'] });
          }}
        />
      )}
    </div>
  );
}