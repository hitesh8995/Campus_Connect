# CAMPUS-CONNECT — Frontend

React + TypeScript frontend for the CAMPUS-CONNECT college event management platform.

## Tech Stack

- **React 19** + **TypeScript**
- **Vite** — fast dev server and production build
- **React Router v6** — client-side routing with role-based layouts
- **shadcn/ui** — accessible component library
- **Tailwind CSS** — utility-first styling
- **Axios** — API communication with interceptors (auto token refresh)
- **date-fns** — date formatting
- **Sonner** — toast notifications

## Getting Started

```bash
# Install dependencies
npm install

# Set environment variables
echo "VITE_API_URL=http://localhost:5000/api" > .env

# Start dev server
npm run dev
```

Runs on **http://localhost:5173**

## Project Structure

```
src/
├── components/         # Shared UI components
├── contexts/
│   └── AuthContext.tsx # Auth state (user, token, role)
├── layouts/
│   ├── AdminLayout.tsx
│   ├── FacultyLayout.tsx
│   ├── CoordinatorLayout.tsx
│   └── StudentLayout.tsx
├── pages/
│   ├── auth/           # Login, Signup, OTP, ForgotPassword, ResetPassword
│   ├── admin/          # Dashboard, ManageUsers, ManageClubs, PendingEvents, AuditLogs
│   ├── faculty/        # Dashboard, CreateEvent, ManageEvents, ManageClub, EventRegistrations
│   ├── coordinator/    # Dashboard, Events, Attendance, AttendanceList, VerifyTicket
│   ├── student/        # Dashboard, MyRegistrations, MyTickets, MyReviews
│   ├── EventDetails.tsx  # Public event page (registration, reviews, rating)
│   ├── Events.tsx
│   ├── Clubs.tsx
│   └── ClubDetails.tsx
├── services/
│   └── api.ts          # API modules: authAPI, adminAPI, facultyAPI, eventsAPI,
│                       #   registrationsAPI, reviewsAPI, coordinatorAPI, clubsAPI, usersAPI
└── types/              # TypeScript types
```

## API Services (`src/services/api.ts`)

| Export | Route prefix | Purpose |
|--------|-------------|---------|
| `authAPI` | `/auth` | Login, signup, OTP, token refresh |
| `adminAPI` | `/admin` | Superadmin operations |
| `facultyAPI` | `/faculty` | Faculty coordinator management |
| `eventsAPI` | `/events` | Event CRUD |
| `registrationsAPI` | `/registrations` | Register, tickets, cancel |
| `reviewsAPI` | `/reviews` | Submit and fetch reviews |
| `coordinatorAPI` | `/coordinator` | Attendance, ticket verification |
| `clubsAPI` | `/clubs` | Public club data |
| `usersAPI` | `/users` | Profile, students, faculty lists |

## Role-Based Routing

| Role | Layout | Key pages |
|------|--------|-----------|
| `superadmin` | AdminLayout | Dashboard, Users, Clubs, Pending Events, Audit Logs |
| `faculty` | FacultyLayout | Dashboard, Create Event, Manage Events, Manage Club |
| `coordinator` | CoordinatorLayout | Dashboard, Attendance, Verify Ticket |
| `student` | StudentLayout | Dashboard, My Registrations, My Tickets, My Reviews |

## Review & Rating System

- Students who attended an event can submit a **star rating + written review**
- Reviews are publicly visible (name, stars, and comment shown to all)
- Review window:
  - No `eventEndDate` → opens after `eventDate` (event started)
  - With `eventEndDate` → opens after `eventEndDate` (event ended)
- Form shows a "already reviewed" banner after submission

## Build for Production

```bash
npm run build
# Output in dist/ — deploy to any static host (Vercel, Netlify, etc.)
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_API_URL` | Backend API base URL | ✅ Yes |
| `VITE_RAZORPAY_KEY_ID` | Razorpay public key | For paid events |
