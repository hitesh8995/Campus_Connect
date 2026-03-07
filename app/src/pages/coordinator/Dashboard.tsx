import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { coordinatorAPI } from '../../services/api';
import type { Event } from '../../types';
import { Calendar, QrCode, Users, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

export default function CoordinatorDashboard() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await coordinatorAPI.getEvents();
      setEvents(response.data.events?.slice(0, 5) || []);
    } catch (error) {
      console.error('Error fetching events:', error);
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Coordinator Dashboard</h1>
        <p className="text-muted-foreground">Manage event attendance and verify tickets</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-primary text-primary-foreground">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Quick Action</p>
                <p className="text-xl font-semibold">Verify Ticket</p>
                <p className="text-sm opacity-75 mt-1">Scan or enter ticket ID</p>
              </div>
              <div className="p-3 rounded-full bg-white/20">
                <QrCode className="h-6 w-6" />
              </div>
            </div>
            <Button className="mt-4 w-full bg-white text-primary hover:bg-white/90" asChild>
              <Link to="/coordinator/verify-ticket">Open Scanner</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Assigned Events</p>
                <p className="text-3xl font-bold">{events.length}</p>
              </div>
              <div className="p-3 rounded-full bg-primary/10">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Events</CardTitle>
        </CardHeader>
        <CardContent>
          {events.length > 0 ? (
            <div className="space-y-4">
              {events.map((event) => (
                <div key={event.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 className="font-semibold">{event.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(event.eventDate), 'MMM d, yyyy')} • {event.venue}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/coordinator/attendance/${event.id}`}>
                        <Users className="h-4 w-4 mr-1" />
                        Attendance
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No events assigned yet</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
