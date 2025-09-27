import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Star, Edit, Trash2, Plus } from 'lucide-react';

interface Testimonial {
  id: number;
  name: string;
  role: string;
  company: string;
  content: string;
  rating: number;
  isActive: boolean;
  createdAt: string;
}

export default function TestimonialsManagement() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingTestimonial, setEditingTestimonial] = useState<Testimonial | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    company: '',
    content: '',
    rating: 5
  });

  // Mock data for demonstration
  useEffect(() => {
    const mockTestimonials: Testimonial[] = [
      {
        id: 1,
        name: 'Rajesh Kumar',
        role: 'CEO',
        company: 'Tech Solutions Pvt Ltd',
        content: 'Gharinto Leap transformed our office space beautifully. The team was professional and delivered on time.',
        rating: 5,
        isActive: true,
        createdAt: '2024-01-15'
      },
      {
        id: 2,
        name: 'Priya Sharma',
        role: 'Homeowner',
        company: 'Personal',
        content: 'Amazing interior design service! They understood our vision perfectly and executed it flawlessly.',
        rating: 5,
        isActive: true,
        createdAt: '2024-01-20'
      }
    ];
    setTestimonials(mockTestimonials);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingTestimonial) {
      // Update existing testimonial
      setTestimonials(prev => prev.map(t => 
        t.id === editingTestimonial.id 
          ? { ...t, ...formData, rating: Number(formData.rating) }
          : t
      ));
    } else {
      // Add new testimonial
      const newTestimonial: Testimonial = {
        id: Date.now(),
        ...formData,
        rating: Number(formData.rating),
        isActive: true,
        createdAt: new Date().toISOString().split('T')[0]
      };
      setTestimonials(prev => [...prev, newTestimonial]);
    }

    // Reset form
    setFormData({ name: '', role: '', company: '', content: '', rating: 5 });
    setIsEditing(false);
    setEditingTestimonial(null);
  };

  const handleEdit = (testimonial: Testimonial) => {
    setEditingTestimonial(testimonial);
    setFormData({
      name: testimonial.name,
      role: testimonial.role,
      company: testimonial.company,
      content: testimonial.content,
      rating: testimonial.rating
    });
    setIsEditing(true);
  };

  const handleDelete = (id: number) => {
    setTestimonials(prev => prev.filter(t => t.id !== id));
  };

  const toggleActive = (id: number) => {
    setTestimonials(prev => prev.map(t => 
      t.id === id ? { ...t, isActive: !t.isActive } : t
    ));
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
      />
    ));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Testimonials Management</h2>
          <p className="text-muted-foreground">
            Manage customer testimonials displayed on the homepage
          </p>
        </div>
        <Button onClick={() => setIsEditing(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Testimonial
        </Button>
      </div>

      {isEditing && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingTestimonial ? 'Edit Testimonial' : 'Add New Testimonial'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Customer Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="role">Role/Position</Label>
                  <Input
                    id="role"
                    value={formData.role}
                    onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="company">Company</Label>
                <Input
                  id="company"
                  value={formData.company}
                  onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                  required
                />
              </div>

              <div>
                <Label htmlFor="content">Testimonial Content</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  rows={4}
                  required
                />
              </div>

              <div>
                <Label htmlFor="rating">Rating</Label>
                <Input
                  id="rating"
                  type="number"
                  min="1"
                  max="5"
                  value={formData.rating}
                  onChange={(e) => setFormData(prev => ({ ...prev, rating: Number(e.target.value) }))}
                  required
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit">
                  {editingTestimonial ? 'Update' : 'Add'} Testimonial
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setIsEditing(false);
                    setEditingTestimonial(null);
                    setFormData({ name: '', role: '', company: '', content: '', rating: 5 });
                  }}
                >
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
                    <h3 className="font-semibold">{testimonial.name}</h3>
                    <Badge variant={testimonial.isActive ? "default" : "secondary"}>
                      {testimonial.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {testimonial.role} at {testimonial.company}
                  </p>
                  <div className="flex items-center gap-1 mb-3">
                    {renderStars(testimonial.rating)}
                  </div>
                  <p className="text-sm">{testimonial.content}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Added on {testimonial.createdAt}
                  </p>
                </div>
                <div className="flex gap-2 ml-4">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(testimonial)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toggleActive(testimonial.id)}
                  >
                    {testimonial.isActive ? 'Deactivate' : 'Activate'}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(testimonial.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {testimonials.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">No testimonials found. Add your first testimonial!</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
