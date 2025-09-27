import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import {
  FolderOpen,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Calendar,
  DollarSign,
  Users,
  TrendingUp,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import apiClient, { Project } from '../../lib/api-client';
import CreateProjectModal from '../../components/projects/CreateProjectModal';
import ProjectDetailsModal from '../../components/projects/ProjectDetailsModal';
import EditProjectModal from '../../components/projects/EditProjectModal';

export default function ProjectsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [page, setPage] = useState(1);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch projects
  const { data: projectsData, isLoading, error } = useQuery({
    queryKey: ['projects', { page, search, statusFilter, cityFilter }],
    queryFn: () =>
      apiClient.getProjects({
        page,
        limit: 20,
        status: statusFilter || undefined,
        city: cityFilter || undefined,
      }),
  });

  // Delete project mutation
  const deleteProjectMutation = useMutation({
    mutationFn: (projectId: number) => apiClient.deleteProject(projectId),
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Project deleted successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete project',
        variant: 'destructive',
      });
    },
  });

  const handleDeleteProject = (project: Project) => {
    if (window.confirm(`Are you sure you want to delete project "${project.title}"?`)) {
      deleteProjectMutation.mutate(project.id);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

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

  if (error) {
    return (
      <div className="p-6">
        <Card className="bg-red-500/10 border-red-500/20">
          <CardContent className="p-6">
            <p className="text-red-400">Error loading projects: {(error as any).message}</p>
            <Button
              onClick={() => queryClient.invalidateQueries({ queryKey: ['projects'] })}
              className="mt-4"
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const projects = projectsData?.projects || [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <FolderOpen className="h-8 w-8" />
            Project Management
          </h1>
          <p className="text-gray-400 mt-1">
            Manage interior design projects and track progress
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1">
            <Button
              size="sm"
              variant={viewMode === 'cards' ? 'default' : 'ghost'}
              onClick={() => setViewMode('cards')}
              className="text-xs"
            >
              Cards
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              onClick={() => setViewMode('table')}
              className="text-xs"
            >
              Table
            </Button>
          </div>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-green-500 hover:bg-green-600 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gray-900/50 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Projects</p>
                <p className="text-2xl font-bold text-white">{projectsData?.total || 0}</p>
              </div>
              <FolderOpen className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gray-900/50 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">In Progress</p>
                <p className="text-2xl font-bold text-white">
                  {projects.filter(p => p.status === 'in_progress').length}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gray-900/50 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Completed</p>
                <p className="text-2xl font-bold text-white">
                  {projects.filter(p => p.status === 'completed').length}
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
                <p className="text-gray-400 text-sm">Total Budget</p>
                <p className="text-2xl font-bold text-white">
                  {formatCurrency(projects.reduce((sum, p) => sum + (p.budget || 0), 0))}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-gray-900/50 border-gray-700">
        <CardContent className="p-6">
          <form onSubmit={handleSearch} className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-300 mb-2 block">
                Search Projects
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by title, client, or designer..."
                  className="pl-10 bg-gray-800 border-gray-600 text-white"
                />
              </div>
            </div>

            <div className="min-w-[150px]">
              <label className="text-sm font-medium text-gray-300 mb-2 block">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full bg-gray-800 border-gray-600 text-white rounded-md px-3 py-2"
              >
                <option value="">All Status</option>
                <option value="planning">Planning</option>
                <option value="in_progress">In Progress</option>
                <option value="review">Review</option>
                <option value="completed">Completed</option>
                <option value="on_hold">On Hold</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div className="min-w-[150px]">
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

            <Button type="submit" className="bg-blue-500 hover:bg-blue-600">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Projects Display */}
      {viewMode === 'cards' ? (
        /* Cards View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            [...Array(6)].map((_, i) => (
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
          ) : projects.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <FolderOpen className="h-12 w-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 text-lg">No projects found</p>
              <p className="text-gray-500 text-sm">Create your first project to get started</p>
            </div>
          ) : (
            projects.map((project) => (
              <Card key={project.id} className="bg-gray-900/50 border-gray-700 hover:border-green-500/50 transition-colors cursor-pointer">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg text-white truncate">{project.title}</CardTitle>
                      <p className="text-gray-400 text-sm mt-1">{project.client?.name}</p>
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
                            setSelectedProject(project);
                            setShowDetailsModal(true);
                          }}
                          className="text-gray-300 hover:bg-gray-700"
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedProject(project);
                            setShowEditModal(true);
                          }}
                          className="text-gray-300 hover:bg-gray-700"
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Edit Project
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeleteProject(project)}
                          className="text-red-400 hover:bg-red-500/20"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Project
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className={getStatusBadgeColor(project.status)}>
                      {project.status?.replace('_', ' ').toUpperCase()}
                    </Badge>
                    <Badge className={getPriorityBadgeColor(project.priority)}>
                      {project.priority?.toUpperCase()}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-gray-400">Progress</span>
                        <span className="text-white">{project.progressPercentage || 0}%</span>
                      </div>
                      <Progress value={project.progressPercentage || 0} className="h-2" />
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-400">Budget</p>
                        <p className="text-white font-medium">{formatCurrency(project.budget)}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">City</p>
                        <p className="text-white">{project.city}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{new Date(project.startDate).toLocaleDateString()}</span>
                      </div>
                      {project.designer && (
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          <span>{project.designer.name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      ) : (
        /* Table View */
        <Card className="bg-gray-900/50 border-gray-700">
          <CardContent className="p-0">
            {/* Table implementation would go here */}
            <div className="p-6 text-center text-gray-400">
              Table view implementation pending...
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {projectsData && projectsData.total > 20 && (
        <div className="flex items-center justify-between">
          <p className="text-gray-400 text-sm">
            Showing {((page - 1) * 20) + 1} to {Math.min(page * 20, projectsData.total)} of {projectsData.total} projects
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
              Page {page} of {Math.ceil(projectsData.total / 20)}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => p + 1)}
              disabled={page >= Math.ceil(projectsData.total / 20)}
              className="border-gray-600 text-gray-300"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Modals */}
      {showCreateModal && (
        <CreateProjectModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            queryClient.invalidateQueries({ queryKey: ['projects'] });
          }}
        />
      )}

      {selectedProject && showDetailsModal && (
        <ProjectDetailsModal
          project={selectedProject}
          isOpen={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedProject(null);
          }}
        />
      )}

      {selectedProject && showEditModal && (
        <EditProjectModal
          project={selectedProject}
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedProject(null);
          }}
          onSuccess={() => {
            setShowEditModal(false);
            setSelectedProject(null);
            queryClient.invalidateQueries({ queryKey: ['projects'] });
          }}
        />
      )}
    </div>
  );
}