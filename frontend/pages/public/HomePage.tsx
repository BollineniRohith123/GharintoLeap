import { Link } from 'react-router-dom';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import GetQuoteForm from '@/components/forms/GetQuoteForm';
import BecomePartnerForm from '@/components/forms/BecomePartnerForm';
import {
  ArrowRight,
  CheckCircle,
  Users,
  Briefcase,
  Package,
  Building,
  DollarSign,
  BarChart3,
  Shield,
  Zap,
  Star,
  MessageSquare
} from 'lucide-react';

const features = [
  {
    icon: Users,
    title: 'Multi-Role Management',
    description: 'Comprehensive role-based access for customers, designers, project managers, vendors, and admins.',
    status: 'completed'
  },
  {
    icon: Briefcase,
    title: 'Project Workflow System',
    description: 'Streamlined project management with customizable workflows and milestone tracking.',
    status: 'completed'
  },
  {
    icon: Package,
    title: 'Material Catalog',
    description: 'Extensive material library with vendor integration, inventory management, and pricing.',
    status: 'completed'
  },
  {
    icon: Building,
    title: 'Vendor Ecosystem',
    description: 'Verified vendor network with ratings, reviews, and seamless order management.',
    status: 'completed'
  },
  {
    icon: DollarSign,
    title: 'Digital Wallet & Payments',
    description: 'Integrated payment system with digital wallets and transaction tracking.',
    status: 'in-progress'
  },
  {
    icon: MessageSquare,
    title: 'Real-time Communication',
    description: 'Built-in messaging system for project collaboration and customer support.',
    status: 'in-progress'
  },
  {
    icon: BarChart3,
    title: 'Advanced Analytics',
    description: 'Comprehensive reporting and analytics for business insights and performance tracking.',
    status: 'planned'
  },
  {
    icon: Shield,
    title: 'Enterprise Security',
    description: 'Bank-grade security with role-based permissions and audit trails.',
    status: 'completed'
  }
];

const stats = [
  { label: 'Active Projects', value: '150+', color: 'text-blue-600' },
  { label: 'Verified Vendors', value: '50+', color: 'text-green-600' },
  { label: 'Materials Catalog', value: '1000+', color: 'text-purple-600' },
  { label: 'Happy Customers', value: '300+', color: 'text-orange-600' }
];

const quickActions = [
  { title: 'View Projects', description: 'Manage your interior design projects', href: '/projects', icon: Briefcase, color: 'bg-blue-500' },
  { title: 'Browse Materials', description: 'Explore our extensive material catalog', href: '/materials', icon: Package, color: 'bg-green-500' },
  { title: 'Find Vendors', description: 'Connect with verified vendors', href: '/vendors', icon: Building, color: 'bg-purple-500' },
  { title: 'Track Leads', description: 'Manage and convert leads', href: '/leads', icon: Users, color: 'bg-orange-500' }
];

export default function HomePage() {
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [showPartnerForm, setShowPartnerForm] = useState(false);
  return (
    <div className="min-h-screen bg-gradient-to-br from-gharinto-pale-green via-white to-gharinto-green-50">
      {/* Hero Section */}
      <section className="relative px-6 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <div className="h-16 w-16 gharinto-primary rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-2xl">G</span>
              </div>
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
              Gharinto Interiors
              <span className="block text-gharinto-primary">Marketplace</span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-600 max-w-3xl mx-auto">
              India's premier B2B interior design platform connecting customers, designers, vendors, and project managers 
              in a comprehensive ecosystem for seamless project delivery.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Button size="lg" className="gharinto-primary hover:gharinto-dark" onClick={() => setShowQuoteForm(true)}>
                Get Free Quote
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button variant="outline" size="lg" onClick={() => setShowPartnerForm(true)}>
                Become a Partner
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className={`text-3xl font-bold ${stat.color}`}>{stat.value}</div>
                <div className="text-sm text-gray-600 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="py-16 bg-gray-50">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Quick Actions</h2>
            <p className="mt-4 text-lg text-gray-600">Jump into your most common tasks</p>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {quickActions.map((action, index) => (
              <Link key={index} to={action.href}>
                <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer group">
                  <CardHeader className="text-center">
                    <div className={`mx-auto h-12 w-12 rounded-lg ${action.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                      <action.icon className="h-6 w-6 text-white" />
                    </div>
                    <CardTitle className="text-lg">{action.title}</CardTitle>
                    <CardDescription>{action.description}</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Platform Features</h2>
            <p className="mt-4 text-lg text-gray-600">
              Comprehensive tools for every stakeholder in the interior design ecosystem
            </p>
          </div>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {features.map((feature, index) => (
              <Card key={index} className="h-full">
                <CardHeader>
                  <div className="flex items-center justify-between mb-3">
                    <feature.icon className="h-8 w-8 text-green-600" />
                    <Badge 
                      variant={feature.status === 'completed' ? 'default' : feature.status === 'in-progress' ? 'secondary' : 'outline'}
                      className={
                        feature.status === 'completed' ? 'bg-green-100 text-green-800' :
                        feature.status === 'in-progress' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }
                    >
                      {feature.status === 'completed' && <CheckCircle className="w-3 h-3 mr-1" />}
                      {feature.status === 'in-progress' && <Zap className="w-3 h-3 mr-1" />}
                      {feature.status.replace('-', ' ')}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Technology Section */}
      <section className="py-16 bg-gray-50">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Built for Scale & Performance</h2>
            <p className="mt-4 text-lg text-gray-600">
              Modern technology stack ensuring reliability, security, and scalability
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4 lg:grid-cols-6">
            {['TypeScript', 'React', 'Encore.ts', 'PostgreSQL', 'Tailwind CSS', 'Vite'].map((tech, index) => (
              <div key={index} className="text-center">
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="text-sm font-medium text-gray-900">{tech}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-green-600">
        <div className="mx-auto max-w-7xl px-6 text-center">
          <h2 className="text-3xl font-bold text-white">Ready to Transform Your Interior Design Business?</h2>
          <p className="mt-4 text-lg text-green-100 max-w-2xl mx-auto">
            Join hundreds of designers, vendors, and project managers already using Gharinto to streamline their workflow.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link to="/register">
              <Button size="lg" variant="secondary">
                Start Free Trial
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline" className="text-white border-white hover:bg-white hover:text-green-600">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>
      
      {/* Forms */}
      <GetQuoteForm 
        isOpen={showQuoteForm} 
        onClose={() => setShowQuoteForm(false)} 
      />
      <BecomePartnerForm 
        isOpen={showPartnerForm} 
        onClose={() => setShowPartnerForm(false)} 
      />
    </div>
  );
}