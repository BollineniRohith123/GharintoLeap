import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ChartCardProps {
  title: string;
  data: any[];
  type: 'pie' | 'bar' | 'line';
  className?: string;
}

export default function ChartCard({ title, data, type, className }: ChartCardProps) {
  // This is a placeholder implementation
  // In a real app, you would use a charting library like recharts or chart.js
  
  const renderSimpleChart = () => {
    if (data.length === 0) {
      return (
        <div className="flex items-center justify-center h-48 text-muted-foreground">
          No data available
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {data.slice(0, 5).map((item, index) => {
          const value = item.count || item.projects || item.revenue || 0;
          const label = item.status || item.source || item.name || item.month || `Item ${index + 1}`;
          const maxValue = Math.max(...data.map(d => d.count || d.projects || d.revenue || 0));
          const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
          
          return (
            <div key={label} className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground truncate flex-1 mr-2">
                {label}
              </span>
              <div className="flex items-center space-x-2 flex-1">
                <div className="flex-1 bg-muted rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="text-sm font-medium min-w-[40px] text-right">
                  {value}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {renderSimpleChart()}
      </CardContent>
    </Card>
  );
}
