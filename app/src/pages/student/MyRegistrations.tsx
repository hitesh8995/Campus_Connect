import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { registrationsAPI } from '../../services/api';
import type { Registration } from '../../types';
import { Calendar, Ticket, Loader2, ArrowRight, CheckCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';

export default function MyRegistrations() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRegistrations();
  }, []);

  const fetchRegistrations = async () => {
    try {
      setLoading(true);
      const response = await registrationsAPI.getMyRegistrations();
      setRegistrations(response.data.registrations || []);
    } catch (error) {
      console.error('Error fetching registrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string, paymentStatus: string) => {
    if (status === 'confirmed') {
      return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" /> Confirmed</Badge>;
    }
    if (paymentStatus === 'pending') {
      return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" /> Payment Pending</Badge>;
    }
    return <Badge variant="secondary">{status}</Badge>;
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
        <h1 className="text-3xl font-bold">My Registrations</h1>
        <p className="text-muted-foreground">View all your event registrations</p>
      </div>

      {registrations.length > 0 ? (
        <div className="space-y-4">
          {registrations.map((reg) => {
            const event = typeof reg.eventId === 'object' ? reg.eventId : null;
            if (!event) return null;
            
            return (
              <Card key={reg.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusBadge(reg.status, reg.paymentStatus)}
                        {reg.attended && <Badge className="bg-blue-500">Attended</Badge>}
                      </div>
                      <h3 className="font-semibold text-lg">{event.title}</h3>
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mt-2">
                        <span className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          {format(new Date(event.eventDate), 'MMM d, yyyy')}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Registered on {format(new Date(reg.registeredAt), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2">
                      {reg.status === 'confirmed' && (
                        <Button variant="outline" size="sm" asChild>
                          <Link to="/student/tickets">
                            <Ticket className="h-4 w-4 mr-1" />
                            View Ticket
                          </Link>
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" asChild>
                        <Link to={`/events/${event.id}`}>
                          Details <ArrowRight className="h-4 w-4 ml-1" />
                        </Link>
                      </Button>
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
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No registrations yet</h3>
            <p className="text-muted-foreground mb-4">Browse events and register for ones you're interested in</p>
            <Button asChild>
              <Link to="/events">Browse Events</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
