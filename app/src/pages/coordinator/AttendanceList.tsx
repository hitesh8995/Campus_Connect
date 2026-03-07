import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { coordinatorAPI } from '../../services/api';
import type { Event } from '../../types';
import { ClipboardCheck, Loader2, Calendar, MapPin, Users } from 'lucide-react';
import { toast } from 'sonner';

export default function AttendanceList() {
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchEvents();
    }, []);

    const fetchEvents = async () => {
        try {
            setLoading(true);
            const response = await coordinatorAPI.getEvents();
            setEvents(response.data.events || response.data || []);
        } catch (error) {
            console.error('Error fetching events:', error);
            toast.error('Failed to load events');
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
                <h1 className="text-3xl font-bold">Attendance</h1>
                <p className="text-muted-foreground">Select an event to manage attendance</p>
            </div>

            {events.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {events.map((event) => {
                        const eventId = (event as any)._id || event.id;
                        return (
                            <Card key={eventId} className="hover:shadow-md transition-shadow">
                                <CardContent className="p-5">
                                    <h3 className="font-semibold text-lg mb-2">{event.title}</h3>
                                    <div className="space-y-1 text-sm text-muted-foreground mb-4">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="h-4 w-4" />
                                            <span>{new Date(event.eventDate).toLocaleDateString()}</span>
                                        </div>
                                        {event.venue && (
                                            <div className="flex items-center gap-2">
                                                <MapPin className="h-4 w-4" />
                                                <span>{event.venue}</span>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-2">
                                            <Users className="h-4 w-4" />
                                            <span>{event.registeredCount || 0} registered</span>
                                        </div>
                                    </div>
                                    <Button asChild className="w-full">
                                        <Link to={`/coordinator/attendance/${eventId}`}>
                                            <ClipboardCheck className="mr-2 h-4 w-4" />
                                            Manage Attendance
                                        </Link>
                                    </Button>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            ) : (
                <Card>
                    <CardContent className="p-8 text-center">
                        <ClipboardCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium">No events found</h3>
                        <p className="text-muted-foreground mt-1">
                            You don't have any events assigned yet.
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
