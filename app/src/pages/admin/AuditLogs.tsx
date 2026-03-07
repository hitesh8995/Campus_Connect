import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { adminAPI } from '../../services/api';
import type { AuditLog } from '../../types';
import { Loader2, User, Calendar, Building2, FileText } from 'lucide-react';
import { format } from 'date-fns';

const actionIcons: Record<string, React.ElementType> = {
  USER_REGISTERED: User,
  USER_APPROVED: User,
  EVENT_CREATED: Calendar,
  EVENT_APPROVED: Calendar,
  CLUB_CREATED: Building2,
  default: FileText
};

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getAuditLogs({ limit: 50 });
      setLogs(response.data.logs || []);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (action: string) => {
    const Icon = actionIcons[action] || actionIcons.default;
    return <Icon className="h-4 w-4" />;
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
        <h1 className="text-3xl font-bold">Audit Logs</h1>
        <p className="text-muted-foreground">Track all system activities</p>
      </div>

      <div className="space-y-2">
        {logs.length > 0 ? (
          logs.map((log) => {
            const logId = (log as any)._id || log.id;
            return (
              <Card key={logId}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      {getIcon(log.action)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{log.action}</span>
                        <span className="text-muted-foreground">by</span>
                        <span className="font-medium">
                          {typeof log.performedBy === 'object'
                            ? log.performedBy.name
                            : 'Unknown'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          ({log.performedByRole})
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {log.timestamp
                          ? format(new Date(log.timestamp), 'MMM d, yyyy h:mm a')
                          : 'Unknown date'}
                      </p>
                      {log.details && Object.keys(log.details).length > 0 && (
                        <div className="mt-2 p-2 bg-muted rounded text-sm">
                          <pre className="whitespace-pre-wrap">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No audit logs yet</h3>
              <p className="text-muted-foreground">System activities will appear here</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
