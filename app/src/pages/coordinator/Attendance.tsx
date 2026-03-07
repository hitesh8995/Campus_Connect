import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { coordinatorAPI } from '../../services/api';
import type { Registration, Event } from '../../types';
import { ArrowLeft, Search, Users, CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function Attendance() {
  const { eventId } = useParams<{ eventId: string }>();
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [marking, setMarking] = useState<string | null>(null);

  useEffect(() => {
    if (eventId) {
      fetchRegistrations();
    }
  }, [eventId]);

  const fetchRegistrations = async () => {
    try {
      setLoading(true);
      const response = await coordinatorAPI.getEventRegistrations(eventId!);
      setRegistrations(response.data.registrations || []);
      setEvent(response.data.event);
    } catch (error) {
      console.error('Error fetching registrations:', error);
      toast.error('Failed to load registrations');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAttendance = async (registrationId: string, attended: boolean) => {
    setMarking(registrationId);
    try {
      await coordinatorAPI.markAttendance(registrationId, attended);
      toast.success(attended ? 'Attendance marked' : 'Attendance unmarked');
      fetchRegistrations();
    } catch (error: any) {
      console.error('Error marking attendance:', error);
      toast.error(error.response?.data?.message || 'Failed to mark attendance');
    } finally {
      setMarking(null);
    }
  };

  const filteredRegistrations = registrations.filter((reg) => {
    const user = typeof reg.userId === 'object' ? reg.userId : null;
    if (!user) return false;
    const searchLower = search.toLowerCase();
    return (
      user.name?.toLowerCase().includes(searchLower) ||
      user.rollNo?.toLowerCase().includes(searchLower)
    );
  });

  const stats = {
    total: registrations.length,
    confirmed: registrations.filter(r => r.status === 'confirmed').length,
    attended: registrations.filter(r => r.attended).length
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
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link to="/coordinator/events">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{event?.title}</h1>
          <p className="text-muted-foreground">Mark attendance for registered participants</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Confirmed</p>
            <p className="text-2xl font-bold">{stats.confirmed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Attended</p>
            <p className="text-2xl font-bold text-green-600">{stats.attended}</p>
          </CardContent>
        </Card>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or roll number..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
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
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        reg.attended ? 'bg-green-100' : 'bg-muted'
                      }`}>
                        {reg.attended ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <span className="font-medium">{user.name?.charAt(0)}</span>
                        )}
                      </div>
                      <div>
                        <h3 className="font-medium">{user.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {user.rollNo} • {user.department}
                        </p>
                        <p className="text-sm text-muted-foreground">{reg.ticketId}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Switch
                        checked={reg.attended}
                        onCheckedChange={(checked) => handleMarkAttendance(reg.id, checked)}
                        disabled={marking === reg.id || reg.status !== 'confirmed'}
                      />
                      {marking === reg.id && <Loader2 className="h-4 w-4 animate-spin" />}
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
