import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, Edit, Trash2, Plus } from 'lucide-react';

interface Testimonial {
  id: number;
  client_name: string;
  testimonial_text: string;
  rating: number;
  is_featured: boolean;
}

export default function TestimonialsPage() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([
    {
      id: 1,
      client_name: 'Priya Sharma',
      testimonial_text: 'Gharinto transformed our home beautifully. Professional team!',
      rating: 5,
      is_featured: true
    },
    {
      id: 2,
      client_name: 'Rajesh Kumar', 
      testimonial_text: 'Amazing service and quality work. Kitchen renovation exceeded expectations.',
      rating: 5,
      is_featured: true
    }
  ]);

  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    client_name: '',
    testimonial_text: '',
    rating: 5,
    is_featured: false
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingId) {
      setTestimonials(prev => prev.map(t => 
        t.id === editingId ? { ...t, ...formData } : t
      ));
    } else {
      const newTestimonial = {
        id: Date.now(),
        ...formData
      };
      setTestimonials(prev => [...prev, newTestimonial]);
    }
    
    resetForm();
  };

  const handleEdit = (testimonial: Testimonial) => {
    setFormData({
      client_name: testimonial.client_name,
      testimonial_text: testimonial.testimonial_text,
      rating: testimonial.rating,
      is_featured: testimonial.is_featured
    });
    setEditingId(testimonial.id);
    setIsEditing(true);
  };

  const handleDelete = (id: number) => {
    if (confirm('Delete this testimonial?')) {
      setTestimonials(prev => prev.filter(t => t.id !== id));
    }
  };

  const resetForm = () => {
    setFormData({
      client_name: '',
      testimonial_text: '',
      rating: 5,
      is_featured: false
    });
    setEditingId(null);
    setIsEditing(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Testimonials</h1>
          <p className="text-muted-foreground">
            Manage customer testimonials for the homepage
          </p>
        </div>
        <Button onClick={() => setIsEditing(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Testimonial
        </Button>
      </div>

      {isEditing && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingId ? 'Edit Testimonial' : 'Add Testimonial'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Client Name</Label>
                <Input
                  value={formData.client_name}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    client_name: e.target.value
                  }))}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label>Testimonial</Label>
                <Textarea
                  value={formData.testimonial_text}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    testimonial_text: e.target.value
                  }))}
                  required
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Rating</Label>
                  <select
                    value={formData.rating}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      rating: parseInt(e.target.value)
                    }))}
                    className="w-full p-2 border rounded"
                  >
                    <option value={5}>5 Stars</option>
                    <option value={4}>4 Stars</option>
                    <option value={3}>3 Stars</option>
                    <option value={2}>2 Stars</option>
                    <option value={1}>1 Star</option>
                  </select>
                </div>
                
                <div className="space-y-2">
                  <Label>Featured</Label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.is_featured}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        is_featured: e.target.checked
                      }))}
                    />
                    <span>Show on homepage</span>
                  </div>
                </div>
              </div>

              <div className="flex space-x-2">
                <Button type="submit" className="gharinto-primary">
                  {editingId ? 'Update' : 'Create'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {testimonials.map((testimonial) => (
          <Card key={testimonial.id}>
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold">{testimonial.client_name}</h3>
                    <div className="flex items-center">
                      {Array.from({ length: testimonial.rating }).map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                    {testimonial.is_featured && (
                      <Badge className="gharinto-primary">Featured</Badge>
                    )}
                  </div>
                  <p className="text-gray-600">{testimonial.testimonial_text}</p>
                </div>
                <div className="flex space-x-2 ml-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(testimonial)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(testimonial.id)}
                    className="text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}