import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { registrationsAPI, eventsAPI } from '../../services/api';
import type { Registration, Event } from '../../types';
import { Calendar, Ticket, Star, Loader2, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';

export default function StudentDashboard() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [regRes, eventsRes] = await Promise.all([
        registrationsAPI.getMyRegistrations({ limit: 5 }),
        eventsAPI.getEvents({ upcoming: 'true', limit: 4 })
      ]);
      setRegistrations(regRes.data.registrations || []);
      setUpcomingEvents(eventsRes.data.events || []);
    } catch (error) {
      console.error('Error fetching data:', error);
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

  const confirmedRegistrations = registrations.filter(r => r.status === 'confirmed');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Student Dashboard</h1>
        <p className="text-muted-foreground">Manage your event registrations and tickets</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">My Registrations</p>
                <p className="text-3xl font-bold">{registrations.length}</p>
              </div>
              <div className="p-3 rounded-full bg-primary/10">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Confirmed</p>
                <p className="text-3xl font-bold">{confirmedRegistrations.length}</p>
              </div>
              <div className="p-3 rounded-full bg-green-100">
                <Ticket className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">My Reviews</p>
                <p className="text-3xl font-bold">-</p>
              </div>
              <div className="p-3 rounded-full bg-yellow-100">
                <Star className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>My Upcoming Events</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/student/registrations">
                View All <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {confirmedRegistrations.length > 0 ? (
              <div className="space-y-4">
                {confirmedRegistrations.slice(0, 3).map((reg) => {
                  const event = typeof reg.eventId === 'object' ? reg.eventId : null;
                  if (!event) return null;
                  
                  return (
                    <div key={reg.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <h3 className="font-medium">{event.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(event.eventDate), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <Link to="/student/tickets">View Ticket</Link>
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No upcoming events</p>
                <Button className="mt-4" asChild>
                  <Link to="/events">Browse Events</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recommended Events</CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingEvents.length > 0 ? (
              <div className="space-y-4">
                {upcomingEvents.slice(0, 3).map((event) => (
                  <Link key={event.id} to={`/events/${event.id}`}>
                    <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted transition-colors">
                      <div>
                        <h3 className="font-medium">{event.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(event.eventDate), 'MMM d, yyyy')} • {event.venue}
                        </p>
                      </div>
                      <Badge variant={event.isPaid ? 'default' : 'secondary'}>
                        {event.isPaid ? `₹${event.price}` : 'Free'}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No upcoming events</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
