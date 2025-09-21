import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown, ChevronRight, Home, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { MenuItem } from '~backend/users/menu';
import * as LucideIcons from 'lucide-react';

interface SidebarProps {
  items: MenuItem[];
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ items, isOpen, onClose }: SidebarProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const location = useLocation();

  const toggleExpanded = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const getIcon = (iconName: string | null) => {
    if (!iconName) return null;
    
    const IconComponent = (LucideIcons as any)[iconName];
    return IconComponent ? <IconComponent className="h-4 w-4" /> : null;
  };

  const renderMenuItem = (item: MenuItem, level = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.has(item.id);
    const isActive = item.route && location.pathname.startsWith(item.route);

    return (
      <div key={item.id}>
        {hasChildren ? (
          <button
            onClick={() => toggleExpanded(item.id)}
            className={cn(
              "w-full flex items-center justify-between px-3 py-2 text-sm rounded-md hover:bg-accent hover:text-accent-foreground transition-colors",
              level > 0 && "ml-4",
              isActive && "bg-accent text-accent-foreground"
            )}
          >
            <div className="flex items-center space-x-2">
              {getIcon(item.icon)}
              <span>{item.name}</span>
            </div>
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        ) : (
          <Link
            to={item.route || '#'}
            onClick={onClose}
            className={cn(
              "flex items-center space-x-2 px-3 py-2 text-sm rounded-md hover:bg-accent hover:text-accent-foreground transition-colors",
              level > 0 && "ml-4",
              isActive && "bg-accent text-accent-foreground"
            )}
          >
            {getIcon(item.icon)}
            <span>{item.name}</span>
          </Link>
        )}

        {hasChildren && isExpanded && (
          <div className="mt-1 space-y-1">
            {item.children!.map((child) => renderMenuItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "bg-card border-r w-64 flex flex-col transition-transform duration-300 ease-in-out z-50",
        "lg:translate-x-0 lg:static lg:inset-0",
        isOpen ? "translate-x-0" : "-translate-x-full",
        "fixed inset-y-0 left-0 lg:relative"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <Link to="/" className="flex items-center space-x-2">
            <Home className="h-6 w-6 text-primary" />
            <span className="font-semibold">InteriorPro</span>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="lg:hidden"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 p-4">
          <nav className="space-y-2">
            {items.map((item) => renderMenuItem(item))}
          </nav>
        </ScrollArea>
      </aside>
    </>
  );
}
