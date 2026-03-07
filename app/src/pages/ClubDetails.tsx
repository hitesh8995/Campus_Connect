import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Building2,
  Users,
  Calendar,
  ArrowLeft,
  Mail,
  Star,
  Globe,
  Instagram,
  Linkedin,
  Twitter
} from 'lucide-react';
import { clubsAPI } from '../services/api';
import type { Club, Event } from '../types';
import { format } from 'date-fns';

export default function ClubDetails() {
  const { clubId } = useParams<{ clubId: string }>();
  const [club, setClub] = useState<Club | null>(null);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [pastEvents, setPastEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (clubId) {
      fetchClubDetails();
    }
  }, [clubId]);

  const fetchClubDetails = async () => {
    try {
      setLoading(true);
      const response = await clubsAPI.getClub(clubId!);
      setClub(response.data.club);
      setUpcomingEvents(response.data.upcomingEvents || []);
      setPastEvents(response.data.pastEvents || []);
    } catch (error) {
      console.error('Error fetching club details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!club) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Club Not Found</h2>
          <p className="text-muted-foreground mb-4">The club you're looking for doesn't exist.</p>
          <Button asChild>
            <Link to="/clubs">Back to Clubs</Link>
          </Button>
        </div>
      </div>
    );
  }

  const faculty = typeof club.assignedFaculty === 'object' ? club.assignedFaculty : null;
  const coordinators = Array.isArray(club.coordinators) 
    ? club.coordinators.filter(c => typeof c === 'object')
    : [];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-muted/50 border-b">
        <div className="container mx-auto px-4 py-8">
          <Button variant="outline" className="mb-4" asChild>
            <Link to="/clubs">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Clubs
            </Link>
          </Button>

          <div className="flex flex-col md:flex-row items-start gap-6">
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              {club.logo ? (
                <img
                  src={club.logo}
                  alt={club.name}
                  className="w-20 h-20 md:w-24 md:h-24 object-contain"
                />
              ) : (
                <Building2 className="h-12 w-12 md:h-16 md:w-16 text-primary" />
              )}
            </div>
            <div className="flex-1">
              <h1 className="text-3xl md:text-4xl font-bold mb-2">{club.name}</h1>
              <p className="text-muted-foreground max-w-2xl">{club.description}</p>
              
              {/* Social Links */}
              {club.socialLinks && (
                <div className="flex gap-2 mt-4">
                  {club.socialLinks.website && (
                    <a
                      href={club.socialLinks.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-full bg-muted hover:bg-muted/80 transition-colors"
                    >
                      <Globe className="h-4 w-4" />
                    </a>
                  )}
                  {club.socialLinks.instagram && (
                    <a
                      href={club.socialLinks.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-full bg-muted hover:bg-muted/80 transition-colors"
                    >
                      <Instagram className="h-4 w-4" />
                    </a>
                  )}
                  {club.socialLinks.linkedin && (
                    <a
                      href={club.socialLinks.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-full bg-muted hover:bg-muted/80 transition-colors"
                    >
                      <Linkedin className="h-4 w-4" />
                    </a>
                  )}
                  {club.socialLinks.twitter && (
                    <a
                      href={club.socialLinks.twitter}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-full bg-muted hover:bg-muted/80 transition-colors"
                    >
                      <Twitter className="h-4 w-4" />
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="events">
          <TabsList className="mb-6">
            <TabsTrigger value="events">Events</TabsTrigger>
            <TabsTrigger value="team">Team</TabsTrigger>
          </TabsList>

          <TabsContent value="events">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Upcoming Events */}
              <div>
                <h2 className="text-xl font-semibold mb-4">Upcoming Events</h2>
                {upcomingEvents.length > 0 ? (
                  <div className="space-y-4">
                    {upcomingEvents.map((event) => (
                      <Link key={event.id} to={`/events/${event.id}`}>
                        <Card className="hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex gap-4">
                              <div className="w-20 h-20 bg-muted rounded-lg flex-shrink-0 overflow-hidden">
                                {event.bannerImage ? (
                                  <img
                                    src={event.bannerImage}
                                    alt={event.title}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <Calendar className="h-8 w-8 text-muted-foreground" />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold line-clamp-1">{event.title}</h3>
                                <p className="text-sm text-muted-foreground line-clamp-1 mb-1">
                                  {event.shortDescription || event.description}
                                </p>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                  <span>{format(new Date(event.eventDate), 'MMM d, yyyy')}</span>
                                  <Badge variant={event.isPaid ? 'default' : 'secondary'}>
                                    {event.isPaid ? `₹${event.price}` : 'Free'}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">No upcoming events</p>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Past Events */}
              <div>
                <h2 className="text-xl font-semibold mb-4">Past Events</h2>
                {pastEvents.length > 0 ? (
                  <div className="space-y-4">
                    {pastEvents.map((event) => (
                      <Link key={event.id} to={`/events/${event.id}`}>
                        <Card className="hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex gap-4">
                              <div className="w-20 h-20 bg-muted rounded-lg flex-shrink-0 overflow-hidden">
                                {event.bannerImage ? (
                                  <img
                                    src={event.bannerImage}
                                    alt={event.title}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <Calendar className="h-8 w-8 text-muted-foreground" />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold line-clamp-1">{event.title}</h3>
                                <p className="text-sm text-muted-foreground line-clamp-1 mb-1">
                                  {event.shortDescription || event.description}
                                </p>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                  <span>{format(new Date(event.eventDate), 'MMM d, yyyy')}</span>
                                  {event.averageRating > 0 && (
                                    <div className="flex items-center">
                                      <Star className="h-4 w-4 text-yellow-400 fill-yellow-400 mr-1" />
                                      {event.averageRating.toFixed(1)}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">No past events</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="team">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Faculty Advisor */}
              {faculty && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Faculty Advisor</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-xl font-bold text-primary">
                          {faculty.name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-semibold">{faculty.name}</h3>
                        <p className="text-sm text-muted-foreground">{faculty.designation}</p>
                        <p className="text-sm text-muted-foreground">{faculty.department}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Coordinators */}
              {coordinators.length > 0 && (
                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-lg">Student Coordinators</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {coordinators.map((coordinator: any) => (
                        <div key={coordinator._id} className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                            <span className="font-medium">
                              {coordinator.name.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <h4 className="font-medium">{coordinator.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {coordinator.rollNo}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {coordinator.department}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
