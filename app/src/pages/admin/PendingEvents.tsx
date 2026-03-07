import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { adminAPI } from '../../services/api';
import type { Event } from '../../types';
import { CheckCircle, XCircle, Calendar, MapPin, Loader2, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function PendingEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  useEffect(() => {
    fetchPendingEvents();
  }, []);

  const fetchPendingEvents = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getPendingEvents();
      setEvents(response.data.events || []);
    } catch (error) {
      console.error('Error fetching pending events:', error);
      toast.error('Failed to load pending events');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (eventId: string) => {
    setProcessing(eventId);
    try {
      await adminAPI.approveEvent(eventId, 'approved');
      toast.success('Event approved successfully');
      fetchPendingEvents();
    } catch (error) {
      console.error('Error approving event:', error);
      toast.error('Failed to approve event');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async () => {
    if (!selectedEvent) return;

    const eventId = (selectedEvent as any)._id || selectedEvent.id;
    setProcessing(eventId);
    try {
      await adminAPI.approveEvent(eventId, 'rejected', rejectionReason);
      toast.success('Event rejected');
      setShowRejectDialog(false);
      setRejectionReason('');
      setSelectedEvent(null);
      fetchPendingEvents();
    } catch (error) {
      console.error('Error rejecting event:', error);
      toast.error('Failed to reject event');
    } finally {
      setProcessing(null);
    }
  };

  const openRejectDialog = (event: Event) => {
    setSelectedEvent(event);
    setShowRejectDialog(true);
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
        <h1 className="text-3xl font-bold">Pending Events</h1>
        <p className="text-muted-foreground">Review and approve event submissions</p>
      </div>

      {events.length > 0 ? (
        <div className="space-y-4">
          {events.map((event) => {
            const eventId = (event as any)._id || event.id;
            return (
              <Card key={eventId}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge>{event.category}</Badge>
                        <Badge variant={event.isPaid ? 'default' : 'secondary'}>
                          {event.isPaid ? `₹${event.price}` : 'Free'}
                        </Badge>
                      </div>
                      <h3 className="font-semibold text-lg">{event.title}</h3>
                      <p className="text-muted-foreground line-clamp-2 mb-3">{event.description}</p>
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          {format(new Date(event.eventDate), 'MMM d, yyyy')}
                        </span>
                        <span className="flex items-center">
                          <MapPin className="h-4 w-4 mr-1" />
                          {event.venue}
                        </span>
                        <span className="flex items-center">
                          <Building2 className="h-4 w-4 mr-1" />
                          {typeof event.clubId === 'object' ? event.clubId.name : 'Unknown Club'}
                        </span>
                      </div>
                      <p className="text-sm mt-2">
                        Created by: {typeof event.createdBy === 'object' ? event.createdBy.name : 'Unknown'}
                      </p>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-600 border-green-600 hover:bg-green-50"
                        onClick={() => handleApprove(eventId)}
                        disabled={processing === eventId}
                      >
                        {processing === eventId ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-600 hover:bg-red-50"
                        onClick={() => openRejectDialog(event)}
                        disabled={processing === eventId}
                      >
                        <XCircle className="h-4 w-4" />
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
            <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
            <h3 className="text-lg font-medium">No pending events</h3>
            <p className="text-muted-foreground">All events have been reviewed</p>
          </CardContent>
        </Card>
      )}

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Event</DialogTitle>
            <DialogDescription>
              Are you sure you want to reject "{selectedEvent?.title}"?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Optional: Add a reason for rejection"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={!!processing}>
              {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
