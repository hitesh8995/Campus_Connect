import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { adminAPI } from '../../services/api';
import type { DashboardStats } from '../../types';
import { Users, Building2, Calendar, Ticket, Loader2 } from 'lucide-react';

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const response = await adminAPI.getDashboard();
      setStats(response.data.stats);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Users',
      value: stats?.users.total || 0,
      icon: Users,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50',
      breakdown: [
        { label: 'Students', value: stats?.users.students || 0 },
        { label: 'Faculty', value: stats?.users.faculty || 0 },
        { label: 'Coordinators', value: stats?.users.coordinators || 0 },
      ]
    },
    {
      title: 'Pending Approvals',
      value: stats?.users.pendingApproval || 0,
      icon: Users,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-50',
    },
    {
      title: 'Total Clubs',
      value: stats?.clubs.total || 0,
      icon: Building2,
      color: 'text-green-500',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Total Events',
      value: stats?.events.total || 0,
      icon: Calendar,
      color: 'text-purple-500',
      bgColor: 'bg-purple-50',
      breakdown: [
        { label: 'Pending', value: stats?.events.pending || 0 },
        { label: 'Approved', value: stats?.events.approved || 0 },
        { label: 'Completed', value: stats?.events.completed || 0 },
      ]
    },
    {
      title: 'Total Registrations',
      value: stats?.registrations.total || 0,
      icon: Ticket,
      color: 'text-pink-500',
      bgColor: 'bg-pink-50',
      breakdown: [
        { label: 'Confirmed', value: stats?.registrations.confirmed || 0 },
        { label: 'Pending', value: stats?.registrations.pending || 0 },
      ]
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your CAMPUS-CONNECT dashboard</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {statCards.map((card) => (
          <Card key={card.title}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                  <p className="text-3xl font-bold">{card.value}</p>
                </div>
                <div className={`p-3 rounded-full ${card.bgColor}`}>
                  <card.icon className={`h-6 w-6 ${card.color}`} />
                </div>
              </div>
              {card.breakdown && (
                <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-2 text-center">
                  {card.breakdown.map((item) => (
                    <div key={item.label}>
                      <p className="text-lg font-semibold">{item.value}</p>
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-primary text-primary-foreground">
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <a href="/admin/pending-users" className="block p-3 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
              Review Pending Users →
            </a>
            <a href="/admin/pending-events" className="block p-3 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
              Review Pending Events →
            </a>
            <a href="/admin/clubs" className="block p-3 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
              Manage Clubs →
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
