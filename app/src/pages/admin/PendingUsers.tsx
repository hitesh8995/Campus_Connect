import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import type { User } from '../../types';
import {
  CheckCircle,
  XCircle,
  Loader2,
  User as UserIcon,
  Mail,
  Building2,
  GraduationCap,
} from 'lucide-react';
import { toast } from 'sonner';

export default function PendingUsers() {
  const [students, setStudents] = useState<User[]>([]);
  const [faculty, setFaculty] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  useEffect(() => {
    fetchPendingUsers();
  }, []);

  const fetchPendingUsers = async () => {
    try {
      setLoading(true);
      const [studentsRes, facultyRes] = await Promise.all([
        adminAPI.getPendingUsers({ role: 'student' }),
        adminAPI.getPendingUsers({ role: 'faculty' }),
      ]);
      setStudents(studentsRes.data.users || []);
      setFaculty(facultyRes.data.users || []);
    } catch (error) {
      console.error('Error fetching pending users:', error);
      toast.error('Failed to load pending users');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId: string) => {
    setProcessing(userId);
    try {
      await adminAPI.approveUser(userId, 'approved');
      toast.success('User approved successfully');
      fetchPendingUsers();
    } catch (error) {
      console.error('Error approving user:', error);
      toast.error('Failed to approve user');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async () => {
    if (!selectedUser) return;

    const userId = (selectedUser as any)._id || selectedUser.id;
    setProcessing(userId);
    try {
      await adminAPI.approveUser(
        userId,
        'rejected',
        rejectionReason
      );
      toast.success('User rejected');
      setShowRejectDialog(false);
      setRejectionReason('');
      setSelectedUser(null);
      fetchPendingUsers();
    } catch (error) {
      console.error('Error rejecting user:', error);
      toast.error('Failed to reject user');
    } finally {
      setProcessing(null);
    }
  };

  const openRejectDialog = (user: User) => {
    setSelectedUser(user);
    setShowRejectDialog(true);
  };

  const UserCard = ({ user }: { user: User }) => {
    const userId = (user as any)._id || user.id;
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <UserIcon className="h-6 w-6 text-primary" />
              </div>

              <div>
                <h3 className="font-semibold">{user.name}</h3>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-3 w-3" />
                  {user.email}
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                  <Building2 className="h-3 w-3" />
                  {user.department}
                </div>

                {user.rollNo && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                    <GraduationCap className="h-3 w-3" />
                    {user.rollNo}
                  </div>
                )}

                {user.facultyId && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                    <GraduationCap className="h-3 w-3" />
                    {user.facultyId} - {user.designation}
                  </div>
                )}

                <Badge variant="outline" className="mt-2">
                  {user.role}
                </Badge>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="text-green-600 border-green-600 hover:bg-green-50"
                onClick={() => handleApprove(userId)}
                disabled={processing === userId}
              >
                {processing === userId ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
              </Button>

              <Button
                size="sm"
                variant="outline"
                className="text-red-600 border-red-600 hover:bg-red-50"
                onClick={() => openRejectDialog(user)}
                disabled={processing === userId}
              >
                <XCircle className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
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
        <h1 className="text-3xl font-bold">Pending Approvals</h1>
        <p className="text-muted-foreground">
          Review and approve new user registrations
        </p>
      </div>

      <Tabs defaultValue="students">
        <TabsList>
          <TabsTrigger value="students">
            Students ({students.length})
          </TabsTrigger>
          <TabsTrigger value="faculty">
            Faculty ({faculty.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="students" className="space-y-4">
          {students.length > 0 ? (
            students.map((student) => (
              <UserCard key={student.id} user={student} />
            ))
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                <h3 className="text-lg font-medium">No pending students</h3>
                <p className="text-muted-foreground">
                  All student registrations have been processed
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="faculty" className="space-y-4">
          {faculty.length > 0 ? (
            faculty.map((f) => (
              <UserCard key={f.id} user={f} />
            ))
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                <h3 className="text-lg font-medium">No pending faculty</h3>
                <p className="text-muted-foreground">
                  All faculty registrations have been processed
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject User</DialogTitle>
            <DialogDescription>
              Are you sure you want to reject {selectedUser?.name}?
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
            <Button
              variant="outline"
              onClick={() => setShowRejectDialog(false)}
            >
              Cancel
            </Button>

            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!!processing}
            >
              {processing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
