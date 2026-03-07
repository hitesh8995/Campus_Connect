import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Calendar,
  MapPin,
  Clock,
  Building2,
  ArrowLeft,
  Star,
  CheckCircle,
  XCircle,
  Loader2,
  Ticket
} from 'lucide-react';
import { eventsAPI, registrationsAPI, reviewsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import type { Event, Review } from '../types';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function EventDetails() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [event, setEvent] = useState<Event | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [userRating, setUserRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [userReview, setUserReview] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [canReview, setCanReview] = useState(false);
  const [registrationStatus, setRegistrationStatus] = useState<any>(null);
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);

  useEffect(() => {
    if (eventId) {
      fetchEventDetails();
    }
  }, [eventId]);

  const fetchEventDetails = async () => {
    try {
      setLoading(true);
      const response = await eventsAPI.getEvent(eventId!);
      setEvent(response.data.event);
      setReviews(response.data.reviews || []);
      setCanReview(response.data.canReview || false);
      setAlreadyReviewed(response.data.alreadyReviewed || false);
      setRegistrationStatus(response.data.registrationStatus);
    } catch (error) {
      console.error('Error fetching event details:', error);
      toast.error('Failed to load event details');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!isAuthenticated) {
      toast.error('Please login to register');
      navigate('/login');
      return;
    }

    if (user?.role !== 'student') {
      toast.error('Only students can register for events');
      return;
    }

    try {
      setRegistering(true);
      const response = await registrationsAPI.register(eventId!);

      if (response.data.payment) {
        // Paid event - show payment dialog
        setPaymentData(response.data.payment);
        setShowPaymentDialog(true);
      } else {
        // Free event - registration complete
        toast.success('Registration successful!');
        fetchEventDetails();
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      toast.error(error.response?.data?.message || 'Registration failed');
    } finally {
      setRegistering(false);
    }
  };

  const handlePayment = () => {
    if (!paymentData) return;

    const options = {
      key: paymentData.keyId,
      amount: paymentData.amount,
      currency: paymentData.currency,
      name: 'CAMPUS-CONNECT',
      description: event?.title,
      order_id: paymentData.orderId,
      handler: async (response: any) => {
        try {
          await registrationsAPI.verifyPayment({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature
          });

          toast.success('Payment successful! Registration confirmed.');
          setShowPaymentDialog(false);
          fetchEventDetails();
        } catch (error) {
          console.error('Payment verification error:', error);
          toast.error('Payment verification failed');
        }
      },
      prefill: {
        name: user?.name,
        email: user?.email
      },
      theme: {
        color: '#4F46E5'
      }
    };

    // @ts-ignore
    const razorpay = new window.Razorpay(options);
    razorpay.open();
  };

  const handleSubmitReview = async () => {
    if (!userRating) {
      toast.error('Please select a rating');
      return;
    }

    try {
      setSubmittingReview(true);
      await reviewsAPI.createReview(eventId!, {
        rating: userRating,
        comment: userReview
      });

      toast.success('Review submitted successfully!');
      setUserRating(0);
      setHoverRating(0);
      setUserReview('');
      setCanReview(false);
      setAlreadyReviewed(true);
      fetchEventDetails();
    } catch (error: any) {
      console.error('Review error:', error);
      toast.error(error.response?.data?.message || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Event Not Found</h2>
          <p className="text-muted-foreground mb-4">The event you're looking for doesn't exist.</p>
          <Button asChild>
            <Link to="/events">Back to Events</Link>
          </Button>
        </div>
      </div>
    );
  }

  const isEventPast = event.eventEndDate
    ? new Date(event.eventEndDate) < new Date()
    : new Date(event.eventDate) < new Date();
  const isEventStarted = new Date(event.eventDate) < new Date();
  const isRegistrationOpen = event.isRegistrationOpen && !isEventStarted;
  const isFull = event.isFull;

  return (
    <div className="min-h-screen bg-background">
      {/* Banner */}
      <div className="h-64 md:h-80 bg-muted relative">
        {event.bannerImage ? (
          <img
            src={event.bannerImage}
            alt={event.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
            <Calendar className="h-24 w-24 text-primary/40" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
      </div>

      <div className="container mx-auto px-4 -mt-16 relative">
        <Button variant="outline" className="mb-4" asChild>
          <Link to="/events">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Events
          </Link>
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                  <div>
                    <Badge className="mb-2">{event.category}</Badge>
                    <h1 className="text-3xl font-bold">{event.title}</h1>
                  </div>
                  <Badge variant={event.isPaid ? 'default' : 'secondary'} className="text-lg px-4 py-2">
                    {event.isPaid ? `₹${event.price}` : 'Free'}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="flex items-center">
                    <Calendar className="h-5 w-5 mr-2 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Date</p>
                      <p className="font-medium">{format(new Date(event.eventDate), 'MMM d, yyyy')}</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Clock className="h-5 w-5 mr-2 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Time</p>
                      <p className="font-medium">{format(new Date(event.eventDate), 'h:mm a')}</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <MapPin className="h-5 w-5 mr-2 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Venue</p>
                      <p className="font-medium">{event.venue}</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Building2 className="h-5 w-5 mr-2 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Club</p>
                      <p className="font-medium">
                        {typeof event.clubId === 'object' ? event.clubId.name : 'Unknown'}
                      </p>
                    </div>
                  </div>
                </div>

                <Tabs defaultValue="about">
                  <TabsList>
                    <TabsTrigger value="about">About</TabsTrigger>
                    <TabsTrigger value="reviews">
                      Reviews ({event.totalReviews})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="about" className="mt-4">
                    <div className="prose max-w-none">
                      <p className="whitespace-pre-wrap">{event.description}</p>
                    </div>

                    {event.tags && event.tags.length > 0 && (
                      <div className="mt-6">
                        <p className="text-sm text-muted-foreground mb-2">Tags</p>
                        <div className="flex flex-wrap gap-2">
                          {event.tags.map((tag) => (
                            <Badge key={tag} variant="outline">{tag}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="reviews" className="mt-4">
                    {reviews.length > 0 ? (
                      <div className="space-y-4">
                        {reviews.map((review) => (
                          <Card key={review.id}>
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                  {/* Avatar */}
                                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                    <span className="text-sm font-semibold text-primary">
                                      {typeof review.userId === 'object'
                                        ? review.userId.name.charAt(0).toUpperCase()
                                        : 'U'}
                                    </span>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-medium text-sm">
                                        {typeof review.userId === 'object'
                                          ? review.userId.name
                                          : 'Unknown'}
                                      </span>
                                      <span className="text-xs text-muted-foreground">
                                        {new Date(review.createdAt).toLocaleDateString('en-IN', {
                                          day: 'numeric', month: 'short', year: 'numeric'
                                        })}
                                      </span>
                                    </div>
                                    {/* Stars */}
                                    <div className="flex items-center gap-0.5 my-1">
                                      {[...Array(5)].map((_, i) => (
                                        <Star
                                          key={i}
                                          className={`h-3.5 w-3.5 ${i < review.rating
                                            ? 'text-yellow-400 fill-yellow-400'
                                            : 'text-gray-300'
                                            }`}
                                        />
                                      ))}
                                    </div>
                                    {/* Comment — visible to all */}
                                    {review.comment && (
                                      <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                                        {review.comment}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-10">
                        <Star className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                        <p className="text-muted-foreground">No reviews yet.</p>
                        {isEventPast && (
                          <p className="text-sm text-muted-foreground mt-1">Be the first to share your experience!</p>
                        )}
                      </div>
                    )}

                    {/* Review submission */}
                    {alreadyReviewed ? (
                      <Card className="mt-6 border-green-500/30 bg-green-50/50 dark:bg-green-950/20">
                        <CardContent className="p-4 flex items-center gap-3">
                          <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                          <p className="text-sm text-green-700 dark:text-green-400 font-medium">
                            You've already reviewed this event. Thank you!
                          </p>
                        </CardContent>
                      </Card>
                    ) : canReview ? (
                      <Card className="mt-6">
                        <CardHeader>
                          <CardTitle className="text-base">Write a Review</CardTitle>
                          <p className="text-sm text-muted-foreground">
                            Your rating and review will be publicly visible with your name.
                          </p>
                        </CardHeader>
                        <CardContent>
                          {/* Star picker */}
                          <div className="flex items-center gap-1 mb-4">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                onClick={() => setUserRating(star)}
                                onMouseEnter={() => setHoverRating(star)}
                                onMouseLeave={() => setHoverRating(0)}
                                className="focus:outline-none transition-transform hover:scale-110"
                              >
                                <Star
                                  className={`h-7 w-7 transition-colors ${star <= (hoverRating || userRating)
                                    ? 'text-yellow-400 fill-yellow-400'
                                    : 'text-gray-300'
                                    }`}
                                />
                              </button>
                            ))}
                            {userRating > 0 && (
                              <span className="ml-2 text-sm text-muted-foreground">
                                {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][userRating]}
                              </span>
                            )}
                          </div>
                          <Textarea
                            placeholder="Share your experience (optional)..."
                            value={userReview}
                            onChange={(e) => setUserReview(e.target.value)}
                            className="mb-4"
                            rows={3}
                          />
                          <Button
                            onClick={handleSubmitReview}
                            disabled={submittingReview || !userRating}
                          >
                            {submittingReview && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Submit Review
                          </Button>
                        </CardContent>
                      </Card>
                    ) : registrationStatus?.attended === false && isEventStarted ? (
                      <p className="text-center text-sm text-muted-foreground mt-6">
                        Only students who attended this event can submit a review.
                      </p>
                    ) : null}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div>
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4">Registration</h3>

                {registrationStatus?.status === 'confirmed' ? (
                  <div className="text-center py-4">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
                    <p className="font-medium">You're Registered!</p>
                    <p className="text-sm text-muted-foreground mb-4">
                      Ticket ID: {registrationStatus.ticketId}
                    </p>
                    <Button className="w-full" asChild>
                      <Link to="/student/tickets">
                        <Ticket className="mr-2 h-4 w-4" />
                        View Ticket
                      </Link>
                    </Button>
                  </div>
                ) : registrationStatus?.status === 'pending' ? (
                  <div className="text-center py-4">
                    <Loader2 className="h-12 w-12 text-yellow-500 mx-auto mb-2 animate-spin" />
                    <p className="font-medium">Payment Pending</p>
                    <p className="text-sm text-muted-foreground">
                      Please complete your payment
                    </p>
                  </div>
                ) : isEventPast ? (
                  <div className="text-center py-4">
                    <XCircle className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                    <p className="font-medium">Event Ended</p>
                    <p className="text-sm text-muted-foreground">
                      This event has already taken place
                    </p>
                  </div>
                ) : isFull ? (
                  <div className="text-center py-4">
                    <XCircle className="h-12 w-12 text-red-500 mx-auto mb-2" />
                    <p className="font-medium">Event Full</p>
                    <p className="text-sm text-muted-foreground">
                      All seats have been booked
                    </p>
                  </div>
                ) : isRegistrationOpen ? (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm text-muted-foreground">Registration Closes</span>
                      <span className="font-medium">
                        {format(new Date(event.registrationEnd), 'MMM d, yyyy')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm text-muted-foreground">Seats Available</span>
                      <span className="font-medium">
                        {event.maxCapacity
                          ? `${event.maxCapacity - event.registeredCount} / ${event.maxCapacity}`
                          : 'Unlimited'
                        }
                      </span>
                    </div>
                    <Button
                      className="w-full"
                      size="lg"
                      onClick={handleRegister}
                      disabled={registering}
                    >
                      {registering && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {event.isPaid ? `Register & Pay ₹${event.price}` : 'Register Now'}
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <XCircle className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                    <p className="font-medium">Registration Closed</p>
                    <p className="text-sm text-muted-foreground">
                      Registration is not open at this time
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Rating Card */}
            <Card className="mt-4">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Rating</p>
                    <div className="flex items-center">
                      <Star className="h-5 w-5 text-yellow-400 fill-yellow-400 mr-1" />
                      <span className="text-2xl font-bold">{event.averageRating.toFixed(1)}</span>
                      <span className="text-muted-foreground ml-1">/ 5</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Reviews</p>
                    <p className="text-2xl font-bold">{event.totalReviews}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Payment</DialogTitle>
            <DialogDescription>
              You're registering for {event.title}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex justify-between items-center mb-4 p-4 bg-muted rounded-lg">
              <span>Registration Fee</span>
              <span className="font-bold">₹{event.price}</span>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Click the button below to proceed with secure payment via Razorpay.
            </p>
            <Button className="w-full" onClick={handlePayment}>
              Pay ₹{event.price}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
