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
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  FolderOpen,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  DollarSign,
  TrendingUp,
  Clock,
  Home,
  Target,
} from 'lucide-react';
import { Project } from '../../lib/api-client';

interface ProjectDetailsModalProps {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
}

export default function ProjectDetailsModal({ project, isOpen, onClose }: ProjectDetailsModalProps) {
  const getStatusBadgeColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'planning':
        return 'bg-blue-500/20 text-blue-300';
      case 'in_progress':
        return 'bg-yellow-500/20 text-yellow-300';
      case 'review':
        return 'bg-purple-500/20 text-purple-300';
      case 'completed':
        return 'bg-green-500/20 text-green-300';
      case 'cancelled':
        return 'bg-red-500/20 text-red-300';
      case 'on_hold':
        return 'bg-gray-500/20 text-gray-300';
      default:
        return 'bg-gray-500/20 text-gray-300';
    }
  };

  const getPriorityBadgeColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'high':
        return 'bg-red-500/20 text-red-300';
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-300';
      case 'low':
        return 'bg-green-500/20 text-green-300';
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getDaysDifference = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-gray-700 text-white sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Project Details
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Comprehensive information about {project.title}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header Info */}
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-xl text-white">{project.title}</CardTitle>
                  <CardDescription className="text-gray-400 mt-1">
                    {project.description || 'No description provided'}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getStatusBadgeColor(project.status)}>
                    {project.status?.replace('_', ' ').toUpperCase()}
                  </Badge>
                  <Badge className={getPriorityBadgeColor(project.priority)}>
                    {project.priority?.toUpperCase()} PRIORITY
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Progress */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-300">Project Progress</span>
                    <span className="text-sm text-white">{project.progressPercentage || 0}%</span>
                  </div>
                  <Progress value={project.progressPercentage || 0} className="h-3" />
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-500/20 mx-auto mb-2">
                      <DollarSign className="h-5 w-5 text-green-400" />
                    </div>
                    <p className="text-xs text-gray-400">Budget</p>
                    <p className="text-sm font-semibold text-white">{formatCurrency(project.budget)}</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-500/20 mx-auto mb-2">
                      <TrendingUp className="h-5 w-5 text-blue-400" />
                    </div>
                    <p className="text-xs text-gray-400">Estimated Cost</p>
                    <p className="text-sm font-semibold text-white">
                      {project.estimatedCost ? formatCurrency(project.estimatedCost) : 'N/A'}
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-yellow-500/20 mx-auto mb-2">
                      <Target className="h-5 w-5 text-yellow-400" />
                    </div>
                    <p className="text-xs text-gray-400">Actual Cost</p>
                    <p className="text-sm font-semibold text-white">
                      {project.actualCost ? formatCurrency(project.actualCost) : 'N/A'}
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-purple-500/20 mx-auto mb-2">
                      <Home className="h-5 w-5 text-purple-400" />
                    </div>
                    <p className="text-xs text-gray-400">Area</p>
                    <p className="text-sm font-semibold text-white">
                      {project.areaSqft ? `${project.areaSqft} sq ft` : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Team & Client Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Client Information */}
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-lg text-white flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Client Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                    {project.client?.name?.[0]?.toUpperCase() || 'C'}
                  </div>
                  <div>
                    <p className="font-medium text-white">{project.client?.name}</p>
                    <p className="text-sm text-gray-400">Client</p>
                  </div>
                </div>
                <Separator className="bg-gray-700" />
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-gray-300">
                    <Mail className="h-4 w-4" />
                    <span className="text-sm">{project.client?.email}</span>
                  </div>
                  {project.client?.phone && (
                    <div className="flex items-center space-x-2 text-gray-300">
                      <Phone className="h-4 w-4" />
                      <span className="text-sm">{project.client.phone}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Team Information */}
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-lg text-white flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Project Team
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {project.designer && (
                  <div>
                    <div className="flex items-center space-x-3">
                      <div className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center text-white text-sm font-medium">
                        {project.designer.name?.[0]?.toUpperCase() || 'D'}
                      </div>
                      <div>
                        <p className="font-medium text-white">{project.designer.name}</p>
                        <p className="text-xs text-gray-400">Interior Designer</p>
                      </div>
                    </div>
                    {project.designer.email && (
                      <div className="flex items-center space-x-2 text-gray-300 mt-1 ml-11">
                        <Mail className="h-3 w-3" />
                        <span className="text-xs">{project.designer.email}</span>
                      </div>
                    )}
                  </div>
                )}
                
                {project.projectManager && (
                  <div>
                    <div className="flex items-center space-x-3">
                      <div className="h-8 w-8 rounded-full bg-purple-500 flex items-center justify-center text-white text-sm font-medium">
                        {project.projectManager.name?.[0]?.toUpperCase() || 'PM'}
                      </div>
                      <div>
                        <p className="font-medium text-white">{project.projectManager.name}</p>
                        <p className="text-xs text-gray-400">Project Manager</p>
                      </div>
                    </div>
                    {project.projectManager.email && (
                      <div className="flex items-center space-x-2 text-gray-300 mt-1 ml-11">
                        <Mail className="h-3 w-3" />
                        <span className="text-xs">{project.projectManager.email}</span>
                      </div>
                    )}
                  </div>
                )}

                {!project.designer && !project.projectManager && (
                  <p className="text-gray-400 text-sm">No team members assigned yet</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Timeline & Location */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Timeline */}
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-lg text-white flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Project Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Start Date</span>
                  <span className="text-white">{formatDate(project.startDate)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">End Date</span>
                  <span className="text-white">{formatDate(project.endDate)}</span>
                </div>
                {project.estimatedEndDate && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Estimated End</span>
                    <span className="text-white">{formatDate(project.estimatedEndDate)}</span>
                  </div>
                )}
                <Separator className="bg-gray-700" />
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Duration</span>
                  <div className="flex items-center gap-1 text-white">
                    <Clock className="h-4 w-4" />
                    <span>{getDaysDifference(project.startDate, project.endDate)} days</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Location & Property */}
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-lg text-white flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Location & Property
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">City</span>
                  <span className="text-white">{project.city}</span>
                </div>
                {project.address && (
                  <div>
                    <span className="text-gray-400 block mb-1">Address</span>
                    <span className="text-white text-sm">{project.address}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Property Type</span>
                  <Badge className="bg-gray-700 text-gray-300">
                    {project.propertyType?.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
                {project.areaSqft && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Area</span>
                    <span className="text-white">{project.areaSqft} sq ft</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Milestones */}
          {project.milestones && project.milestones.length > 0 && (
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-lg text-white flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Project Milestones
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Track progress through key project phases
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {project.milestones.map((milestone, index) => (
                    <div key={milestone.id} className="relative">
                      {index < project.milestones!.length - 1 && (
                        <div className="absolute left-4 top-8 bottom-0 w-0.5 bg-gray-700" />
                      )}
                      <div className="flex items-start space-x-3">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium ${
                          milestone.status === 'completed'
                            ? 'bg-green-500 text-white'
                            : milestone.status === 'in_progress'
                            ? 'bg-yellow-500 text-white'
                            : 'bg-gray-600 text-gray-300'
                        }`}>
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="text-white font-medium">{milestone.title}</h4>
                            <Badge className={getStatusBadgeColor(milestone.status)}>
                              {milestone.status?.replace('_', ' ').toUpperCase()}
                            </Badge>
                          </div>
                          {milestone.description && (
                            <p className="text-gray-400 text-sm mt-1">{milestone.description}</p>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                            {milestone.plannedStartDate && (
                              <span>Start: {formatDate(milestone.plannedStartDate)}</span>
                            )}
                            {milestone.plannedEndDate && (
                              <span>End: {formatDate(milestone.plannedEndDate)}</span>
                            )}
                            {milestone.budget && (
                              <span>Budget: {formatCurrency(milestone.budget)}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}