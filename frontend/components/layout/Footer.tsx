import { Link } from 'react-router-dom';
import { Home, Mail, Phone, MapPin, Facebook, Twitter, Instagram, Linkedin } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-muted/50 border-t">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div>
            <Link to="/" className="flex items-center space-x-2 mb-4">
              <Home className="h-6 w-6 text-primary" />
              <span className="text-lg font-bold">InteriorPro</span>
            </Link>
            <p className="text-muted-foreground mb-4">
              Connecting homeowners with top interior designers and vendors for beautiful, 
              functional spaces.
            </p>
            <div className="flex space-x-4">
              <Facebook className="h-5 w-5 text-muted-foreground hover:text-primary cursor-pointer" />
              <Twitter className="h-5 w-5 text-muted-foreground hover:text-primary cursor-pointer" />
              <Instagram className="h-5 w-5 text-muted-foreground hover:text-primary cursor-pointer" />
              <Linkedin className="h-5 w-5 text-muted-foreground hover:text-primary cursor-pointer" />
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/about" className="text-muted-foreground hover:text-primary">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/projects" className="text-muted-foreground hover:text-primary">
                  Projects
                </Link>
              </li>
              <li>
                <Link to="/designers" className="text-muted-foreground hover:text-primary">
                  Find Designers
                </Link>
              </li>
              <li>
                <Link to="/vendors" className="text-muted-foreground hover:text-primary">
                  Vendors
                </Link>
              </li>
            </ul>
          </div>

          {/* Services */}
          <div>
            <h3 className="font-semibold mb-4">Services</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/services/residential" className="text-muted-foreground hover:text-primary">
                  Residential Design
                </Link>
              </li>
              <li>
                <Link to="/services/commercial" className="text-muted-foreground hover:text-primary">
                  Commercial Design
                </Link>
              </li>
              <li>
                <Link to="/services/consultation" className="text-muted-foreground hover:text-primary">
                  Design Consultation
                </Link>
              </li>
              <li>
                <Link to="/services/renovation" className="text-muted-foreground hover:text-primary">
                  Home Renovation
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="font-semibold mb-4">Contact Us</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">info@interiorpro.com</span>
              </div>
              <div className="flex items-center space-x-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">+91 98765 43210</span>
              </div>
              <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Mumbai, India</span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t mt-8 pt-8 text-center text-muted-foreground">
          <p>&copy; 2024 InteriorPro. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
