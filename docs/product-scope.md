# Product Scope

OpsPulse FieldOps helps companies manage field work across office teams and mobile field agents. The MVP focuses on work order lifecycle, role-based access, offline execution, proof collection, sync reliability, and operational visibility.

## What We Are Building Today

Today is a foundation day. The goal is to define the product, architecture, modules, screens, entities, and interview story before writing application code.

This matters because strong engineers do not jump directly into screens and endpoints. They clarify roles, workflows, data ownership, failure cases, and system boundaries first.

## Why This Matters In Real Companies

Field operations products are used in industries like logistics, utilities, inspections, repairs, facility management, and delivery operations. These teams often work in places with unreliable network access. A production system must handle partial connectivity, retries, auditability, and clear ownership.

In interviews, this project helps you discuss:

- Product thinking beyond CRUD screens.
- Offline-first mobile architecture.
- Backend validation and state transitions.
- Background jobs and retry strategy.
- Audit logs and production debugging.
- Practical AWS deployment choices.

## Roles

### Admin

Admin owns system-level operations.

Typical responsibilities:

- Create work orders.
- Manage users and roles.
- View all work orders.
- Review audit logs.
- Review failed sync actions.
- Track SLA breaches.

### Manager

Manager owns assignment and team execution.

Typical responsibilities:

- View work orders assigned to their team.
- Assign jobs to FieldAgents.
- Reassign jobs when needed.
- Monitor job progress.
- Watch SLA risk.

### FieldAgent

FieldAgent owns job completion in the mobile app.

Typical responsibilities:

- View assigned jobs.
- Open job details.
- Update job status.
- Capture proof photo.
- Capture location.
- Scan QR code.
- Queue actions while offline.
- Sync actions when online.

## MVP User Flows

### Admin Creates Work Order

1. Admin logs into the web app.
2. Admin creates a work order with title, description, priority, due date, and location.
3. Backend validates the request.
4. Work order is saved as unassigned.
5. Audit log records the creation event.

### Manager Assigns Work Order

1. Manager views available or team work orders.
2. Manager selects a FieldAgent.
3. Backend validates that the manager can assign the work order.
4. Assignment is saved.
5. Work order becomes visible in the FieldAgent mobile app.
6. Audit log records the assignment event.

### FieldAgent Completes Job Offline

1. FieldAgent opens the mobile app while online and downloads assigned jobs.
2. FieldAgent loses network.
3. FieldAgent updates status, captures location, scans QR code, and adds proof photo.
4. Mobile app stores these actions in a local offline queue.
5. FieldAgent regains network.
6. Mobile app sends queued actions to the sync API.
7. Backend validates actions and applies them.
8. Failed actions are stored with failure reasons.

### Admin Reviews Operations

1. Admin opens dashboard.
2. Admin sees work order counts by status.
3. Admin reviews failed sync actions.
4. Admin checks audit logs for a specific work order.
5. Admin sees SLA breaches or at-risk jobs.

## MVP Feature List

### Authentication And Authorization

- Login/logout.
- JWT-based API access.
- Role guards on protected routes.
- Server-side authorization checks.

### Work Orders

- Create work order.
- View work order list.
- View work order detail.
- Assign work order.
- Update work order status.
- Store status history.

### Offline Sync

- Mobile app stores pending actions locally.
- Sync API accepts queued actions.
- Backend validates action ownership and state.
- Failed syncs are visible to Admin.
- Sync result returns success or failure per action.

### Proof Capture

- FieldAgent captures proof photo.
- Backend supports S3 presigned upload flow.
- Proof photo is linked to work order.

### Location Capture

- FieldAgent captures location at important job events.
- Backend stores location pings for audit and operational visibility.

### QR Scan

- FieldAgent scans QR code at job site or asset.
- Backend stores scan result against work order.

### Audit Logs

- Important events create immutable audit entries.
- Audit logs answer who did what, when, and to which work order.

### SLA Tracking

- Work orders have due dates or SLA deadlines.
- Background jobs detect breached or at-risk work orders.
- Admin dashboard highlights SLA issues.

## Out Of Scope For v1

- Real-time maps.
- Route optimization.
- Payments.
- Multi-tenant billing.
- Advanced analytics.
- Native push notifications unless added later.

## End-of-day Checkpoint

By the end of this foundation step, the repo should clearly explain:

- What OpsPulse FieldOps is.
- Who uses it.
- Which workflows matter.
- Which modules will exist.
- Which database entities will exist.
- Which mobile and web screens will exist.
- How to explain the architecture in an interview.
