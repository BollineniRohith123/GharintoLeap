import React, { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  Users,
  Briefcase,
  Target,
  Package,
  Building,
  FileText,
  Receipt,
  MessageSquare,
  Calendar,
  Hash,
  ArrowRight,
  X,
} from 'lucide-react';
import apiClient from '../../src/lib/api-client';

interface SearchResult {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  url: string;
  icon: React.ComponentType<any>;
  badge?: string;
}

export default function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  // Global search query
  const { data: searchResults, isLoading } = useQuery({
    queryKey: ['global-search', searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return [];
      
      // Simulate global search - in real implementation, this would call the global search endpoint
      const results: SearchResult[] = [];
      
      // Mock search results based on query
      if (searchQuery.toLowerCase().includes('user') || searchQuery.toLowerCase().includes('admin')) {
        results.push({
          id: 'user-1',
          type: 'user',
          title: 'System Administrator',
          subtitle: 'admin@gharinto.com',
          url: '/users/1',
          icon: Users,
          badge: 'Admin'
        });
      }
      
      if (searchQuery.toLowerCase().includes('project') || searchQuery.toLowerCase().includes('design')) {
        results.push({
          id: 'project-1',
          type: 'project',
          title: 'Modern Apartment Design',
          subtitle: 'Mumbai • In Progress',
          url: '/projects/1',
          icon: Briefcase,
          badge: 'Project'
        });
      }
      
      return results;
    },
    enabled: searchQuery.length > 2,
    staleTime: 5000,
  });

  // Keyboard shortcut to open search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 100);
      }
      
      if (e.key === 'Escape') {
        setOpen(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleResultClick = (result: SearchResult) => {
    navigate(result.url);
    setOpen(false);
    setSearchQuery('');
  };

  const getBadgeColor = (type: string) => {
    switch (type) {
      case 'user':
        return 'bg-blue-500/20 text-blue-300';
      case 'project':
        return 'bg-purple-500/20 text-purple-300';
      case 'lead':
        return 'bg-green-500/20 text-green-300';
      default:
        return 'bg-gray-500/20 text-gray-300';
    }
  };

  return (
    <div className="relative">
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="w-64 justify-start text-gray-400 bg-gray-800 border-gray-600 hover:bg-gray-700"
      >
        <Search className="mr-2 h-4 w-4" />
        <span>Search...</span>
        <div className="ml-auto flex items-center space-x-1">
          <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-gray-600 bg-gray-700 px-1.5 font-mono text-[10px] font-medium text-gray-400">
            <span className="text-xs">⌘</span>K
          </kbd>
        </div>
      </Button>
      
      {open && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center pt-20">
          <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-lg w-96 max-h-96 overflow-hidden">
            <div className="p-4 border-b border-gray-700">
              <div className="flex items-center space-x-2">
                <Search className="h-4 w-4 text-gray-400" />
                <Input
                  ref={inputRef}
                  placeholder="Search users, projects, materials..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-0 text-white placeholder:text-gray-400 focus:ring-0"
                  autoFocus
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="max-h-80 overflow-y-auto p-2">
              {isLoading && searchQuery.length > 2 && (
                <div className="p-4 text-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto" />
                  <p className="text-gray-400 text-sm mt-2">Searching...</p>
                </div>
              )}
              
              {!isLoading && searchQuery.length > 2 && (searchResults || []).length === 0 && (
                <div className="p-6 text-center">
                  <Search className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">No results found</p>
                  <p className="text-gray-500 text-sm">Try searching for users, projects, or materials</p>
                </div>
              )}
              
              {searchQuery.length <= 2 && (
                <div className="p-6 text-center">
                  <Search className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">Start typing to search</p>
                  <p className="text-gray-500 text-sm">Search across users, projects, materials, and more</p>
                </div>
              )}

              {(searchResults || []).map((result) => {
                const IconComponent = result.icon;
                return (
                  <div
                    key={result.id}
                    onClick={() => handleResultClick(result)}
                    className="flex items-center space-x-3 p-3 cursor-pointer hover:bg-gray-800 rounded text-white"
                  >
                    <div className="flex-shrink-0">
                      <IconComponent className="h-5 w-5 text-gray-400" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium text-white truncate">
                          {result.title}
                        </p>
                        {result.badge && (
                          <Badge className={`text-xs ${getBadgeColor(result.type)}`}>
                            {result.badge}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 truncate">
                        {result.subtitle}
                      </p>
                    </div>
                    
                    <div className="flex-shrink-0">
                      <ArrowRight className="h-4 w-4 text-gray-500" />
                    </div>
                  </div>
                );
              })}
            </div>
            
            {searchQuery.length > 0 && (
              <div className="border-t border-gray-700 p-3">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center space-x-4">
                    <span>Click to select</span>
                  </div>
                  <span>ESC to close</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}