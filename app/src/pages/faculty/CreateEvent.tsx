import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { eventsAPI } from '../../services/api';
import { Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

const categories = [
  'Technical',
  'Cultural',
  'Sports',
  'Workshop',
  'Seminar',
  'Hackathon',
  'Other'
];

export default function CreateEvent() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [isPaid, setIsPaid] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    shortDescription: '',
    eventDate: '',
    eventEndDate: '',
    venue: '',
    registrationStart: '',
    registrationEnd: '',
    category: '',
    price: 0,
    maxCapacity: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data: any = {
        title: formData.title,
        description: formData.description,
        eventDate: formData.eventDate,
        venue: formData.venue,
        registrationStart: formData.registrationStart,
        registrationEnd: formData.registrationEnd,
        isPaid,
        price: isPaid ? Number(formData.price) : 0,
      };

      // Only include optional fields if they have values
      if (formData.shortDescription) data.shortDescription = formData.shortDescription;
      if (formData.eventEndDate) data.eventEndDate = formData.eventEndDate;
      if (formData.category) data.category = formData.category;
      if (formData.maxCapacity) data.maxCapacity = parseInt(formData.maxCapacity);

      await eventsAPI.createEvent(data);
      toast.success('Event created successfully! Pending admin approval.');
      navigate('/faculty/events');
    } catch (error: any) {
      console.error('Error creating event:', error);
      toast.error(error.response?.data?.errors?.[0]?.msg || error.response?.data?.message || 'Failed to create event');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate('/faculty/dashboard')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Create Event</h1>
          <p className="text-muted-foreground">Submit a new event for approval</p>
        </div>
      </div>

      <Card className="max-w-2xl">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Event Title *</Label>
              <Input
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g., Annual Tech Fest"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="shortDescription">Short Description</Label>
              <Input
                id="shortDescription"
                name="shortDescription"
                value={formData.shortDescription}
                onChange={handleChange}
                placeholder="Brief description (shown in listings)"
                maxLength={200}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Full Description *</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Detailed description of the event"
                rows={5}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="venue">Venue *</Label>
                <Input
                  id="venue"
                  name="venue"
                  value={formData.venue}
                  onChange={handleChange}
                  placeholder="e.g., Main Auditorium"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="eventDate">Event Date & Time *</Label>
                <Input
                  id="eventDate"
                  name="eventDate"
                  type="datetime-local"
                  value={formData.eventDate}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="eventEndDate">End Date & Time (Optional)</Label>
                <Input
                  id="eventEndDate"
                  name="eventEndDate"
                  type="datetime-local"
                  value={formData.eventEndDate}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="registrationStart">Registration Opens *</Label>
                <Input
                  id="registrationStart"
                  name="registrationStart"
                  type="datetime-local"
                  value={formData.registrationStart}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="registrationEnd">Registration Closes *</Label>
                <Input
                  id="registrationEnd"
                  name="registrationEnd"
                  type="datetime-local"
                  value={formData.registrationEnd}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxCapacity">Maximum Capacity (Optional)</Label>
              <Input
                id="maxCapacity"
                name="maxCapacity"
                type="number"
                value={formData.maxCapacity}
                onChange={handleChange}
                placeholder="Leave empty for unlimited"
                min={1}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="isPaid"
                checked={isPaid}
                onCheckedChange={setIsPaid}
              />
              <Label htmlFor="isPaid">This is a paid event</Label>
            </div>

            {isPaid && (
              <div className="space-y-2">
                <Label htmlFor="price">Price (₹) *</Label>
                <Input
                  id="price"
                  name="price"
                  type="number"
                  value={formData.price}
                  onChange={handleChange}
                  placeholder="e.g., 100"
                  min={1}
                  required={isPaid}
                />
              </div>
            )}

            <div className="flex gap-4">
              <Button type="button" variant="outline" onClick={() => navigate('/faculty/dashboard')}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Event
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
