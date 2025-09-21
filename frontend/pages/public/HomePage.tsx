import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ArrowRight,
  Star,
  Users,
  Award,
  CheckCircle,
  MapPin,
  Phone,
  Mail,
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
} from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import backend from '~backend/client';

export default function HomePage() {
  const { toast } = useToast();
  const [leadForm, setLeadForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    city: '',
    projectType: '',
    budgetMin: '',
    timeline: '',
    description: '',
  });

  const [partnerForm, setPartnerForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    city: '',
    userType: 'interior_designer' as 'interior_designer' | 'vendor',
    experience: '',
    portfolio: '',
  });

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await backend.leads.createLead({
        source: 'website_form',
        firstName: leadForm.firstName,
        lastName: leadForm.lastName,
        email: leadForm.email,
        phone: leadForm.phone,
        city: leadForm.city,
        projectType: leadForm.projectType,
        budgetMin: leadForm.budgetMin ? parseInt(leadForm.budgetMin) : undefined,
        timeline: leadForm.timeline,
        description: leadForm.description,
      });

      toast({
        title: 'Thank you for your interest!',
        description: 'We will get back to you within 24 hours.',
      });

      setLeadForm({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        city: '',
        projectType: '',
        budgetMin: '',
        timeline: '',
        description: '',
      });
    } catch (error) {
      console.error('Lead submission error:', error);
      toast({
        title: 'Something went wrong',
        description: 'Please try again later.',
        variant: 'destructive',
      });
    }
  };

  const handlePartnerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await backend.auth.register({
        firstName: partnerForm.firstName,
        lastName: partnerForm.lastName,
        email: partnerForm.email,
        phone: partnerForm.phone,
        city: partnerForm.city,
        userType: partnerForm.userType,
        password: 'temp123', // Temporary password, should be changed
      });

      toast({
        title: 'Application submitted successfully!',
        description: 'We will review your application and get back to you.',
      });

      setPartnerForm({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        city: '',
        userType: 'interior_designer',
        experience: '',
        portfolio: '',
      });
    } catch (error) {
      console.error('Partner registration error:', error);
      toast({
        title: 'Something went wrong',
        description: 'Please try again later.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-black/90 backdrop-blur-sm z-50 border-b border-green-500/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 bg-green-500 rounded-md flex items-center justify-center">
                <span className="text-white font-bold text-sm">G</span>
              </div>
              <span className="font-bold text-xl">Gharinto</span>
            </div>
            
            <div className="hidden md:flex items-center space-x-8">
              <a href="#services" className="text-gray-300 hover:text-green-400 transition-colors">
                Services
              </a>
              <a href="#portfolio" className="text-gray-300 hover:text-green-400 transition-colors">
                Portfolio
              </a>
              <a href="#partners" className="text-gray-300 hover:text-green-400 transition-colors">
                Partners
              </a>
              <a href="#contact" className="text-gray-300 hover:text-green-400 transition-colors">
                Contact
              </a>
            </div>

            <div className="flex items-center space-x-4">
              <Link to="/login">
                <Button variant="ghost" className="text-white hover:bg-green-500/10">
                  Login
                </Button>
              </Link>
              <Link to="/register">
                <Button className="bg-green-500 hover:bg-green-600 text-white">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <Badge className="bg-green-500/10 text-green-400 border-green-500/20">
                  India's Premier Interior Design Platform
                </Badge>
                <h1 className="text-5xl lg:text-6xl font-bold leading-tight">
                  Transform Your
                  <span className="text-green-400"> Home </span>
                  Into a Masterpiece
                </h1>
                <p className="text-xl text-gray-300 leading-relaxed">
                  Connect with India's top interior designers and create your dream space. 
                  From concept to completion, we manage every detail of your home transformation.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  size="lg" 
                  className="bg-green-500 hover:bg-green-600 text-white"
                  onClick={() => document.getElementById('lead-form')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  Start Your Project
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button size="lg" variant="outline" className="border-green-500 text-green-400 hover:bg-green-500/10">
                  View Portfolio
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-8 pt-8">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-400">500+</div>
                  <div className="text-gray-400">Projects Completed</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-400">50+</div>
                  <div className="text-gray-400">Expert Designers</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-400">25</div>
                  <div className="text-gray-400">Cities Covered</div>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="aspect-w-4 aspect-h-5 rounded-2xl overflow-hidden bg-gradient-to-br from-green-500/20 to-black border border-green-500/20">
                <div className="p-8 flex items-center justify-center">
                  <div className="text-center space-y-4">
                    <div className="h-48 w-48 bg-green-500/10 rounded-full flex items-center justify-center mx-auto">
                      <span className="text-6xl">🏠</span>
                    </div>
                    <h3 className="text-2xl font-bold">Your Dream Home Awaits</h3>
                    <p className="text-gray-300">Modern, elegant, personalized</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-20 bg-gray-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Our Services</h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              From conceptual design to final installation, we provide end-to-end interior design solutions
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                title: 'Complete Home Design',
                description: 'Full home interior design with personalized style and functionality',
                icon: '🏡',
                features: ['Space Planning', '3D Visualization', 'Material Selection', 'Project Management']
              },
              {
                title: 'Modular Kitchen',
                description: 'Custom kitchen design with modern appliances and storage solutions',
                icon: '👨‍🍳',
                features: ['Custom Cabinets', 'Smart Storage', 'Premium Appliances', 'Island Design']
              },
              {
                title: 'Living Room Design',
                description: 'Create stunning living spaces that reflect your personality',
                icon: '🛋️',
                features: ['Furniture Selection', 'Lighting Design', 'Color Schemes', 'Decor Elements']
              },
              {
                title: 'Bedroom Interiors',
                description: 'Peaceful and functional bedroom designs for ultimate comfort',
                icon: '🛏️',
                features: ['Wardrobe Design', 'Bed Selection', 'Lighting', 'Storage Solutions']
              },
              {
                title: 'Office Interiors',
                description: 'Productive and inspiring workspace designs for modern businesses',
                icon: '💼',
                features: ['Ergonomic Design', 'Brand Identity', 'Meeting Rooms', 'Break Areas']
              },
              {
                title: 'Renovation Services',
                description: 'Transform existing spaces with smart renovation solutions',
                icon: '🔨',
                features: ['Space Optimization', 'Structural Changes', 'Modern Updates', 'Budget Planning']
              }
            ].map((service, index) => (
              <Card key={index} className="bg-black border-green-500/20 hover:border-green-500/40 transition-colors">
                <CardHeader>
                  <div className="text-4xl mb-4">{service.icon}</div>
                  <CardTitle className="text-white">{service.title}</CardTitle>
                  <CardDescription className="text-gray-300">
                    {service.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {service.features.map((feature, i) => (
                      <li key={i} className="flex items-center text-sm text-gray-300">
                        <CheckCircle className="h-4 w-4 text-green-400 mr-2" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Portfolio Section */}
      <section id="portfolio" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Featured Projects</h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Discover our latest interior design projects across India
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                title: 'Modern Villa, Bangalore',
                type: 'Residential',
                area: '3500 sq ft',
                image: '🏖️',
                description: 'Contemporary design with sustainable materials'
              },
              {
                title: 'Luxury Apartment, Mumbai',
                type: 'Residential',
                area: '2200 sq ft',
                image: '🌆',
                description: 'Minimalist approach with premium finishes'
              },
              {
                title: 'Corporate Office, Delhi',
                type: 'Commercial',
                area: '8000 sq ft',
                image: '🏢',
                description: 'Modern workspace with collaborative zones'
              },
              {
                title: 'Penthouse, Pune',
                type: 'Residential',
                area: '4000 sq ft',
                image: '🌟',
                description: 'Luxurious interiors with city views'
              },
              {
                title: 'Boutique Hotel, Goa',
                type: 'Hospitality',
                area: '12000 sq ft',
                image: '🏨',
                description: 'Coastal-inspired design with local elements'
              },
              {
                title: 'Family Home, Chennai',
                type: 'Residential',
                area: '2800 sq ft',
                image: '🏠',
                description: 'Traditional meets modern design philosophy'
              }
            ].map((project, index) => (
              <Card key={index} className="bg-black border-green-500/20 hover:border-green-500/40 transition-all duration-300 overflow-hidden group">
                <div className="aspect-video bg-gradient-to-br from-green-500/20 to-black flex items-center justify-center text-6xl group-hover:scale-105 transition-transform">
                  {project.image}
                </div>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <Badge variant="secondary" className="bg-green-500/10 text-green-400">
                      {project.type}
                    </Badge>
                    <span className="text-sm text-gray-400">{project.area}</span>
                  </div>
                  <CardTitle className="text-white">{project.title}</CardTitle>
                  <CardDescription className="text-gray-300">
                    {project.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Lead Form Section */}
      <section id="lead-form" className="py-20 bg-gray-900/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Start Your Design Journey</h2>
            <p className="text-xl text-gray-300">
              Tell us about your project and get a free consultation
            </p>
          </div>

          <Card className="bg-black border-green-500/20">
            <CardHeader>
              <CardTitle className="text-white">Project Details</CardTitle>
              <CardDescription className="text-gray-300">
                Fill out this form and our team will get back to you within 24 hours
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLeadSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      First Name *
                    </label>
                    <Input
                      required
                      value={leadForm.firstName}
                      onChange={(e) => setLeadForm({ ...leadForm, firstName: e.target.value })}
                      className="bg-gray-800 border-gray-700 text-white"
                      placeholder="Enter your first name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Last Name *
                    </label>
                    <Input
                      required
                      value={leadForm.lastName}
                      onChange={(e) => setLeadForm({ ...leadForm, lastName: e.target.value })}
                      className="bg-gray-800 border-gray-700 text-white"
                      placeholder="Enter your last name"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Email *
                    </label>
                    <Input
                      type="email"
                      required
                      value={leadForm.email}
                      onChange={(e) => setLeadForm({ ...leadForm, email: e.target.value })}
                      className="bg-gray-800 border-gray-700 text-white"
                      placeholder="your.email@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Phone *
                    </label>
                    <Input
                      required
                      value={leadForm.phone}
                      onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })}
                      className="bg-gray-800 border-gray-700 text-white"
                      placeholder="+91 98765 43210"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      City *
                    </label>
                    <Input
                      required
                      value={leadForm.city}
                      onChange={(e) => setLeadForm({ ...leadForm, city: e.target.value })}
                      className="bg-gray-800 border-gray-700 text-white"
                      placeholder="Enter your city"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Budget Range
                    </label>
                    <Input
                      type="number"
                      value={leadForm.budgetMin}
                      onChange={(e) => setLeadForm({ ...leadForm, budgetMin: e.target.value })}
                      className="bg-gray-800 border-gray-700 text-white"
                      placeholder="Minimum budget (₹)"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Project Type
                    </label>
                    <select
                      value={leadForm.projectType}
                      onChange={(e) => setLeadForm({ ...leadForm, projectType: e.target.value })}
                      className="w-full bg-gray-800 border-gray-700 text-white rounded-md px-3 py-2"
                    >
                      <option value="">Select project type</option>
                      <option value="full_home">Complete Home</option>
                      <option value="kitchen">Kitchen</option>
                      <option value="living_room">Living Room</option>
                      <option value="bedroom">Bedroom</option>
                      <option value="office">Office</option>
                      <option value="renovation">Renovation</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Timeline
                    </label>
                    <select
                      value={leadForm.timeline}
                      onChange={(e) => setLeadForm({ ...leadForm, timeline: e.target.value })}
                      className="w-full bg-gray-800 border-gray-700 text-white rounded-md px-3 py-2"
                    >
                      <option value="">Select timeline</option>
                      <option value="immediate">Immediate (Within 1 month)</option>
                      <option value="1-3 months">1-3 months</option>
                      <option value="3-6 months">3-6 months</option>
                      <option value="6-12 months">6-12 months</option>
                      <option value="flexible">Flexible</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Project Description
                  </label>
                  <Textarea
                    value={leadForm.description}
                    onChange={(e) => setLeadForm({ ...leadForm, description: e.target.value })}
                    className="bg-gray-800 border-gray-700 text-white"
                    placeholder="Tell us about your project requirements, style preferences, etc."
                    rows={4}
                  />
                </div>

                <Button 
                  type="submit" 
                  size="lg" 
                  className="w-full bg-green-500 hover:bg-green-600 text-white"
                >
                  Submit Project Details
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Partner Section */}
      <section id="partners" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Join Our Network</h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Are you an interior designer or vendor? Join Gharinto's growing network of professionals
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="grid gap-6">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="h-12 w-12 bg-green-500/10 rounded-lg flex items-center justify-center">
                      <Users className="h-6 w-6 text-green-400" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-2">For Interior Designers</h3>
                    <p className="text-gray-300">
                      Get access to qualified leads, project management tools, and grow your business with our platform
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="h-12 w-12 bg-green-500/10 rounded-lg flex items-center justify-center">
                      <Award className="h-6 w-6 text-green-400" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-2">For Vendors</h3>
                    <p className="text-gray-300">
                      List your products, reach more customers, and be part of premium interior design projects
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-white">Benefits of Joining:</h4>
                <ul className="space-y-2">
                  {[
                    'Access to qualified leads and projects',
                    'Digital tools for project management',
                    'Marketing and brand exposure',
                    'Payment protection and timely payments',
                    'Professional network and collaboration',
                    'Training and skill development programs'
                  ].map((benefit, index) => (
                    <li key={index} className="flex items-center text-gray-300">
                      <CheckCircle className="h-5 w-5 text-green-400 mr-3" />
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <Card className="bg-black border-green-500/20">
              <CardHeader>
                <CardTitle className="text-white">Partner Application</CardTitle>
                <CardDescription className="text-gray-300">
                  Apply to join our network of professionals
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePartnerSubmit} className="space-y-6">
                  <div className="grid gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        First Name *
                      </label>
                      <Input
                        required
                        value={partnerForm.firstName}
                        onChange={(e) => setPartnerForm({ ...partnerForm, firstName: e.target.value })}
                        className="bg-gray-800 border-gray-700 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Last Name *
                      </label>
                      <Input
                        required
                        value={partnerForm.lastName}
                        onChange={(e) => setPartnerForm({ ...partnerForm, lastName: e.target.value })}
                        className="bg-gray-800 border-gray-700 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Email *
                      </label>
                      <Input
                        type="email"
                        required
                        value={partnerForm.email}
                        onChange={(e) => setPartnerForm({ ...partnerForm, email: e.target.value })}
                        className="bg-gray-800 border-gray-700 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Phone *
                      </label>
                      <Input
                        required
                        value={partnerForm.phone}
                        onChange={(e) => setPartnerForm({ ...partnerForm, phone: e.target.value })}
                        className="bg-gray-800 border-gray-700 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        City *
                      </label>
                      <Input
                        required
                        value={partnerForm.city}
                        onChange={(e) => setPartnerForm({ ...partnerForm, city: e.target.value })}
                        className="bg-gray-800 border-gray-700 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Partner Type *
                      </label>
                      <select
                        required
                        value={partnerForm.userType}
                        onChange={(e) => setPartnerForm({ ...partnerForm, userType: e.target.value as any })}
                        className="w-full bg-gray-800 border-gray-700 text-white rounded-md px-3 py-2"
                      >
                        <option value="interior_designer">Interior Designer</option>
                        <option value="vendor">Vendor/Supplier</option>
                      </select>
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    size="lg" 
                    className="w-full bg-green-500 hover:bg-green-600 text-white"
                  >
                    Submit Application
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-gray-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">What Our Clients Say</h2>
            <p className="text-xl text-gray-300">
              Real experiences from real customers
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: 'Priya Sharma',
                location: 'Mumbai',
                project: '3BHK Apartment',
                rating: 5,
                comment: 'Gharinto transformed our home beyond our expectations. The team was professional, timely, and understood our vision perfectly.',
                avatar: '👩'
              },
              {
                name: 'Raj Kumar',
                location: 'Bangalore',
                project: 'Villa Interior',
                rating: 5,
                comment: 'Outstanding service from start to finish. The digital project tracking made it so easy to monitor progress.',
                avatar: '👨'
              },
              {
                name: 'Anita Patel',
                location: 'Delhi',
                project: 'Office Design',
                rating: 5,
                comment: 'Professional approach and innovative designs. Our office space now reflects our brand perfectly.',
                avatar: '👩‍💼'
              }
            ].map((testimonial, index) => (
              <Card key={index} className="bg-black border-green-500/20">
                <CardHeader>
                  <div className="flex items-center space-x-4">
                    <div className="text-4xl">{testimonial.avatar}</div>
                    <div>
                      <h4 className="font-semibold text-white">{testimonial.name}</h4>
                      <p className="text-sm text-gray-400">{testimonial.location} • {testimonial.project}</p>
                    </div>
                  </div>
                  <div className="flex space-x-1">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-300 italic">"{testimonial.comment}"</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Get In Touch</h2>
            <p className="text-xl text-gray-300">
              Ready to start your interior design journey? Contact us today!
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12">
            <div className="space-y-8">
              <div>
                <h3 className="text-2xl font-semibold text-white mb-6">Contact Information</h3>
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <div className="h-12 w-12 bg-green-500/10 rounded-lg flex items-center justify-center">
                      <MapPin className="h-6 w-6 text-green-400" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-white">Headquarters</h4>
                      <p className="text-gray-300">Bangalore, Karnataka, India</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="h-12 w-12 bg-green-500/10 rounded-lg flex items-center justify-center">
                      <Phone className="h-6 w-6 text-green-400" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-white">Phone</h4>
                      <p className="text-gray-300">+91 98765 43210</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="h-12 w-12 bg-green-500/10 rounded-lg flex items-center justify-center">
                      <Mail className="h-6 w-6 text-green-400" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-white">Email</h4>
                      <p className="text-gray-300">hello@gharinto.com</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-lg font-semibold text-white mb-4">Follow Us</h4>
                <div className="flex space-x-4">
                  <Button variant="ghost" size="icon" className="text-gray-400 hover:text-green-400">
                    <Facebook className="h-5 w-5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-gray-400 hover:text-green-400">
                    <Twitter className="h-5 w-5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-gray-400 hover:text-green-400">
                    <Instagram className="h-5 w-5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-gray-400 hover:text-green-400">
                    <Linkedin className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-2xl font-semibold text-white mb-6">Office Locations</h3>
              <div className="space-y-6">
                {[
                  { city: 'Bangalore', address: 'Koramangala, Bangalore 560034' },
                  { city: 'Mumbai', address: 'Bandra West, Mumbai 400050' },
                  { city: 'Delhi', address: 'Connaught Place, New Delhi 110001' },
                  { city: 'Pune', address: 'Koregaon Park, Pune 411001' }
                ].map((office, index) => (
                  <div key={index} className="p-4 bg-gray-800/50 rounded-lg border border-green-500/20">
                    <h4 className="font-semibold text-white mb-1">{office.city}</h4>
                    <p className="text-gray-300 text-sm">{office.address}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-green-500/20 bg-black py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="col-span-2">
              <div className="flex items-center space-x-2 mb-4">
                <div className="h-8 w-8 bg-green-500 rounded-md flex items-center justify-center">
                  <span className="text-white font-bold text-sm">G</span>
                </div>
                <span className="font-bold text-xl">Gharinto</span>
              </div>
              <p className="text-gray-300 mb-4 max-w-md">
                India's premier interior design platform connecting homeowners with top designers 
                and vendors for beautiful, functional spaces.
              </p>
              <div className="flex space-x-4">
                <Button variant="ghost" size="icon" className="text-gray-400 hover:text-green-400">
                  <Facebook className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon" className="text-gray-400 hover:text-green-400">
                  <Twitter className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon" className="text-gray-400 hover:text-green-400">
                  <Instagram className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon" className="text-gray-400 hover:text-green-400">
                  <Linkedin className="h-5 w-5" />
                </Button>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-4">Services</h4>
              <ul className="space-y-2 text-gray-300">
                <li><a href="#" className="hover:text-green-400 transition-colors">Complete Home Design</a></li>
                <li><a href="#" className="hover:text-green-400 transition-colors">Modular Kitchen</a></li>
                <li><a href="#" className="hover:text-green-400 transition-colors">Living Room Design</a></li>
                <li><a href="#" className="hover:text-green-400 transition-colors">Bedroom Interiors</a></li>
                <li><a href="#" className="hover:text-green-400 transition-colors">Office Interiors</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-4">Company</h4>
              <ul className="space-y-2 text-gray-300">
                <li><a href="#" className="hover:text-green-400 transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-green-400 transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-green-400 transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-green-400 transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-green-400 transition-colors">Support</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-green-500/20 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 Gharinto. All rights reserved. Made with ❤️ in India.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
