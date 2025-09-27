import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Target,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  DollarSign,
  Star,
  Clock,
  Home,
  FileText,
  UserPlus,
} from 'lucide-react';
import { Lead } from '../../lib/api-client';

interface LeadDetailsModalProps {
  lead: Lead;
  isOpen: boolean;
  onClose: () => void;
}

export default function LeadDetailsModal({ lead, isOpen, onClose }: LeadDetailsModalProps) {
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-gray-700 text-white sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Lead Details
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Comprehensive information about {lead.firstName} {lead.lastName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header Info */}
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-4">
                  <div className="h-16 w-16 rounded-full bg-blue-500 flex items-center justify-center text-white text-xl font-bold">
                    {lead.firstName?.[0]?.toUpperCase() || 'L'}
                  </div>
                  <div>
                    <CardTitle className="text-xl text-white">
                      {lead.firstName} {lead.lastName}
                    </CardTitle>
                    <CardDescription className="text-gray-400 mt-1">
                      Lead ID: #{lead.id} • Source: {lead.source?.replace('_', ' ').toUpperCase()}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusBadgeColor(lead.status)}>
                      {lead.status?.replace('_', ' ').toUpperCase()}
                    </Badge>
                    <Badge className={getTimelineColor(lead.timeline)}>
                      {lead.timeline?.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className={`h-5 w-5 ${getScoreColor(lead.score)}`} />
                    <span className={`text-lg font-bold ${getScoreColor(lead.score)}`}>
                      {lead.score}
                    </span>
                    <span className="text-sm text-gray-400">/100</span>
                  </div>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Contact Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-lg text-white flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center space-x-3 text-gray-300">
                  <Mail className="h-4 w-4" />
                  <span>{lead.email}</span>
                </div>
                <div className="flex items-center space-x-3 text-gray-300">
                  <Phone className="h-4 w-4" />
                  <span>{lead.phone}</span>
                </div>
                <div className="flex items-center space-x-3 text-gray-300">
                  <MapPin className="h-4 w-4" />
                  <span>{lead.city}</span>
                </div>
                <Separator className="bg-gray-700" />
                <div className="flex items-center space-x-3 text-gray-300">
                  <Calendar className="h-4 w-4" />
                  <span>Created: {new Date(lead.createdAt).toLocaleDateString()}</span>
                </div>
                {lead.updatedAt !== lead.createdAt && (
                  <div className="flex items-center space-x-3 text-gray-300">
                    <Clock className="h-4 w-4" />
                    <span>Updated: {new Date(lead.updatedAt).toLocaleDateString()}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Assignment */}
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-lg text-white flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  Assignment
                </CardTitle>
              </CardHeader>
              <CardContent>
                {lead.assignedTo ? (
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 rounded-full bg-green-500 flex items-center justify-center text-white font-semibold">
                        {lead.assignedTo.name?.[0]?.toUpperCase() || 'A'}
                      </div>
                      <div>
                        <p className="font-medium text-white">{lead.assignedTo.name}</p>
                        <p className="text-sm text-gray-400">Assigned Designer</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <UserPlus className="h-8 w-8 text-gray-600 mx-auto mb-2" />
                    <p className="text-gray-400">No one assigned yet</p>
                    <p className="text-gray-500 text-sm">Lead is available for assignment</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Project Details */}
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg text-white flex items-center gap-2">
                <Home className="h-5 w-5" />
                Project Requirements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Project Type:</span>
                    <Badge className="bg-blue-500/20 text-blue-300 capitalize">
                      {lead.projectType?.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Property Type:</span>
                    <Badge className="bg-purple-500/20 text-purple-300 capitalize">
                      {lead.propertyType}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Timeline:</span>
                    <Badge className={getTimelineColor(lead.timeline)}>
                      {lead.timeline?.toUpperCase()}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-3">
                  {(lead.budgetMin || lead.budgetMax) && (
                    <div>
                      <span className="text-gray-400 block mb-1">Budget Range:</span>
                      <div className="flex items-center gap-1 text-green-400">
                        <DollarSign className="h-4 w-4" />
                        <span className="font-medium">
                          {lead.budgetMin && lead.budgetMax
                            ? `${formatCurrency(lead.budgetMin)} - ${formatCurrency(lead.budgetMax)}`
                            : lead.budgetMin
                            ? `From ${formatCurrency(lead.budgetMin)}`
                            : `Up to ${formatCurrency(lead.budgetMax!)}`}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Description */}
          {lead.description && (
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-lg text-white flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Project Description
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300 leading-relaxed">{lead.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Lead Score Breakdown */}
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg text-white flex items-center gap-2">
                <Star className="h-5 w-5" />
                Lead Score Analysis
              </CardTitle>
              <CardDescription className="text-gray-400">
                Factors contributing to the lead score of {lead.score}/100
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Budget Range:</span>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-16 bg-gray-700 rounded-full">
                      <div 
                        className="h-2 bg-green-500 rounded-full" 
                        style={{width: `${Math.min(100, (lead.budgetMin || 0) / 10000)}%`}}
                      />
                    </div>
                    <span className="text-sm text-gray-300">+{Math.min(30, Math.floor((lead.budgetMin || 0) / 50000) * 10)}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Timeline Urgency:</span>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-16 bg-gray-700 rounded-full">
                      <div 
                        className="h-2 bg-yellow-500 rounded-full" 
                        style={{
                          width: lead.timeline === 'immediate' ? '100%' : 
                                 lead.timeline === '1-3 months' ? '80%' : 
                                 lead.timeline === '3-6 months' ? '60%' : '40%'
                        }}
                      />
                    </div>
                    <span className="text-sm text-gray-300">
                      +{lead.timeline === 'immediate' ? 25 : 
                        lead.timeline === '1-3 months' ? 20 : 
                        lead.timeline === '3-6 months' ? 15 : 10}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Project Scope:</span>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-16 bg-gray-700 rounded-full">
                      <div 
                        className="h-2 bg-blue-500 rounded-full" 
                        style={{
                          width: lead.projectType === 'full_home' ? '100%' : 
                                 lead.projectType === 'multiple_rooms' ? '75%' : '50%'
                        }}
                      />
                    </div>
                    <span className="text-sm text-gray-300">
                      +{lead.projectType === 'full_home' ? 20 : 
                        lead.projectType === 'multiple_rooms' ? 15 : 10}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Lead Source:</span>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-16 bg-gray-700 rounded-full">
                      <div 
                        className="h-2 bg-purple-500 rounded-full" 
                        style={{
                          width: lead.source === 'referral' ? '100%' : 
                                 lead.source === 'website_form' ? '66%' : '50%'
                        }}
                      />
                    </div>
                    <span className="text-sm text-gray-300">
                      +{lead.source === 'referral' ? 15 : 
                        lead.source === 'website_form' ? 10 : 8}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Conversion Status */}
          {lead.convertedToProject && (
            <Card className="bg-green-500/10 border-green-500/20">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-green-500 flex items-center justify-center">
                    <ArrowRight className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-green-400 font-medium">Lead Converted Successfully!</p>
                    <p className="text-gray-400 text-sm">
                      This lead has been converted to Project #{lead.convertedToProject}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}