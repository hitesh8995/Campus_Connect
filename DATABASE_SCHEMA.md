# Database Schema Documentation

This document outlines the database schema for the Campus Connect application, based on the Mongoose models located in `app/backend/models`.

## Entity Relationship Diagram

```mermaid
erDiagram
    User ||--o{ Club : "manages/coordinates"
    User ||--o{ Event : "creates/approves"
    User ||--o{ Registration : "registers for"
    User ||--o{ Review : "writes"
    User ||--o{ Payment : "makes"
    User ||--o{ OTP : "requests"
    User ||--o{ AuditLog : "triggers"
    
    Club ||--o{ Event : "hosts"
    Club ||--o{ User : "members/coordinators"
    
    Event ||--o{ Registration : "has"
    Event ||--o{ Review : "receives"
    Event ||--o{ Payment : "requires"
    
    Registration ||--|| Payment : "linked to"
    Registration ||--o{ Review : "allows"

    User {
        ObjectId _id PK
        String role "superadmin, faculty, coordinator, student"
        String name
        String email UK
        String passwordHash
        Boolean emailVerified
        String approvalStatus "pending, approved, rejected"
        String rollNo "Student only, sparse"
        String department
        String section
        Number yearOfAdmission
        Number currentYear
        String facultyId "Faculty only, sparse"
        String designation
        ObjectId clubId FK
        ObjectId[] assignedEvents FK
        Boolean isActive
    }

    Club {
        ObjectId _id PK
        String name UK
        String description
        String logo
        ObjectId createdBy FK
        ObjectId assignedFaculty FK
        ObjectId[] coordinators FK
        Boolean isActive
        Object socialLinks
        Number totalEvents
        Number totalMembers
    }

    Event {
        ObjectId _id PK
        String title
        String description
        ObjectId clubId FK
        ObjectId createdBy FK
        String status "pending, approved, rejected, completed, cancelled"
        Boolean isPublished
        Date eventDate
        String venue
        Date registrationStart
        Date registrationEnd
        Boolean isPaid
        Number price
        Number maxCapacity
        Number registeredCount
        String category
        Number averageRating
    }

    Registration {
        ObjectId _id PK
        ObjectId userId FK
        ObjectId eventId FK
        String status "pending, confirmed, cancelled, refunded"
        String paymentStatus "pending, paid, free, failed"
        String ticketId UK
        String qrCode
        Date registeredAt
        Boolean attended
    }

    Payment {
        ObjectId _id PK
        ObjectId registrationId FK
        ObjectId userId FK
        ObjectId eventId FK
        String razorpayOrderId UK
        String razorpayPaymentId
        Number amount
        String status
        String method
    }

    Review {
        ObjectId _id PK
        ObjectId userId FK
        ObjectId eventId FK
        ObjectId registrationId FK
        Number rating
        String comment
        Boolean isVisible
        Boolean isFlagged
    }

    OTP {
        ObjectId _id PK
        ObjectId userId FK
        String email
        String otpHash
        String type
        Date expiresAt
        Boolean isUsed
    }

    AuditLog {
        ObjectId _id PK
        String action
        ObjectId performedBy FK
        String performedByRole
        ObjectId targetUser FK
        ObjectId targetEvent FK
        ObjectId targetClub FK
        Object details
        Date timestamp
    }
```

## Collections Detail

### 1. User
Stores all user information, including students, faculty, and administrators.
- **Roles**: `student`, `faculty`, `coordinator`, `superadmin`.
- **Key Fields**:
  - `email`: Unique identifier.
  - `rollNo`: Required for students (unique).
  - `facultyId`: Required for faculty (unique).
  - `approvalStatus`: Controls access (`pending`, `approved`, `rejected`).
  - `clubId`: Reference to a Club (for coordinators/faculty).

### 2. Club
Represents student clubs or organizations.
- **Key Fields**:
  - `name`: Unique club name.
  - `assignedFaculty`: Faculty mentor.
  - `coordinators`: List of student coordinators.
  - `isActive`: Toggle specifically for club visibility/activity.

### 3. Event
Core entity for events managed by clubs.
- **Status Workflow**: `pending_approval` -> `approved` -> `completed`.
- **Registration**: Controlled by `registrationStart`, `registrationEnd`, and `maxCapacity`.
- **Pricing**: Supports free and paid events via `isPaid` and `price`.

### 4. Registration
Records a user's participation in an event.
- **Uniqueness**: Composite index on `userId` + `eventId` prevents duplicate registrations.
- **Ticket**: Generates a unique `ticketId` and `qrCode`.
- **Status**: Tracks both registration status and payment status independently.

### 5. Payment
Handles financial transactions, specifically integrated with **Razorpay**.
- **Tracking**: Links `razorpayOrderId` and `razorpayPaymentId` to a `registrationId`.
- **Status**: `created`, `authorized`, `captured`, `failed`, `refunded`.

### 6. Review
Feedback system for events.
- **Constraints**: Only registered users can review (linked via `registrationId`).
- **Moderation**: Supports `isFlagged` and `isVisible` flags.

### 7. OTP
Temporary storage for One-Time Passwords.
- **Usage**: precise expiration (`expiresAt`), retry limits (`maxAttempts`), and hashing (`otpHash`).

### 8. AuditLog
System-wide audit trail for security and administrative actions.
- **Scope**: Tracks who did what (`action`), to whom (`targetUser`), and regarding what (`targetEvent`/`targetClub`).
