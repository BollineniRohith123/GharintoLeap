import { api } from "encore.dev/api";
import db from "../db";

export interface TestimonialPublic {
  id: string;
  customerName: string;
  customerImage: string | null;
  rating: number;
  content: string;
}

export interface PortfolioItemPublic {
  id: string;
  title: string;
  description: string | null;
  images: string[];
  projectType: string | null;
  designer: {
    name: string;
    businessName: string | null;
  };
}

export interface HomepageStats {
  totalProjects: number;
  happyCustomers: number;
  experienceYears: number;
  citiesCovered: number;
}

export interface HomepageDataResponse {
  featuredTestimonials: TestimonialPublic[];
  featuredPortfolio: PortfolioItemPublic[];
  stats: HomepageStats;
}

// Retrieves public homepage data including testimonials and portfolio.
export const getHomepageData = api<void, HomepageDataResponse>(
  { expose: true, method: "GET", path: "/public/homepage" },
  async () => {
    // Get featured testimonials
    const testimonials = await db.queryAll<{
      id: number;
      customer_name: string;
      customer_image: string | null;
      rating: number;
      content: string;
    }>`
      SELECT id, customer_name, customer_image, rating, content
      FROM testimonials
      WHERE is_featured = true AND is_approved = true
      ORDER BY created_at DESC
      LIMIT 6
    `;

    // Get featured portfolio items
    const portfolio = await db.queryAll<{
      id: number;
      title: string;
      description: string | null;
      images: string[];
      project_type: string | null;
      designer_name: string;
      business_name: string | null;
    }>`
      SELECT 
        pi.id, pi.title, pi.description, pi.images, pi.project_type,
        u.first_name || ' ' || u.last_name as designer_name,
        dp.business_name
      FROM portfolio_items pi
      JOIN designer_profiles dp ON pi.designer_id = dp.id
      JOIN users u ON dp.user_id = u.id
      WHERE pi.is_featured = true
      ORDER BY pi.created_at DESC
      LIMIT 8
    `;

    // Get homepage stats
    const stats = await db.queryRow<{
      total_projects: number;
      total_users: number;
      total_cities: number;
    }>`
      SELECT 
        (SELECT COUNT(*) FROM projects WHERE status = 'completed') as total_projects,
        (SELECT COUNT(*) FROM users WHERE id IN (SELECT user_id FROM homeowner_profiles)) as total_users,
        (SELECT COUNT(*) FROM cities WHERE is_active = true) as total_cities
    `;

    return {
      featuredTestimonials: testimonials.map(t => ({
        id: t.id.toString(),
        customerName: t.customer_name,
        customerImage: t.customer_image,
        rating: t.rating,
        content: t.content
      })),
      featuredPortfolio: portfolio.map(p => ({
        id: p.id.toString(),
        title: p.title,
        description: p.description,
        images: p.images,
        projectType: p.project_type,
        designer: {
          name: p.designer_name,
          businessName: p.business_name
        }
      })),
      stats: {
        totalProjects: stats?.total_projects || 0,
        happyCustomers: stats?.total_users || 0,
        experienceYears: 10, // Static value
        citiesCovered: stats?.total_cities || 0
      }
    };
  }
);
