import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { coordinatorAPI } from '../../services/api';
import type { Event } from '../../types';
import { Calendar, Users, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

export default function CoordinatorEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await coordinatorAPI.getEvents();
      setEvents(response.data.events || []);
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
        <h1 className="text-3xl font-bold">My Events</h1>
        <p className="text-muted-foreground">Events assigned to you as coordinator</p>
      </div>

      {events.length > 0 ? (
        <div className="space-y-4">
          {events.map((event) => (
            <Card key={event.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge>{event.category}</Badge>
                      <Badge variant={event.isPaid ? 'default' : 'secondary'}>
                        {event.isPaid ? `₹${event.price}` : 'Free'}
                      </Badge>
                    </div>
                    <h3 className="font-semibold text-lg">{event.title}</h3>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mt-2">
                      <span className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        {format(new Date(event.eventDate), 'MMM d, yyyy')}
                      </span>
                      <span className="flex items-center">
                        <Users className="h-4 w-4 mr-1" />
                        {event.registeredCount} registered
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" asChild>
                      <Link to={`/coordinator/attendance/${event.id}`}>
                        Attendance
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No events assigned</h3>
            <p className="text-muted-foreground">
              You haven't been assigned to any events yet
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
