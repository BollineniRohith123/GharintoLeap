import { Star } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { TestimonialPublic } from '~backend/website/homepage';

interface TestimonialCardProps {
  testimonial: TestimonialPublic;
}

export default function TestimonialCard({ testimonial }: TestimonialCardProps) {
  return (
    <Card className="h-full">
      <CardContent className="p-6">
        <div className="flex items-center space-x-1 mb-4">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              className={`h-4 w-4 ${
                i < testimonial.rating ? 'text-yellow-400 fill-current' : 'text-muted-foreground'
              }`}
            />
          ))}
        </div>
        
        <p className="text-muted-foreground mb-6 leading-relaxed">
          "{testimonial.content}"
        </p>
        
        <div className="flex items-center space-x-3">
          <Avatar>
            <AvatarImage src={testimonial.customerImage || undefined} />
            <AvatarFallback>
              {testimonial.customerName.split(' ').map((n: string) => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium">{testimonial.customerName}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
