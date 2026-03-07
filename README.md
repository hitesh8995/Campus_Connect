
# CAMPUS-CONNECT

A comprehensive, production-ready college event management platform built with the MERN stack. Designed for engineering colleges to manage clubs, events, registrations, attendance, payments, and student reviews — all in one place.

---

## Features

### Multi-Role Access Control
| Role | Capabilities |
|------|-------------|
| **Superadmin** | Manage clubs & faculty assignments, approve users & events, view audit logs, moderate reviews |
| **Faculty** | Create events, assign/remove club coordinators, view event registrations & reviews |
| **Coordinator** | Mark attendance, verify tickets, view event registrations |
| **Student** | Browse & register for events, download QR tickets, submit ratings & reviews after attendance |

### Core Modules

#### 🏛️ Club Management
- Superadmin creates clubs and assigns faculty advisors (1 faculty per club)
- **Faculty can assign and remove coordinators** for their own club from approved students

#### 📅 Event Management
- Faculty create events (pending superadmin approval before going live)
- Optional `eventEndDate` for multi-day or long-duration events
- Event categories: Technical, Cultural, Sports, Workshop, Seminar, Hackathon, Other
- Free and paid events supported

#### 📝 Registration & Ticketing
- Students register with capacity enforcement
- QR code-based tickets generated on registration
- Coordinators verify tickets via QR scan

#### 💳 Payment Integration
- Razorpay integration for paid events
- Webhook support for payment verification

#### ✅ Attendance Tracking
- Coordinators mark attendance per registration
- Attendance enables the post-event review window

#### ⭐ Reviews & Ratings
- **Eligibility**: Student must have `attended: true` on a confirmed registration
- **Review window**:
  - Events **without** `eventEndDate` → reviews open once `eventDate` passes (event has started)
  - Events **with** `eventEndDate` → reviews open only after `eventEndDate` passes (event has ended)
- **Visibility**: Both rating (1–5 stars) and written comment are **publicly visible** with the reviewer's name
- One review per student per event; form hides after submission
- Average rating displayed on event cards and event detail page

#### 📧 Email & OTP
- Email OTP verification on signup
- Approval/rejection notification emails
- Password reset via OTP

#### 🔐 Security
- JWT access + refresh token pair
- bcrypt password hashing (12 rounds)
- Rate limiting on auth endpoints
- Helmet security headers
- CORS configuration
- Full audit log trail

---

## Technology Stack

### Backend
- Node.js + Express.js
- MongoDB with Mongoose ODM
- JWT Authentication (access + refresh tokens)
- bcrypt for password hashing
- Razorpay for payments
- Nodemailer for transactional emails
- QRCode generation
- Winston for logging
- express-validator for input validation

### Frontend
- React 19 + TypeScript
- React Router v6
- Vite build tool
- shadcn/ui component library
- Tailwind CSS
- Axios for API calls
- date-fns for date formatting
- Sonner for toast notifications

---

## Project Structure

```
CAMPUS-CONNECT/
├── app/                           # React + TypeScript Frontend
│   ├── src/
│   │   ├── components/            # Reusable UI components
│   │   ├── contexts/              # React contexts (AuthContext)
│   │   ├── layouts/               # Role-based layouts
│   │   │   ├── AdminLayout.tsx
│   │   │   ├── FacultyLayout.tsx
│   │   │   ├── CoordinatorLayout.tsx
│   │   │   └── StudentLayout.tsx
│   │   ├── pages/
│   │   │   ├── auth/              # Login, Signup, OTP, Password Reset
│   │   │   ├── admin/             # Dashboard, ManageUsers, ManageClubs, etc.
│   │   │   ├── faculty/           # Dashboard, CreateEvent, ManageClub, ManageEvents
│   │   │   ├── coordinator/       # Dashboard, Attendance, VerifyTicket
│   │   │   ├── student/           # Dashboard, MyRegistrations, MyTickets, MyReviews
│   │   │   ├── EventDetails.tsx   # Public event page with reviews
│   │   │   └── Events.tsx
│   │   ├── services/
│   │   │   └── api.ts             # Axios API service (authAPI, adminAPI, facultyAPI, ...)
│   │   └── types/                 # TypeScript type definitions
│   └── package.json
│
└── app/backend/                   # Node.js + Express Backend
    ├── models/
    │   ├── User.js
    │   ├── Club.js
    │   ├── Event.js               # includes eventEndDate for multi-day events
    │   ├── Registration.js
    │   ├── Payment.js
    │   ├── Review.js
    │   ├── OTP.js
    │   └── AuditLog.js
    ├── routes/
    │   ├── auth.routes.js
    │   ├── admin.routes.js        # Superadmin-only routes
    │   ├── faculty.routes.js      # Faculty coordinator management routes
    │   ├── event.routes.js
    │   ├── registration.routes.js
    │   ├── coordinator.routes.js
    │   ├── review.routes.js
    │   ├── payment.routes.js
    │   ├── user.routes.js
    │   └── club.routes.js
    ├── middleware/                # auth, error, logger middleware
    ├── utils/                    # email, JWT, Razorpay, audit utilities
    ├── server.js
    └── package.json
```

---

## Setup Instructions

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- npm

### 1. Backend Setup

```bash
cd app/backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env
# Edit .env with your values (see Environment Variables section)

# Start development server
npm run dev
```

The backend starts on `http://localhost:5000`.

> **Note:** OTPs are printed to the terminal in development mode.

### 2. Frontend Setup

```bash
cd app

# Install dependencies
npm install

# Create environment file
echo "VITE_API_URL=http://localhost:5000/api" > .env

# Start development server
npm run dev
```

The frontend starts on `http://localhost:5173`.

---

## Environment Variables

### Backend (`app/backend/.env`)

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server port | No (default: 5000) |
| `MONGO_URI` | MongoDB connection string | ✅ Yes |
| `JWT_SECRET` | JWT signing secret | ✅ Yes |
| `JWT_REFRESH_SECRET` | Refresh token secret | ✅ Yes |
| `JWT_EXPIRE` | Access token TTL | No (default: 1h) |
| `JWT_REFRESH_EXPIRE` | Refresh token TTL | No (default: 7d) |
| `FRONTEND_URL` | Allowed CORS origin | No (default: http://localhost:5173) |
| `RZP_KEY_ID` | Razorpay Key ID | For paid events |
| `RZP_KEY_SECRET` | Razorpay Key Secret | For paid events |
| `SMTP_HOST` | Email SMTP host | For email OTPs |
| `SMTP_USER` | Email username | For email OTPs |
| `SMTP_PASS` | Email password | For email OTPs |
| `TICKET_SECRET` | QR ticket signing secret | ✅ Yes |
| `OTP_EXPIRE_MINUTES` | OTP validity duration | No (default: 5) |
| `OTP_MAX_ATTEMPTS` | Max OTP attempts | No (default: 5) |

### Frontend (`app/.env`)

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_API_URL` | Backend API base URL | ✅ Yes |
| `VITE_RAZORPAY_KEY_ID` | Razorpay public key | For paid events |

---

## API Reference

### Authentication — `/api/auth`
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/signup-student` | Register as student |
| POST | `/signup-faculty` | Register as faculty |
| POST | `/verify-otp` | Verify email OTP |
| POST | `/resend-otp` | Resend OTP |
| POST | `/login` | Login |
| POST | `/refresh` | Refresh access token |
| POST | `/forgot-password` | Request password reset OTP |
| POST | `/reset-password` | Reset password |
| POST | `/logout` | Logout |

### Admin — `/api/admin` *(Superadmin only)*
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/dashboard` | System stats |
| GET | `/pending-users` | Users awaiting approval |
| PATCH | `/approve-user/:userId` | Approve or reject user |
| GET | `/users` | All users |
| POST | `/clubs` | Create club |
| GET | `/clubs` | All clubs |
| PUT | `/clubs/:clubId` | Update club |
| DELETE | `/clubs/:clubId/faculty` | Remove faculty from club |
| POST | `/clubs/:clubId/coordinators` | Assign coordinators *(Superadmin)* |
| DELETE | `/clubs/:clubId/coordinators/:id` | Remove coordinator *(Superadmin)* |
| GET | `/pending-events` | Events awaiting approval |
| PATCH | `/approve-event/:eventId` | Approve or reject event |
| GET | `/audit-logs` | Audit log trail |

### Faculty — `/api/faculty` *(Faculty only)*
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/clubs/:clubId/coordinators` | Assign coordinators to own club |
| DELETE | `/clubs/:clubId/coordinators/:id` | Remove coordinator from own club |

### Events — `/api/events`
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/` | Public | List events |
| GET | `/:eventId` | Public | Event details + reviews + canReview flag |
| POST | `/` | Faculty | Create event |
| PUT | `/:eventId` | Faculty | Update event |
| DELETE | `/:eventId` | Faculty | Cancel event |
| GET | `/:eventId/registrations` | Faculty/Coordinator | Event registrations |

### Registrations — `/api/registrations`
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/events/:eventId/register` | Register for event |
| GET | `/my-registrations` | My registrations |
| GET | `/:registrationId/ticket` | Get QR ticket |
| DELETE | `/:registrationId` | Cancel registration |

### Reviews — `/api/reviews`
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/events/:eventId` | Student (attended only) | Submit rating + review |
| GET | `/events/:eventId` | Public | Get event reviews (rating + comment visible to all) |
| GET | `/my-reviews` | Student | My submitted reviews |
| DELETE | `/:reviewId` | Student/Admin | Delete review |
| PATCH | `/:reviewId/moderate` | Superadmin | Hide/show review |

### Coordinator — `/api/coordinator`
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/events` | Assigned club events |
| GET | `/events/:eventId/registrations` | Event registrations |
| POST | `/registrations/:id/attendance` | Mark attendance |
| POST | `/verify-ticket` | Verify QR ticket |

### Payments — `/api/payments`
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/verify` | Verify Razorpay payment |
| POST | `/webhook/razorpay` | Razorpay webhook |
| GET | `/my-payments` | Payment history |

---

## Testing Walkthrough

### Step 1 — Create Superadmin

Insert directly into MongoDB:
```javascript
db.users.insertOne({
  role: "superadmin",
  name: "Admin",
  email: "admin@college.ac.in",
  passwordHash: "<bcrypt-hashed-password>",
  emailVerified: true,
  approvalStatus: "approved",
  department: "CSE",
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date()
})
```

### Step 2 — Typical Flow

1. **Signup** as Student or Faculty → verify OTP (printed to terminal)
2. **Superadmin** approves the user from *Pending Users*
3. **Superadmin** creates a Club and assigns Faculty
4. **Faculty** assigns Coordinators from approved students (via *Manage Club*)
5. **Faculty** creates an Event → Superadmin approves it
6. **Student** registers for the event
7. **Coordinator** marks attendance
8. **Student** submits a rating + review after the event starts (or ends, if `eventEndDate` is set)

---

## Production Deployment

### Backend
1. Provision MongoDB Atlas cluster
2. Set all environment variables on your server
3. Use **PM2** for process management
4. Set up **Nginx** reverse proxy
5. Enable HTTPS with Let's Encrypt

### Frontend
```bash
cd app
npm run build
# Deploy the dist/ folder to Vercel, Netlify, or any static host
```

---

## License

MIT License — free to use for your college or organization.
=======
# Campus_Connect
Campus Connect is a production-ready MERN stack platform for managing college clubs, events, registrations, QR tickets, payments, attendance, and student reviews.

