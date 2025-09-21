import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type { PortfolioItemPublic } from '~backend/website/homepage';

interface PortfolioCardProps {
  item: PortfolioItemPublic;
}

export default function PortfolioCard({ item }: PortfolioCardProps) {
  return (
    <Card className="group overflow-hidden">
      <div className="aspect-square relative overflow-hidden">
        {item.images.length > 0 ? (
          <img
            src={item.images[0]}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <span className="text-4xl">🏠</span>
          </div>
        )}
        
        {item.projectType && (
          <Badge className="absolute top-2 right-2">
            {item.projectType}
          </Badge>
        )}
      </div>
      
      <CardContent className="p-4">
        <h3 className="font-semibold mb-2 line-clamp-2">{item.title}</h3>
        {item.description && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
            {item.description}
          </p>
        )}
        <div className="text-sm">
          <div className="font-medium">{item.designer.name}</div>
          {item.designer.businessName && (
            <div className="text-muted-foreground text-xs">
              {item.designer.businessName}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
