# Campus Connect - Comprehensive UML Diagrams

This document contains detailed UML diagrams for the Campus Connect application, updated to match the system's design requirements.

## 1. Use Case Diagram

Illustrates the interactions between the system and external actors.

```mermaid
graph TD
    %% Actors
    Student[/Student/]
    Faculty[/Faculty/]
    Coordinator[/Coordinator/]
    Admin[/Admin/]

    %% Use Cases
    MakePayment(Make Payment)
    VerifyEmail(Verify Email)
    ViewEvents(View Events)
    RegisterForEvent(Register for Event)
    ManageProfile(Manage Profile)
    ViewTicket(View Ticket)
    CreateEvent(Create Event)
    LoginSignup(Login / Signup)
    ApproveEvent(Approve Event)

    %% Relationships
    Student --> MakePayment
    Student --> VerifyEmail
    Student --> ViewEvents
    Student --> RegisterForEvent
    Student --> ManageProfile
    Student --> ViewTicket
    Student --> LoginSignup

    Faculty --> CreateEvent
    Faculty --> LoginSignup

    Coordinator --> LoginSignup

    Admin --> LoginSignup
    Admin --> ApproveEvent

    %% Styling to mimic the provided image
    classDef actor fill:#f9f,stroke:#333,stroke-width:2px;
    class Student,Faculty,Coordinator,Admin actor;
    
    classDef usecase fill:#fff5ad,stroke:#d4b106,stroke-width:2px;
    class MakePayment,VerifyEmail,ViewEvents,RegisterForEvent,ManageProfile,ViewTicket,CreateEvent,LoginSignup,ApproveEvent usecase;
```

## 2. Class Diagram

Detailed static structure of the database models.

```mermaid
classDiagram
    class User {
        +ObjectId _id
        +String name
        +String email
        +String role
        +login()
        +register()
    }

    class Student {
        +String rollNo
        +String department
    }

    class Faculty {
        +String facultyId
        +String designation
    }

    class Event {
        +ObjectId _id
        +String title
        +Date eventDate
        +boolean isPaid
        +Number price
        +canRegister()
    }

    class Registration {
        +ObjectId _id
        +String status
        +String ticketId
        +confirm()
    }

    User <|-- Student
    User <|-- Faculty
    User "1" -- "*" Registration : makes
    User "1" -- "*" Event : creates
    Event "1" -- "*" Registration : contains
```

## 3. State Diagram (User Approval Workflow)

Describes the lifecycle of a user account.

```mermaid
stateDiagram-v2
    [*] --> Unverified
    Unverified --> AppPending : Verify Email
    AppPending --> Approved : Admin Approve
    AppPending --> Rejected : Admin Reject
    Approved --> Active : Login
    Active --> Locked : Failed Logins
    Locked --> Active : Unlock
    Rejected --> [*]
```

## 4. Sequence Diagram (Event Creation & Approval)

Shows the flow of creating an event.

```mermaid
sequenceDiagram
    participant Faculty
    participant API
    participant Database
    participant Admin

    Faculty->>API: Create Event
    API->>Database: Save (Pending)
    Database-->>API: Event ID
    API-->>Faculty: Pending Confirmation

    Admin->>API: Get Pending Events
    API->>Database: Query Pending
    Database-->>API: List Events
    API-->>Admin: Show List

    Admin->>API: Approve Event
    API->>Database: Update (Approved)
    API-->>Admin: Success
```

## 5. Activity Diagram (Event Registration)

Detailed decision flow for registration based on user requirements.

```mermaid
graph LR
    Start((Start))
    ViewEvent[View Event]
    
    CheckOpen{Is Event Open?}
    Closed[Closed]
    Stop1((Stop))
    Stop2((Stop))

    CheckLogin{Is User Logged In?}
    Login[Login]
    Register[Register]
    
    CheckPaid{Is Event Paid?}
    Payment[Payment]
    Free[Free]
    Confirm[Confirm]

    %% Flow
    Start --> ViewEvent
    ViewEvent --> CheckOpen
    
    CheckOpen -- NO --> Closed
    Closed --> Stop1
    
    CheckOpen -- YES --> CheckLogin
    
    CheckLogin -- NO --> Login
    Login --> Register
    CheckLogin -- YES --> Register
    
    Register --> CheckPaid
    
    CheckPaid -- YES --> Payment
    Payment --> Confirm
    
    CheckPaid -- NO --> Free
    Free --> Confirm
    
    Confirm --> Stop2

    %% Styling
    classDef startend fill:#9fdf9f,stroke:#333,stroke-width:2px;
    class Start,Stop1,Stop2 startend;

    classDef proc fill:#fff5ad,stroke:#d4b106,stroke-width:2px;
    class ViewEvent,Closed,Login,Register,Payment,Free,Confirm proc;

    classDef decisions fill:#aaccff,stroke:#333,stroke-width:1px;
    class CheckOpen,CheckLogin,CheckPaid decisions;
```
