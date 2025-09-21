import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit, Trash2, Star, Image, Save, X } from 'lucide-react';
import backend from '~backend/client';

interface Testimonial {
  id: number;
  client_name: string;
  client_image_url?: string;
  testimonial_text: string;
  project_type?: string;
  rating: number;
  is_featured: boolean;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

interface TestimonialFormData {
  client_name: string;
  client_image_url: string;
  testimonial_text: string;
  project_type: string;
  rating: number;
  is_featured: boolean;
  sort_order: number;
}

export default function TestimonialsManagement() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<TestimonialFormData>({
    client_name: '',
    client_image_url: '',
    testimonial_text: '',
    project_type: '',
    rating: 5,
    is_featured: false,
    sort_order: 0
  });

  useEffect(() => {
    loadTestimonials();
  }, []);

  const loadTestimonials = async () => {
    try {
      setIsLoading(true);
      // This would be a real API call
      const response = await backend.content.getTestimonials();
      setTestimonials(response.testimonials || []);
    } catch (error) {
      console.error('Failed to load testimonials:', error);
      // For now, use mock data
      setTestimonials([
        {
          id: 1,
          client_name: 'Priya Sharma',
          client_image_url: '/images/clients/priya.jpg',
          testimonial_text: 'Gharinto transformed our home beautifully. The team was professional and delivered exactly what we envisioned.',
          project_type: 'Full Home Interior',
          rating: 5,
          is_featured: true,
          sort_order: 1,
          is_active: true,
          created_at: '2024-01-15'
        },
        {
          id: 2,
          client_name: 'Rajesh Kumar',
          client_image_url: '/images/clients/rajesh.jpg',
          testimonial_text: 'Amazing service and quality work. Our kitchen renovation exceeded all expectations.',
          project_type: 'Kitchen Renovation',
          rating: 5,
          is_featured: true,
          sort_order: 2,
          is_active: true,
          created_at: '2024-01-10'
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingId) {
        // Update existing testimonial
        await backend.content.updateTestimonial(editingId, formData);
      } else {
        // Create new testimonial
        await backend.content.createTestimonial(formData);
      }
      
      await loadTestimonials();
      resetForm();
    } catch (error) {
      console.error('Failed to save testimonial:', error);
      alert('Failed to save testimonial. Please try again.');
    }
  };

  const handleEdit = (testimonial: Testimonial) => {
    setEditingId(testimonial.id);
    setFormData({
      client_name: testimonial.client_name,
      client_image_url: testimonial.client_image_url || '',
      testimonial_text: testimonial.testimonial_text,
      project_type: testimonial.project_type || '',
      rating: testimonial.rating,
      is_featured: testimonial.is_featured,
      sort_order: testimonial.sort_order
    });
    setIsEditing(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this testimonial?')) {
      return;
    }
    
    try {
      await backend.content.deleteTestimonial(id);
      await loadTestimonials();
    } catch (error) {
      console.error('Failed to delete testimonial:', error);
      alert('Failed to delete testimonial. Please try again.');
    }
  };

  const resetForm = () => {
    setFormData({
      client_name: '',
      client_image_url: '',
      testimonial_text: '',
      project_type: '',
      rating: 5,
      is_featured: false,
      sort_order: 0
    });
    setEditingId(null);
    setIsEditing(false);
  };

  const handleInputChange = (field: keyof TestimonialFormData, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className=\"space-y-6\">
      <div className=\"flex justify-between items-center\">
        <div>
          <h2 className=\"text-2xl font-bold\">Testimonials Management</h2>
          <p className=\"text-muted-foreground\">
            Manage customer testimonials displayed on the homepage
          </p>
        </div>
        <Button onClick={() => setIsEditing(true)}>
          <Plus className=\"mr-2 h-4 w-4\" />
          Add Testimonial
        </Button>
      </div>

      {/* Add/Edit Form */}
      {isEditing && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingId ? 'Edit Testimonial' : 'Add New Testimonial'}
            </CardTitle>
            <CardDescription>
              {editingId ? 'Update the testimonial details' : 'Add a new customer testimonial'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className=\"space-y-4\">
              <div className=\"grid grid-cols-1 md:grid-cols-2 gap-4\">
                <div className=\"space-y-2\">
                  <Label htmlFor=\"client_name\">Client Name *</Label>
                  <Input
                    id=\"client_name\"
                    value={formData.client_name}
                    onChange={(e) => handleInputChange('client_name', e.target.value)}
                    required
                    placeholder=\"Enter client name\"
                  />
                </div>
                <div className=\"space-y-2\">
                  <Label htmlFor=\"client_image_url\">Client Image URL</Label>
                  <div className=\"relative\">
                    <Image className=\"absolute left-3 top-3 h-4 w-4 text-gray-400\" />
                    <Input
                      id=\"client_image_url\"
                      value={formData.client_image_url}
                      onChange={(e) => handleInputChange('client_image_url', e.target.value)}
                      placeholder=\"https://example.com/image.jpg\"
                      className=\"pl-10\"
                    />
                  </div>
                </div>
              </div>

              <div className=\"space-y-2\">
                <Label htmlFor=\"testimonial_text\">Testimonial Text *</Label>
                <Textarea
                  id=\"testimonial_text\"
                  value={formData.testimonial_text}
                  onChange={(e) => handleInputChange('testimonial_text', e.target.value)}
                  required
                  placeholder=\"Enter the customer testimonial...\"
                  rows={4}
                />
              </div>

              <div className=\"grid grid-cols-1 md:grid-cols-3 gap-4\">
                <div className=\"space-y-2\">
                  <Label htmlFor=\"project_type\">Project Type</Label>
                  <Select 
                    value={formData.project_type} 
                    onValueChange={(value) => handleInputChange('project_type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder=\"Select project type\" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value=\"Full Home Interior\">Full Home Interior</SelectItem>
                      <SelectItem value=\"Kitchen Renovation\">Kitchen Renovation</SelectItem>
                      <SelectItem value=\"Living Room\">Living Room</SelectItem>
                      <SelectItem value=\"Bedroom\">Bedroom</SelectItem>
                      <SelectItem value=\"Bathroom\">Bathroom</SelectItem>
                      <SelectItem value=\"Office Space\">Office Space</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className=\"space-y-2\">
                  <Label htmlFor=\"rating\">Rating *</Label>
                  <Select 
                    value={formData.rating.toString()} 
                    onValueChange={(value) => handleInputChange('rating', parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder=\"Select rating\" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value=\"5\">5 Stars</SelectItem>
                      <SelectItem value=\"4\">4 Stars</SelectItem>
                      <SelectItem value=\"3\">3 Stars</SelectItem>
                      <SelectItem value=\"2\">2 Stars</SelectItem>
                      <SelectItem value=\"1\">1 Star</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className=\"space-y-2\">
                  <Label htmlFor=\"sort_order\">Sort Order</Label>
                  <Input
                    id=\"sort_order\"
                    type=\"number\"
                    value={formData.sort_order}
                    onChange={(e) => handleInputChange('sort_order', parseInt(e.target.value) || 0)}
                    placeholder=\"0\"
                  />
                </div>
              </div>

              <div className=\"flex items-center space-x-2\">
                <input
                  type=\"checkbox\"
                  id=\"is_featured\"
                  checked={formData.is_featured}
                  onChange={(e) => handleInputChange('is_featured', e.target.checked)}
                  className=\"rounded\"
                />
                <Label htmlFor=\"is_featured\">Feature on homepage</Label>
              </div>

              <div className=\"flex justify-end space-x-2\">
                <Button type=\"button\" variant=\"outline\" onClick={resetForm}>
                  <X className=\"mr-2 h-4 w-4\" />
                  Cancel
                </Button>
                <Button type=\"submit\" className=\"gharinto-primary\">
                  <Save className=\"mr-2 h-4 w-4\" />
                  {editingId ? 'Update' : 'Create'} Testimonial
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Testimonials List */}
      <Card>
        <CardHeader>
          <CardTitle>Existing Testimonials</CardTitle>
          <CardDescription>
            Manage all customer testimonials. Featured testimonials appear on the homepage.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className=\"flex items-center justify-center h-32\">
              <div className=\"animate-spin rounded-full h-8 w-8 border-b-2 border-primary\"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Testimonial</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {testimonials.map((testimonial) => (
                  <TableRow key={testimonial.id}>
                    <TableCell>
                      <div className=\"flex items-center space-x-3\">
                        {testimonial.client_image_url && (
                          <img 
                            src={testimonial.client_image_url} 
                            alt={testimonial.client_name}
                            className=\"w-8 h-8 rounded-full object-cover\"
                          />
                        )}
                        <div>
                          <p className=\"font-medium\">{testimonial.client_name}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className=\"max-w-xs truncate\" title={testimonial.testimonial_text}>
                        {testimonial.testimonial_text}
                      </p>
                    </TableCell>
                    <TableCell>{testimonial.project_type || 'N/A'}</TableCell>
                    <TableCell>
                      <div className=\"flex items-center space-x-1\">
                        <Star className=\"w-4 h-4 fill-yellow-400 text-yellow-400\" />
                        <span>{testimonial.rating}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className=\"flex space-x-1\">
                        {testimonial.is_featured && (
                          <Badge variant=\"default\" className=\"gharinto-primary\">
                            Featured
                          </Badge>
                        )}
                        <Badge variant={testimonial.is_active ? 'default' : 'secondary'}>
                          {testimonial.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>{testimonial.sort_order}</TableCell>
                    <TableCell>
                      <div className=\"flex space-x-2\">
                        <Button
                          variant=\"ghost\"
                          size=\"sm\"
                          onClick={() => handleEdit(testimonial)}
                        >
                          <Edit className=\"h-4 w-4\" />
                        </Button>
                        <Button
                          variant=\"ghost\"
                          size=\"sm\"
                          onClick={() => handleDelete(testimonial.id)}
                          className=\"text-red-600 hover:text-red-800\"
                        >
                          <Trash2 className=\"h-4 w-4\" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}"