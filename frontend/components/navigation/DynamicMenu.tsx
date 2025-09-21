import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import backend from '~backend/client';
import type { MenuItem } from '~backend/menu/menu_service';
import {
  ChevronDown,
  ChevronRight,
  Home,
  Users,
  Briefcase,
  FileText,
  DollarSign,
  BarChart3,
  Settings,
  MessageSquare,
  Package,
  Calendar,
  Shield,
  Building,
  Star,
  Truck,
  ClipboardCheck,
  PieChart
} from 'lucide-react';

const iconMap: Record<string, React.ComponentType<any>> = {
  Home,
  Users,
  Briefcase,
  FileText,
  DollarSign,
  BarChart3,
  Settings,
  MessageSquare,
  Package,
  Calendar,
  Shield,
  Building,
  Star,
  Truck,
  ClipboardCheck,
  PieChart
};

interface DynamicMenuProps {
  className?: string;
  onItemClick?: () => void;
}

interface MenuItemComponentProps {
  item: MenuItem;
  level: number;
  isActive: boolean;
  onItemClick?: () => void;
}

const MenuItemComponent: React.FC<MenuItemComponentProps> = ({ 
  item, 
  level, 
  isActive, 
  onItemClick 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const navigate = useNavigate();
  const hasChildren = item.children && item.children.length > 0;

  const handleClick = () => {
    if (item.path) {
      navigate(item.path);
      onItemClick?.();
    } else if (hasChildren) {
      setIsExpanded(!isExpanded);
    }
  };

  const IconComponent = item.icon ? iconMap[item.icon] : null;
  const paddingLeft = `${level * 16 + 16}px`;

  return (
    <div>
      <button
        onClick={handleClick}
        className={`
          w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg
          transition-colors duration-200
          ${isActive 
            ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-700' 
            : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
          }
        `}
        style={{ paddingLeft }}
      >
        <div className="flex items-center space-x-3">
          {IconComponent && (
            <IconComponent className="h-5 w-5 flex-shrink-0" />
          )}
          <span>{item.display_name}</span>
        </div>
        
        {hasChildren && (
          <div className="ml-auto">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </div>
        )}
      </button>

      {hasChildren && isExpanded && (
        <div className="mt-1">
          {item.children!.map((child) => (
            <MenuItemComponent
              key={child.id}
              item={child}
              level={level + 1}
              isActive={isActive}
              onItemClick={onItemClick}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const DynamicMenu: React.FC<DynamicMenuProps> = ({ 
  className = '', 
  onItemClick 
}) => {
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const location = useLocation();

  useEffect(() => {
    loadMenus();
  }, []);

  const loadMenus = async () => {
    try {
      setLoading(true);
      const response = await backend.menu.getUserMenus();
      setMenus(response.menus);
    } catch (err: any) {
      console.error('Failed to load menus:', err);
      setError('Failed to load navigation menu');
    } finally {
      setLoading(false);
    }
  };

  const isActiveMenuItem = (item: MenuItem): boolean => {
    if (item.path === location.pathname) {
      return true;
    }
    
    if (item.children) {
      return item.children.some(child => isActiveMenuItem(child));
    }
    
    return false;
  };

  if (loading) {
    return (
      <div className={`${className} p-4`}>
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-10 bg-gray-200 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${className} p-4`}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-600">{error}</p>
          <button
            onClick={loadMenus}
            className="mt-2 text-xs text-red-700 hover:text-red-800 underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <nav className={`${className} p-4`}>
      <div className="space-y-1">
        {menus.map((item) => (
          <MenuItemComponent
            key={item.id}
            item={item}
            level={0}
            isActive={isActiveMenuItem(item)}
            onItemClick={onItemClick}
          />
        ))}
      </div>
    </nav>
  );
};