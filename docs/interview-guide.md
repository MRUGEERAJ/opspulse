# Interview Guide

This guide helps explain OpsPulse FieldOps like a 5 to 6 years experienced full-stack/mobile engineer: product-first, practical, and aware of trade-offs.

## Short Pitch

OpsPulse FieldOps is an offline-first field operations platform. Admins create work orders, managers assign them, and field agents complete jobs from a React Native app even without internet. The mobile app queues offline actions locally and syncs them later. The NestJS backend validates those actions, stores audit logs, runs background jobs with Redis and BullMQ, and exposes dashboards for failed syncs and SLA breaches.

## How To Explain The Architecture

Start with the business problem:

> Field teams often work where network access is unreliable. The system must let them keep working, then safely sync their actions later.

Then explain the system:

> The mobile app stores assigned jobs and pending actions locally. When online, it sends queued actions to the backend sync API. The backend validates ownership, role permissions, and work order state before saving changes. Important events are written to audit logs. Background jobs handle retries and SLA checks. The admin web app gives visibility into status, failures, and breaches.

Then explain why it is production-style:

> The project separates concerns across mobile, web, backend modules, database entities, queues, logs, and deployment. It avoids hardcoded secrets, uses DTO validation, role guards, structured services, and a clear path to AWS deployment.

## Concept Explanations

### Offline-first

What it is:

Offline-first means the app continues working without network access by storing data and user actions locally.

Why companies use it:

Field workers may be in areas with poor connectivity, such as basements, rural areas, warehouses, or job sites.

How OpsPulse FieldOps uses it:

The FieldAgent app stores pending status updates, photo proof metadata, QR scans, and location captures in a local queue. It syncs those actions when the network returns.

Interview explanation:

> I designed the mobile app so network failure does not block job completion. The app queues actions locally and the backend validates and applies them later. The trade-off is that sync conflicts and failed actions must be visible and debuggable.

### Role-based Access Control

What it is:

Role-based access control limits what users can do based on their role.

Why companies use it:

It protects sensitive actions and keeps responsibilities clear.

How OpsPulse FieldOps uses it:

Admins create work orders and review operations. Managers assign jobs. FieldAgents update only their assigned jobs.

Interview explanation:

> I use role guards for broad permissions, then service-level checks for ownership and business rules. A FieldAgent should not update someone else's work order even if they call the API directly.

### DTO Validation

What it is:

DTO validation checks request data before it reaches business logic.

Why companies use it:

It prevents invalid or unsafe data from entering the system.

How OpsPulse FieldOps uses it:

Create work order, assign work order, status update, and sync endpoints should all validate payload shape.

Interview explanation:

> I validate API inputs at the boundary so services can focus on business rules instead of defensive parsing.

### Audit Logs

What it is:

Audit logs are immutable records of important business events.

Why companies use it:

They help answer what happened, who did it, and when. This matters for debugging, compliance, and customer support.

How OpsPulse FieldOps uses it:

The backend records events like work order created, assigned, status changed, proof uploaded, sync failed, and SLA breached.

Interview explanation:

> In operational systems, debugging is not only stack traces. You need business-level history. Audit logs let admins and engineers trace important actions.

### Background Jobs

What it is:

Background jobs run work outside the main HTTP request flow.

Why companies use it:

They improve API responsiveness and support retries, delayed work, and scheduled checks.

How OpsPulse FieldOps uses it:

BullMQ can handle SLA checks, retryable sync processing, and post-upload processing.

Interview explanation:

> I would not make users wait for every retryable task during an API request. I use BullMQ workers for jobs that can run asynchronously and need retry control.

### Redis And BullMQ

What it is:

Redis is an in-memory data store. BullMQ uses Redis to manage job queues.

Why companies use it:

Queues make systems more resilient when external services fail or work needs to be retried.

How OpsPulse FieldOps uses it:

OpsPulse FieldOps uses Redis and BullMQ for background jobs and retry workflows.

Interview explanation:

> Redis and BullMQ give us durable queue semantics for operational jobs. They are useful when tasks should be retried instead of being lost after one failed request.

### S3 Presigned Uploads

What it is:

A presigned upload URL allows a client to upload a file directly to S3 without exposing AWS secrets.

Why companies use it:

It reduces backend load and keeps credentials secure.

How OpsPulse FieldOps uses it:

The backend creates a presigned URL for proof photos. The mobile app uploads directly to S3, then links the uploaded file to the work order.

Interview explanation:

> I avoid sending large files through the API server when possible. The backend controls permission by issuing short-lived presigned URLs, and S3 handles the actual file upload.

### Docker Compose

What it is:

Docker Compose runs multiple local services together, such as API, PostgreSQL, and Redis.

Why companies use it:

It makes local development predictable across machines.

How OpsPulse FieldOps uses it:

OpsPulse FieldOps will use Docker Compose for the backend dependencies during development.

Interview explanation:

> Docker Compose makes onboarding easier because developers can start the same PostgreSQL and Redis services with one command.

### ECS Fargate

What it is:

ECS Fargate runs containers on AWS without managing servers directly.

Why companies use it:

It is simpler than managing EC2 instances for many small to mid-size containerized backends.

How OpsPulse FieldOps uses it:

The backend Docker image is pushed to ECR and deployed to ECS Fargate.

Interview explanation:

> For this project, ECS Fargate is a practical production deployment target because the backend is containerized and I do not need to manage EC2 hosts.

## Common Interview Questions

### Why is this not just CRUD?

Because the difficult parts are not only create, read, update, and delete. The project includes offline sync, action replay, role-based workflows, audit logs, background jobs, proof uploads, and operational dashboards.

### How do you handle offline conflicts?

For v1, keep conflict handling simple. The backend validates each queued action against the current work order state and ownership. If an action is invalid, it is marked failed with a reason and shown in the admin dashboard.

### How do you prevent FieldAgents from updating other jobs?

Use authentication to identify the user, role guards to limit route access, and service-level checks to confirm the work order is assigned to that FieldAgent.

### Why use audit logs?

Audit logs make business events traceable. They help support teams and engineers understand user actions and system decisions.

### Why use a queue?

Queues are useful for retryable, delayed, or expensive work. In OpsPulse FieldOps, SLA checks and retry workflows should not block normal API responses.

### How would you keep AWS cost low?

Build and test locally first. When deploying, use the smallest practical ECS task, avoid unnecessary NAT gateways, keep logs retention short, use a small RDS instance only when needed, and tear down unused resources.

## End-of-day Talking Points

- I defined the product before coding.
- I separated Admin, Manager, and FieldAgent responsibilities.
- I designed the system around unreliable mobile networks.
- I planned backend modules around business capabilities.
- I included audit logs, queues, and failed sync visibility because production systems need debugging tools.
- I kept AWS as a future deployment plan and avoided creating billable resources today.
