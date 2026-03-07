import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { adminAPI, usersAPI } from '../../services/api';
import type { Club, User } from '../../types';
import { Plus, Building2, Users, Loader2, UserPlus, X } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

export default function ManageClubs() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [faculty, setFaculty] = useState<User[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creating, setCreating] = useState(false);

  // Coordinator assignment state
  const [showCoordinatorDialog, setShowCoordinatorDialog] = useState(false);
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [assigning, setAssigning] = useState(false);

  // Faculty assignment state
  const [showFacultyDialog, setShowFacultyDialog] = useState(false);
  const [selectedFaculty, setSelectedFaculty] = useState<string>('');
  const [assigningFaculty, setAssigningFaculty] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    facultyId: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [clubsRes, facultyRes, studentsRes] = await Promise.all([
        adminAPI.getClubs(),
        usersAPI.getFaculty(),
        usersAPI.getStudents({ status: 'approved' })
      ]);
      setClubs(clubsRes.data.clubs || []);
      setFaculty(facultyRes.data.faculty || []);
      setStudents(studentsRes.data.students || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const payload: any = { name: formData.name, description: formData.description };
      if (formData.facultyId) {
        payload.facultyId = formData.facultyId;
      }
      await adminAPI.createClub(payload);
      toast.success('Club created successfully');
      setShowCreateDialog(false);
      setFormData({ name: '', description: '', facultyId: '' });
      fetchData();
    } catch (error: any) {
      console.error('Error creating club:', error);
      toast.error(error.response?.data?.errors?.[0]?.msg || error.response?.data?.message || 'Failed to create club');
    } finally {
      setCreating(false);
    }
  };

  const handleAssignCoordinators = async () => {
    if (!selectedClub || selectedStudents.length === 0) {
      toast.error('Please select at least one student');
      return;
    }

    setAssigning(true);
    try {
      const clubId = (selectedClub as any)._id || selectedClub.id;
      await adminAPI.assignCoordinators(clubId, selectedStudents);
      toast.success(`${selectedStudents.length} coordinator(s) assigned successfully`);
      setShowCoordinatorDialog(false);
      setSelectedClub(null);
      setSelectedStudents([]);
      fetchData();
    } catch (error: any) {
      console.error('Error assigning coordinators:', error);
      toast.error(error.response?.data?.message || 'Failed to assign coordinators');
    } finally {
      setAssigning(false);
    }
  };

  const handleAssignFaculty = async () => {
    if (!selectedClub || !selectedFaculty) {
      toast.error('Please select a faculty member');
      return;
    }

    setAssigningFaculty(true);
    try {
      const clubId = (selectedClub as any)._id || selectedClub.id;
      await adminAPI.updateClub(clubId, { facultyId: selectedFaculty });
      toast.success('Faculty assigned successfully');
      setShowFacultyDialog(false);
      setSelectedClub(null);
      setSelectedFaculty('');
      fetchData();
    } catch (error: any) {
      console.error('Error assigning faculty:', error);
      toast.error(error.response?.data?.message || 'Failed to assign faculty');
    } finally {
      setAssigningFaculty(false);
    }
  };

  const handleRemoveFaculty = async (club: Club) => {
    const facultyName = club.assignedFaculty && typeof club.assignedFaculty === 'object'
      ? (club.assignedFaculty as any).name
      : 'this faculty';
    if (!confirm(`Remove ${facultyName} as faculty advisor from ${club.name}?`)) {
      return;
    }
    try {
      const clubId = (club as any)._id || club.id;
      await adminAPI.removeFaculty(clubId);
      toast.success('Faculty removed from club successfully');
      fetchData();
    } catch (error: any) {
      console.error('Error removing faculty:', error);
      toast.error(error.response?.data?.message || 'Failed to remove faculty');
    }
  };

  const handleRemoveCoordinator = async (club: Club, coordinatorId: string, coordinatorName: string) => {
    if (!confirm(`Remove ${coordinatorName} as coordinator from ${club.name}?`)) {
      return;
    }

    try {
      const clubId = (club as any)._id || club.id;
      await adminAPI.removeCoordinator(clubId, coordinatorId);
      toast.success('Coordinator removed successfully');
      fetchData();
    } catch (error: any) {
      console.error('Error removing coordinator:', error);
      toast.error(error.response?.data?.message || 'Failed to remove coordinator');
    }
  };

  const openCoordinatorDialog = (club: Club) => {
    setSelectedClub(club);
    setSelectedStudents([]);
    setShowCoordinatorDialog(true);
  };

  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudents(prev =>
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const openFacultyDialog = (club: Club) => {
    setSelectedClub(club);
    // Pre-select current faculty if changing
    const currentFacultyId = club.assignedFaculty && typeof club.assignedFaculty === 'object'
      ? (club.assignedFaculty as any)._id || (club.assignedFaculty as any).id
      : club.assignedFaculty || '';
    setSelectedFaculty(currentFacultyId as string);
    setShowFacultyDialog(true);
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Manage Clubs</h1>
          <p className="text-muted-foreground">Create and manage college clubs</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Club
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {clubs.map((club) => (
          <Card key={club.id}>
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">{club.name}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">{club.description}</p>
                  <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                    <span className="flex items-center">
                      <Users className="h-4 w-4 mr-1" />
                      {club.coordinators?.length || 0} coordinators
                    </span>
                  </div>
                  {club.assignedFaculty && typeof club.assignedFaculty === 'object' && (
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-sm">
                        <span className="text-muted-foreground">Faculty:</span> {(club.assignedFaculty as any).name}
                      </p>
                      <button
                        onClick={() => handleRemoveFaculty(club)}
                        className="text-destructive hover:text-destructive/80 ml-2"
                        title="Remove faculty"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                  {!club.assignedFaculty && (
                    <p className="text-sm mt-2 text-muted-foreground">
                      No faculty assigned
                    </p>
                  )}

                  {/* Current Coordinators */}
                  {club.coordinators && club.coordinators.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-semibold text-muted-foreground mb-2">Coordinators:</p>
                      <div className="space-y-1">
                        {club.coordinators.map((coord: any) => {
                          const coordId = coord._id || coord.id || coord;
                          const coordName = coord.name || 'Unknown';
                          return (
                            <div key={coordId} className="flex items-center justify-between text-xs bg-muted/50 px-2 py-1 rounded">
                              <span>{coordName}</span>
                              <button
                                onClick={() => handleRemoveCoordinator(club, coordId, coordName)}
                                className="text-destructive hover:text-destructive/80"
                                title="Remove coordinator"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => openCoordinatorDialog(club)}
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Assign Coordinators
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => openFacultyDialog(club)}
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      {club.assignedFaculty ? 'Change Faculty' : 'Assign Faculty'}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create Club Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Club</DialogTitle>
            <DialogDescription>
              Add a new club to the college
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Club Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Coding Club"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the club..."
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="faculty">Faculty Advisor (Optional)</Label>
                <select
                  id="faculty"
                  value={formData.facultyId}
                  onChange={(e) => setFormData({ ...formData, facultyId: e.target.value })}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="">Select Faculty</option>
                  {(() => {
                    // Build map of truly assigned faculty from clubs (source of truth)
                    const assignedFacultyMap: Record<string, Club> = {};
                    clubs.forEach((c) => {
                      if (c.assignedFaculty && typeof c.assignedFaculty === 'object') {
                        const fId = (c.assignedFaculty as any)._id || (c.assignedFaculty as any).id;
                        if (fId) assignedFacultyMap[fId] = c;
                      }
                    });
                    return faculty.map((f) => {
                      const fId = (f as any)._id || f.id;
                      const assignedClub = assignedFacultyMap[fId];
                      const isAssignedElsewhere = !!assignedClub;
                      return (
                        <option key={fId} value={fId} disabled={isAssignedElsewhere}>
                          {f.name} - {f.department}{isAssignedElsewhere ? ` (Assigned to: ${assignedClub.name})` : ''}
                        </option>
                      );
                    });
                  })()}
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={creating}>
                {creating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Create Club
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Assign Coordinators Dialog */}
      <Dialog open={showCoordinatorDialog} onOpenChange={setShowCoordinatorDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Assign Coordinators to {selectedClub?.name}</DialogTitle>
            <DialogDescription>
              Select approved students to assign as coordinators for this club
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

      {/* Assign Faculty Dialog */}
      <Dialog open={showFacultyDialog} onOpenChange={setShowFacultyDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Assign Faculty to {selectedClub?.name}</DialogTitle>
            <DialogDescription>
              Select an approved faculty member to assign as advisor for this club
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {faculty.length > 0 ? (
              <div className="space-y-2">
                {(() => {
                  // Build map of truly assigned faculty from clubs (source of truth)
                  const assignedFacultyMap: Record<string, Club> = {};
                  clubs.forEach((c) => {
                    if (c.assignedFaculty && typeof c.assignedFaculty === 'object') {
                      const fId = (c.assignedFaculty as any)._id || (c.assignedFaculty as any).id;
                      if (fId) assignedFacultyMap[fId] = c;
                    }
                  });
                  const currentFacultyId = selectedClub?.assignedFaculty && typeof selectedClub.assignedFaculty === 'object'
                    ? (selectedClub.assignedFaculty as any)._id || (selectedClub.assignedFaculty as any).id
                    : selectedClub?.assignedFaculty;
                  return faculty.map((f) => {
                    const facultyId = (f as any)._id || f.id;
                    const isCurrentFaculty = facultyId === currentFacultyId;
                    const assignedClub = !isCurrentFaculty ? assignedFacultyMap[facultyId] : undefined;
                    const isAssignedElsewhere = !!assignedClub;
                    return (
                      <div
                        key={facultyId}
                        className={`flex items-center space-x-3 p-3 border rounded-lg ${isAssignedElsewhere
                            ? 'opacity-50 cursor-not-allowed bg-muted/30'
                            : 'hover:bg-accent cursor-pointer'
                          } ${selectedFaculty === facultyId ? 'bg-accent border-primary' : ''}`}
                        onClick={() => !isAssignedElsewhere && setSelectedFaculty(facultyId)}
                      >
                        <input
                          type="radio"
                          checked={selectedFaculty === facultyId}
                          onChange={() => !isAssignedElsewhere && setSelectedFaculty(facultyId)}
                          disabled={isAssignedElsewhere}
                          className="h-4 w-4"
                        />
                        <div className="flex-1">
                          <p className="font-medium">{f.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {f.department} • {f.email}
                          </p>
                          {isAssignedElsewhere && (
                            <p className="text-xs text-amber-600 font-medium mt-0.5">
                              Already assigned to: {assignedClub!.name} — remove them first
                            </p>
                          )}
                          {isCurrentFaculty && (
                            <p className="text-xs text-green-600 font-medium mt-0.5">Current faculty</p>
                          )}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No approved faculty available
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowFacultyDialog(false);
                setSelectedFaculty('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAssignFaculty}
              disabled={assigningFaculty || !selectedFaculty}
            >
              {assigningFaculty && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Assign Faculty
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
