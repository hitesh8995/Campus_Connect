import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { registrationsAPI } from '../../services/api';
import type { Registration } from '../../types';
import { Ticket, Loader2, Download, Calendar, MapPin, QrCode } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function MyTickets() {
  const [tickets, setTickets] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const response = await registrationsAPI.getMyRegistrations({ status: 'confirmed' });
      setTickets(response.data.registrations || []);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadTicket = (ticket: Registration) => {
    if (!ticket.qrCode) {
      toast.error('QR code not available');
      return;
    }
    
    const link = document.createElement('a');
    link.href = ticket.qrCode;
    link.download = `ticket-${ticket.ticketId}.png`;
    link.click();
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
        <h1 className="text-3xl font-bold">My Tickets</h1>
        <p className="text-muted-foreground">Download and show these at the event entrance</p>
      </div>

      {tickets.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {tickets.map((ticket) => {
            const event = typeof ticket.eventId === 'object' ? ticket.eventId : null;
            if (!event) return null;
            
            return (
              <Card key={ticket.id} className="overflow-hidden">
                <div className="bg-primary text-primary-foreground p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm opacity-75">Ticket ID</p>
                      <p className="font-mono font-semibold">{ticket.ticketId}</p>
                    </div>
                    <Ticket className="h-8 w-8 opacity-50" />
                  </div>
                </div>
                <CardContent className="p-6">
                  <h3 className="font-semibold text-lg mb-2">{event.title}</h3>
                  <div className="space-y-2 text-sm text-muted-foreground mb-4">
                    <p className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2" />
                      {format(new Date(event.eventDate), 'MMM d, yyyy h:mm a')}
                    </p>
                    <p className="flex items-center">
                      <MapPin className="h-4 w-4 mr-2" />
                      {event.venue}
                    </p>
                  </div>
                  
                  {ticket.qrCode && (
                    <div className="flex flex-col items-center">
                      <img
                        src={ticket.qrCode}
                        alt="Ticket QR Code"
                        className="w-48 h-48 mb-4"
                      />
                      <Button variant="outline" size="sm" onClick={() => downloadTicket(ticket)}>
                        <Download className="h-4 w-4 mr-2" />
                        Download QR
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <QrCode className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No tickets yet</h3>
            <p className="text-muted-foreground">
              Your tickets will appear here after you register for events
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
