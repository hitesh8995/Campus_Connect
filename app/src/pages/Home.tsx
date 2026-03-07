import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, Users, ArrowRight, Sparkles } from 'lucide-react';
import { eventsAPI, clubsAPI } from '../services/api';
import type { Event, Club } from '../types';
import { format } from 'date-fns';

export default function Home() {
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [eventsRes, clubsRes] = await Promise.all([
          eventsAPI.getEvents({ upcoming: 'true', limit: 6 }),
          clubsAPI.getClubs()
        ]);

        setUpcomingEvents(eventsRes.data.events || []);
        setClubs(clubsRes.data.clubs?.slice(0, 6) || []);
      } catch (error) {
        console.error('Error fetching home data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary via-primary/90 to-primary/80 text-primary-foreground py-20 lg:py-32">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=1920&q=80')] bg-cover bg-center opacity-10" />
        <div className="container mx-auto px-4 relative">
          <div className="max-w-3xl mx-auto text-center">
            <Badge variant="secondary" className="mb-4 text-sm">
              <Sparkles className="h-3 w-3 mr-1" />
              Welcome to CAMPUS-CONNECT
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Discover Amazing Events at Your Campus
            </h1>
            <p className="text-lg md:text-xl mb-8 opacity-90">
              Explore clubs, register for events, and connect with fellow students.
              Your gateway to campus life and opportunities.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" variant="secondary" asChild>
                <Link to="/events">
                  Explore Events
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="border-white/30 hover:bg-white/10" asChild>
                <Link to="/clubs">View Clubs</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-primary">50+</div>
              <div className="text-sm text-muted-foreground">Active Clubs</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-primary">200+</div>
              <div className="text-sm text-muted-foreground">Events Per Year</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-primary">5000+</div>
              <div className="text-sm text-muted-foreground">Students</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-primary">10000+</div>
              <div className="text-sm text-muted-foreground">Registrations</div>
            </div>
          </div>
        </div>
      </section>

      {/* Upcoming Events Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold">Upcoming Events</h2>
              <p className="text-muted-foreground mt-1">Don't miss out on these exciting events</p>
            </div>
            <Button variant="outline" asChild>
              <Link to="/events">View All</Link>
            </Button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <div className="h-48 bg-muted rounded-t-lg" />
                  <CardContent className="p-4 space-y-3">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : upcomingEvents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingEvents.map((event) => (
                <Link key={event.id} to={`/events/${event.id}`}>
                  <Card className="h-full hover:shadow-lg transition-shadow overflow-hidden group">
                    <div className="h-48 bg-muted relative overflow-hidden">
                      {event.bannerImage ? (
                        <img
                          src={event.bannerImage}
                          alt={event.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                          <Calendar className="h-12 w-12 text-primary/40" />
                        </div>
                      )}
                      <div className="absolute top-2 right-2">
                        <Badge variant={event.isPaid ? 'default' : 'secondary'}>
                          {event.isPaid ? `₹${event.price}` : 'Free'}
                        </Badge>
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <Badge variant="outline" className="mb-2">
                        {event.category}
                      </Badge>
                      <h3 className="font-semibold text-lg mb-2 line-clamp-1">{event.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {event.shortDescription || event.description}
                      </p>
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center text-muted-foreground">
                          <Calendar className="h-4 w-4 mr-2" />
                          {format(new Date(event.eventDate), 'MMM d, yyyy')}
                        </div>
                        <div className="flex items-center text-muted-foreground">
                          <MapPin className="h-4 w-4 mr-2" />
                          {event.venue}
                        </div>
                        <div className="flex items-center text-muted-foreground">
                          <Users className="h-4 w-4 mr-2" />
                          {event.registeredCount} / {event.maxCapacity || '∞'} registered
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No upcoming events</h3>
              <p className="text-muted-foreground">Check back later for new events</p>
            </div>
          )}
        </div>
      </section>

      {/* Clubs Section */}
      <section className="py-16 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold">Our Clubs</h2>
              <p className="text-muted-foreground mt-1">Join clubs and explore your interests</p>
            </div>
            <Button variant="outline" asChild>
              <Link to="/clubs">View All</Link>
            </Button>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
          ) : clubs.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {clubs.map((club) => (
                <Link key={club.id} to={`/clubs/${club.id}`}>
                  <Card className="h-full hover:shadow-lg transition-shadow">
                    <CardContent className="p-4 text-center">
                      <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center">
                        {club.logo ? (
                          <img src={club.logo} alt={club.name} className="w-10 h-10 object-contain" />
                        ) : (
                          <span className="text-xl font-bold text-primary">
                            {club.name.charAt(0)}
                          </span>
                        )}
                      </div>
                      <h3 className="font-medium text-sm line-clamp-1">{club.name}</h3>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No clubs found</h3>
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <Card className="bg-primary text-primary-foreground">
            <CardContent className="p-8 md:p-12 text-center">
              <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
              <p className="text-lg opacity-90 mb-6 max-w-2xl mx-auto">
                Create an account to register for events, join clubs, and stay updated with campus activities.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" variant="secondary" asChild>
                  <Link to="/signup/student">Sign Up as Student</Link>
                </Button>
                <Button size="lg" variant="outline" className="border-white/30 hover:bg-white/10" asChild>
                  <Link to="/signup/faculty">Sign Up as Faculty</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
