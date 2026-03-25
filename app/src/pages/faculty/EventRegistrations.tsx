import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { eventsAPI } from '../../services/api';
import type { Registration, Event } from '../../types';
import { ArrowLeft, Users, Download, Search, Loader2, CheckCircle, Building2 } from 'lucide-react';
import { format } from 'date-fns';

export default function EventRegistrations() {
  const { eventId } = useParams<{ eventId: string }>();
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (eventId) {
      fetchRegistrations();
    }
  }, [eventId]);

  const fetchRegistrations = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check if faculty is assigned to a club before making the API call
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (!user.clubId) {
        setError('not_assigned');
        setLoading(false);
        return;
      }

      const response = await eventsAPI.getEventRegistrations(eventId!);
      setRegistrations(response.data.registrations || []);
      setEvent(response.data.event);
    } catch (err: any) {
      console.error('Error fetching registrations:', err);
      const status = err?.response?.status;
      if (status === 403 || status === 401) {
        setError('not_assigned');
      } else {
        setError('fetch_failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredRegistrations = registrations.filter((reg) => {
    const user = typeof reg.userId === 'object' ? reg.userId : null;
    if (!user) return false;
    const searchLower = search.toLowerCase();
    return (
      user.name?.toLowerCase().includes(searchLower) ||
      user.rollNo?.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower)
    );
  });

  const exportCSV = () => {
    const headers = ['Name', 'Email', 'Roll No', 'Department', 'Section', 'Year', 'Ticket ID', 'Status', 'Attended'];
    const rows = registrations.map((reg) => {
      const user = (typeof reg.userId === 'object' ? reg.userId : {}) as any;
      return [
        user.name || '',
        user.email || '',
        user.rollNo || '',
        user.department || '',
        user.section || '',
        user.currentYear || '',
        reg.ticketId || '',
        reg.status,
        reg.attended ? 'Yes' : 'No'
      ];
    });

    const csv = [headers.join(','), ...rows.map(r => r.map(field => `"${field}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${event?.title || 'event'}-registrations.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error === 'not_assigned') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link to="/faculty/events">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">Event Registrations</h1>
        </div>
        <Card>
          <CardContent className="p-12 flex flex-col items-center justify-center text-center space-y-4">
            <Building2 className="h-16 w-16 text-muted-foreground" />
            <h2 className="text-xl font-semibold">Not Assigned to Any Club</h2>
            <p className="text-muted-foreground max-w-sm">
              You are not assigned to any club, so you cannot view event registrations.
              Please contact the admin to get assigned to a club.
            </p>
            <Button variant="outline" asChild>
              <Link to="/faculty/dashboard">Go to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error === 'fetch_failed') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link to="/faculty/events">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">Event Registrations</h1>
        </div>
        <Card>
          <CardContent className="p-12 flex flex-col items-center justify-center text-center space-y-4">
            <Users className="h-16 w-16 text-muted-foreground" />
            <h2 className="text-xl font-semibold">Failed to Load Registrations</h2>
            <p className="text-muted-foreground">Something went wrong while fetching registrations.</p>
            <Button onClick={fetchRegistrations}>Try Again</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link to="/faculty/events">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{event?.title}</h1>
          <p className="text-muted-foreground">
            {format(new Date(event?.eventDate || ''), 'MMM d, yyyy')} • {event?.venue}
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search registrations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" onClick={exportCSV}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <div className="flex items-center gap-4 text-sm">
        <span className="flex items-center">
          <Users className="h-4 w-4 mr-1" />
          {registrations.length} total registrations
        </span>
        <span className="flex items-center">
          <CheckCircle className="h-4 w-4 mr-1" />
          {registrations.filter(r => r.attended).length} attended
        </span>
      </div>

      {filteredRegistrations.length > 0 ? (
        <div className="space-y-2">
          {filteredRegistrations.map((reg) => {
            const user = typeof reg.userId === 'object' ? reg.userId : null;
            if (!user) return null;

            return (
              <Card key={reg.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="font-medium">{user.name?.charAt(0)}</span>
                      </div>
                      <div>
                        <h3 className="font-medium">{user.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {user.rollNo} • {user.department}
                        </p>
                        <div className="flex gap-2 mt-1">
                          <Badge variant={reg.status === 'confirmed' ? 'default' : 'outline'}>
                            {reg.status}
                          </Badge>
                          {reg.attended && <Badge className="bg-green-500">Attended</Badge>}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{reg.ticketId}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(reg.registeredAt), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No registrations found</h3>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
