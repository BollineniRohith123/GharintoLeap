import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import {
  ArrowLeft,
  Edit,
  Trash2,
  Users,
  Calendar,
  DollarSign,
  MapPin,
  Home,
  Clock,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Target,
  Activity,
} from 'lucide-react';
import apiClient, { Project } from '../../src/lib/api-client';
import EditProjectModal from '../../components/projects/EditProjectModal';

export default function ProjectDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [showEditModal, setShowEditModal] = useState(false);

  const projectId = parseInt(id!);

  // Fetch project details
  const { data: project, isLoading, error } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => apiClient.getProjectDetails(projectId),
    enabled: !!projectId,
  });

  // Delete project mutation
  const deleteProjectMutation = useMutation({
    mutationFn: () => apiClient.deleteProject(projectId),
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Project deleted successfully',
      });
      navigate('/projects');
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete project',
        variant: 'destructive',
      });
    },
  });

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      deleteProjectMutation.mutate();
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'planning':
        return 'bg-blue-500/20 text-blue-300';
      case 'in_progress':
        return 'bg-yellow-500/20 text-yellow-300';
      case 'completed':
        return 'bg-green-500/20 text-green-300';
      case 'on_hold':
        return 'bg-orange-500/20 text-orange-300';
      case 'cancelled':
        return 'bg-red-500/20 text-red-300';
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

  const calculateDaysRemaining = (endDate: string) => {
    const today = new Date();
    const end = new Date(endDate);
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="space-y-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-700 rounded w-1/3 mb-4" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="bg-gray-900/50 border-gray-700">
                  <CardContent className="p-6">
                    <div className="h-20 bg-gray-700 rounded" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="bg-red-500/10 border-red-500/20">
          <CardContent className="p-6">
            <p className="text-red-400">Error loading project: {(error as any).message}</p>
            <Button
              onClick={() => navigate('/projects')}
              className="mt-4"
            >
              Back to Projects
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-6">
        <Card className="bg-gray-900/50 border-gray-700">
          <CardContent className="p-6 text-center">
            <p className="text-gray-400">Project not found</p>
            <Button
              onClick={() => navigate('/projects')}
              className="mt-4"
            >
              Back to Projects
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const daysRemaining = calculateDaysRemaining(project.endDate);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/projects')}
            className="text-gray-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Projects
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-white">{project.title}</h1>
            <p className="text-gray-400 mt-1">Project Details & Progress</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            onClick={() => setShowEditModal(true)}
            className="bg-blue-500 hover:bg-blue-600 text-white"
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit Project
          </Button>
          <Button
            onClick={handleDelete}
            variant="destructive"
            disabled={deleteProjectMutation.isPending}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* Status and Priority */}
      <div className="flex items-center space-x-4">
        <Badge className={getStatusBadgeColor(project.status)}>
          {project.status?.replace('_', ' ').toUpperCase()}
        </Badge>
        <Badge className={getPriorityBadgeColor(project.priority)}>
          {project.priority?.toUpperCase()} PRIORITY
        </Badge>
        <div className="flex items-center text-gray-400 text-sm">
          <Calendar className="h-4 w-4 mr-1" />
          Created {formatDate(project.createdAt)}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gray-900/50 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Progress</p>
                <p className="text-2xl font-bold text-white">{project.progressPercentage}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
            <Progress value={project.progressPercentage} className="mt-2" />
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Budget</p>
                <p className="text-2xl font-bold text-white">{formatCurrency(project.budget)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-yellow-500" />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Spent: {formatCurrency(project.actualCost || 0)}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Days Remaining</p>
                <p className={`text-2xl font-bold ${daysRemaining < 0 ? 'text-red-400' : daysRemaining < 30 ? 'text-yellow-400' : 'text-white'}`}>
                  {daysRemaining < 0 ? `${Math.abs(daysRemaining)} overdue` : daysRemaining}
                </p>
              </div>
              <Clock className={`h-8 w-8 ${daysRemaining < 0 ? 'text-red-500' : daysRemaining < 30 ? 'text-yellow-500' : 'text-blue-500'}`} />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Due: {formatDate(project.endDate)}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Area</p>
                <p className="text-2xl font-bold text-white">{project.areaSqft || 'N/A'}</p>
              </div>
              <Home className="h-8 w-8 text-purple-500" />
            </div>
            <p className="text-xs text-gray-500 mt-1 capitalize">
              {project.propertyType?.replace('_', ' ')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Project Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <Card className="bg-gray-900/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Project Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-300">
                {project.description || 'No description provided.'}
              </p>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card className="bg-gray-900/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Project Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-400 text-sm">Start Date</p>
                  <p className="text-white font-medium">{formatDate(project.startDate)}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">End Date</p>
                  <p className="text-white font-medium">{formatDate(project.endDate)}</p>
                </div>
              </div>
              {project.estimatedEndDate && (
                <div>
                  <p className="text-gray-400 text-sm">Estimated Completion</p>
                  <p className="text-white font-medium">{formatDate(project.estimatedEndDate)}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Milestones */}
          {project.milestones && project.milestones.length > 0 && (
            <Card className="bg-gray-900/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Project Milestones
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {project.milestones.map((milestone) => (
                    <div
                      key={milestone.id}
                      className="flex items-start space-x-3 p-3 rounded-lg bg-gray-800/50"
                    >
                      <div className="flex-shrink-0 mt-1">
                        {milestone.status === 'completed' ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : milestone.status === 'in_progress' ? (
                          <Activity className="h-5 w-5 text-yellow-500" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-gray-500" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="text-white font-medium">{milestone.title}</h4>
                        {milestone.description && (
                          <p className="text-gray-400 text-sm mt-1">{milestone.description}</p>
                        )}
                        <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                          <span>Budget: {formatCurrency(milestone.budget)}</span>
                          {milestone.actualCost && (
                            <span>Spent: {formatCurrency(milestone.actualCost)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Client Information */}
          <Card className="bg-gray-900/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Users className="h-5 w-5" />
                Client
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="text-gray-400 text-sm">Name</p>
                  <p className="text-white font-medium">{project.client.name}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Email</p>
                  <p className="text-white">{project.client.email}</p>
                </div>
                {project.client.phone && (
                  <div>
                    <p className="text-gray-400 text-sm">Phone</p>
                    <p className="text-white">{project.client.phone}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Team */}
          <Card className="bg-gray-900/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Team</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {project.designer && (
                <div>
                  <p className="text-gray-400 text-sm">Designer</p>
                  <p className="text-white font-medium">{project.designer.name}</p>
                  {project.designer.email && (
                    <p className="text-gray-500 text-sm">{project.designer.email}</p>
                  )}
                </div>
              )}
              {project.projectManager && (
                <div>
                  <p className="text-gray-400 text-sm">Project Manager</p>
                  <p className="text-white font-medium">{project.projectManager.name}</p>
                  {project.projectManager.email && (
                    <p className="text-gray-500 text-sm">{project.projectManager.email}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Location */}
          <Card className="bg-gray-900/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Location
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div>
                  <p className="text-gray-400 text-sm">City</p>
                  <p className="text-white font-medium">{project.city}</p>
                </div>
                {project.address && (
                  <div>
                    <p className="text-gray-400 text-sm">Address</p>
                    <p className="text-white">{project.address}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Budget Breakdown */}
          <Card className="bg-gray-900/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Budget Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Total Budget</span>
                <span className="text-white font-medium">{formatCurrency(project.budget)}</span>
              </div>
              {project.estimatedCost && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Estimated Cost</span>
                  <span className="text-white">{formatCurrency(project.estimatedCost)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-400">Actual Cost</span>
                <span className="text-white">{formatCurrency(project.actualCost || 0)}</span>
              </div>
              <div className="border-t border-gray-700 pt-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">Remaining</span>
                  <span className={`font-medium ${project.budget - (project.actualCost || 0) < 0 ? 'text-red-400' : 'text-green-400'}`}>
                    {formatCurrency(project.budget - (project.actualCost || 0))}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <EditProjectModal
          project={project}
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            setShowEditModal(false);
            queryClient.invalidateQueries({ queryKey: ['project', projectId] });
          }}
        />
      )}
    </div>
  );
}