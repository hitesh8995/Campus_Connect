import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { coordinatorAPI } from '../../services/api';
import { QrCode, Search, CheckCircle, XCircle, Loader2, User, Ticket } from 'lucide-react';
import { toast } from 'sonner';

export default function VerifyTicket() {
  const [ticketId, setTicketId] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketId.trim()) return;

    setVerifying(true);
    setResult(null);

    try {
      const response = await coordinatorAPI.verifyTicket(ticketId.trim());
      setResult(response.data);
      if (response.data.valid) {
        toast.success('Valid ticket!');
      } else {
        toast.error('Invalid ticket');
      }
    } catch (error: any) {
      console.error('Error verifying ticket:', error);
      toast.error(error.response?.data?.message || 'Failed to verify ticket');
      setResult({ valid: false });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Verify Ticket</h1>
        <p className="text-muted-foreground">Enter ticket ID to verify registration</p>
      </div>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleVerify} className="space-y-4">
            <div className="relative">
              <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Enter ticket ID (e.g., TCK-ABC123-XYZ)"
                value={ticketId}
                onChange={(e) => setTicketId(e.target.value)}
                className="pl-12 text-lg"
              />
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={verifying}>
              {verifying ? (
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
              ) : (
                <Search className="h-5 w-5 mr-2" />
              )}
              Verify Ticket
            </Button>
          </form>
        </CardContent>
      </Card>

      {result && (
        <Card className={result.valid ? 'border-green-500' : 'border-red-500'}>
          <CardContent className="p-6">
            {result.valid ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-8 w-8" />
                  <span className="text-xl font-semibold">Valid Ticket</span>
                </div>
                
                {result.registration && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Attendee</p>
                        <p className="font-semibold">{result.registration.attendee?.name}</p>
                        <p className="text-sm">{result.registration.attendee?.rollNo}</p>
                        <p className="text-sm text-muted-foreground">
                          {result.registration.attendee?.department}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Event</p>
                        <p className="font-semibold">{result.registration.event?.title}</p>
                        <p className="text-sm">{result.registration.event?.venue}</p>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Badge variant="default">Confirmed</Badge>
                      {result.registration.attended && (
                        <Badge className="bg-green-500">Already Attended</Badge>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-red-600">
                <XCircle className="h-8 w-8" />
                <span className="text-xl font-semibold">Invalid Ticket</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
