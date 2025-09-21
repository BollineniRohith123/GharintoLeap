import { Users, Building2, Calendar, MapPin } from 'lucide-react';
import type { HomepageStats } from '~backend/website/homepage';

interface StatsSectionProps {
  stats: HomepageStats;
}

export default function StatsSection({ stats }: StatsSectionProps) {
  const statItems = [
    {
      icon: Building2,
      value: stats.totalProjects.toLocaleString(),
      label: 'Completed Projects',
      color: 'text-primary'
    },
    {
      icon: Users,
      value: stats.happyCustomers.toLocaleString(),
      label: 'Happy Customers',
      color: 'text-green-500'
    },
    {
      icon: Calendar,
      value: `${stats.experienceYears}+`,
      label: 'Years Experience',
      color: 'text-blue-500'
    },
    {
      icon: MapPin,
      value: stats.citiesCovered.toString(),
      label: 'Cities Covered',
      color: 'text-purple-500'
    }
  ];

  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {statItems.map((stat, index) => (
            <div key={index} className="text-center">
              <div className="flex justify-center mb-4">
                <stat.icon className={`h-12 w-12 ${stat.color}`} />
              </div>
              <div className="text-3xl md:text-4xl font-bold mb-2">
                {stat.value}
              </div>
              <div className="text-muted-foreground text-sm md:text-base">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
