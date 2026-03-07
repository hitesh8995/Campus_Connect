import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { facultyAPI, usersAPI, clubsAPI } from '../../services/api';
import type { Club, User } from '../../types';
import { Users, Loader2, UserPlus, Building2, X } from 'lucide-react';
import { toast } from 'sonner';

export default function ManageClub() {
    const [club, setClub] = useState<Club | null>(null);
    const [students, setStudents] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    // Coordinator assignment state
    const [showCoordinatorDialog, setShowCoordinatorDialog] = useState(false);
    const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
    const [assigning, setAssigning] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const user = JSON.parse(localStorage.getItem('user') || '{}');

            if (!user.clubId) {
                toast.error('You are not assigned to any club');
                setLoading(false);
                return;
            }

            // Extract the actual ID string if clubId is an object
            const clubId = typeof user.clubId === 'object'
                ? (user.clubId._id || user.clubId.id || user.clubId)
                : user.clubId;

            const [clubRes, studentsRes] = await Promise.all([
                clubsAPI.getClub(clubId),
                usersAPI.getStudents({ status: 'approved' })
            ]);

            // The API returns {club, upcomingEvents, pastEvents}, so extract the club object
            setClub(clubRes.data.club || clubRes.data);
            setStudents(studentsRes.data.students || []);
        } catch (error) {
            console.error('Error fetching data:', error);
            toast.error('Failed to load club data');
        } finally {
            setLoading(false);
        }
    };

    const handleAssignCoordinators = async () => {
        if (!club || selectedStudents.length === 0) {
            toast.error('Please select at least one student');
            return;
        }

        setAssigning(true);
        try {
            const clubId = (club as any)._id || club.id;
            await facultyAPI.assignCoordinators(clubId, selectedStudents);
            toast.success(`${selectedStudents.length} coordinator(s) assigned successfully`);
            setShowCoordinatorDialog(false);
            setSelectedStudents([]);
            fetchData();
        } catch (error: any) {
            console.error('Error assigning coordinators:', error);
            toast.error(error.response?.data?.message || 'Failed to assign coordinators');
        } finally {
            setAssigning(false);
        }
    };

    const toggleStudentSelection = (studentId: string) => {
        setSelectedStudents(prev =>
            prev.includes(studentId)
                ? prev.filter(id => id !== studentId)
                : [...prev, studentId]
        );
    };

    const handleRemoveCoordinator = async (coordinatorId: string, coordinatorName: string) => {
        if (!club) return;

        if (!confirm(`Remove ${coordinatorName} as coordinator from ${club.name}?`)) {
            return;
        }

        try {
            const clubId = (club as any)._id || club.id;
            await facultyAPI.removeCoordinator(clubId, coordinatorId);
            toast.success('Coordinator removed successfully');
            fetchData();
        } catch (error: any) {
            console.error('Error removing coordinator:', error);
            toast.error(error.response?.data?.message || 'Failed to remove coordinator');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!club) {
        return (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
                <Building2 className="h-12 w-12 text-muted-foreground" />
                <p className="text-lg text-muted-foreground">You are not assigned to any club</p>
                <p className="text-sm text-muted-foreground">Contact the admin to get assigned to a club</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Manage Your Club</h1>
                <p className="text-muted-foreground">Assign coordinators and manage your club</p>
            </div>

            <Card>
                <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                            <Building2 className="h-8 w-8 text-primary" />
                        </div>
                        <div className="flex-1">
                            <h2 className="text-2xl font-semibold">{club.name}</h2>
                            <p className="text-muted-foreground mt-2">{club.description}</p>
                            <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                                <span className="flex items-center">
                                    <Users className="h-4 w-4 mr-1" />
                                    {club.coordinators?.length || 0} coordinators
                                </span>
                            </div>
                            <Button
                                className="mt-4"
                                onClick={() => setShowCoordinatorDialog(true)}
                            >
                                <UserPlus className="h-4 w-4 mr-2" />
                                Assign Coordinators
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Current Coordinators */}
            {club.coordinators && club.coordinators.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Current Coordinators</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {club.coordinators.map((coordinator: any) => (
                                <div
                                    key={coordinator._id || coordinator.id}
                                    className="flex items-center justify-between p-3 border rounded-lg"
                                >
                                    <div className="flex-1">
                                        <p className="font-medium">{coordinator.name}</p>
                                        {coordinator.rollNo && coordinator.department && (
                                            <p className="text-sm text-muted-foreground">
                                                {coordinator.rollNo} • {coordinator.department}
                                            </p>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => handleRemoveCoordinator(
                                            coordinator._id || coordinator.id,
                                            coordinator.name
                                        )}
                                        className="text-destructive hover:text-destructive/80 p-1"
                                        title="Remove coordinator"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Assign Coordinators Dialog */}
            <Dialog open={showCoordinatorDialog} onOpenChange={setShowCoordinatorDialog}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Assign Coordinators to {club.name}</DialogTitle>
                        <DialogDescription>
                            Select approved students to assign as coordinators for your club
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        {students.length > 0 ? (
                            <div className="space-y-2">
                                {students.map((student) => {
                                    const studentId = (student as any)._id || student.id;
                                    return (
                                        <div
                                            key={studentId}
                                            className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-accent cursor-pointer"
                                            onClick={() => toggleStudentSelection(studentId)}
                                        >
                                            <Checkbox
                                                checked={selectedStudents.includes(studentId)}
                                                onCheckedChange={() => toggleStudentSelection(studentId)}
                                            />
                                            <div className="flex-1">
                                                <p className="font-medium">{student.name}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    {student.rollNo} • {student.department}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="text-center text-muted-foreground py-8">
                                No approved students available
                            </p>
                        )}
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowCoordinatorDialog(false);
                                setSelectedStudents([]);
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleAssignCoordinators}
                            disabled={assigning || selectedStudents.length === 0}
                        >
                            {assigning && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                            Assign {selectedStudents.length > 0 ? `(${selectedStudents.length})` : ''}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
