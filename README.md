# Incident Triage Dashboard

A React + TypeScript dashboard for the [Incident Triage API](https://github.com/Prajit-22/incident-triage-api), a Spring Boot service for tracking security incidents. It reads and writes the API's real endpoints: live triage counts, a filterable and paginated incident list, incident creation, and status changes.

## Features

- **Triage summary**: total, unresolved, high + critical, and overdue-open counts, plus bars by status and by severity, all from `GET /api/incidents/summary`.
- **Incident list**: search titles and descriptions, filter by status, severity, a due-date window, or overdue-only, 10 per page, newest first (`GET /api/incidents?status=&severity=&q=&due_after=&due_before=&overdue=&page=&size=`). The search matches case-insensitively over title and description, same as the API's `q` parameter.
- **Due dates**: the form takes an optional deadline (a picked day means the end of that day in the viewer's local time zone); the list shows each incident's due date and marks open incidents past it as overdue. A resolved incident is never overdue, matching the backend's rule.
- **Report an incident**: form with a title length counter and an optional due date. Client-side checks catch blank fields, and the backend's per-field validation errors (`{"error", "fields"}`) are shown next to the right input.
- **Status changes**: move an incident between `OPEN`, `INVESTIGATING` and `RESOLVED` (`PATCH /api/incidents/{id}/status`). The UI mirrors the backend rule that a resolved incident cannot be reopened: the control is locked, and a `409` from a stale view is shown and the list refetched.

## Run

Prerequisites: Node 22+, and the API running (Java 11+, Maven).

```sh
# 1. Start the backend (listens on :8080)
git clone https://github.com/Prajit-22/incident-triage-api
cd incident-triage-api && mvn spring-boot:run

# 2. Start the dashboard
git clone https://github.com/Prajit-22/incident-triage-dashboard
cd incident-triage-dashboard
npm install
npm run dev
```

Open http://localhost:5173. The API sends no CORS headers, so the Vite dev server proxies `/api` to `http://localhost:8080`. To point at a backend elsewhere:

```sh
VITE_API_TARGET=http://localhost:8089 npm run dev
```

The backend has no authentication, so keep both parts local.

## Test

```sh
npm test        # Vitest + Testing Library
npm run lint
npm run build
```

Twenty-two tests cover the API client (query building including search, due-window and overdue params, PATCH body, 400 field errors, 409 message), the transition and overdue rules and the day-bound helpers, and the app against a mocked `fetch`: summary figures including the overdue count, locked resolved rows, status, search and due-window filtering, overdue-only, the overdue badge (never on resolved rows), creating with a due date, blocked empty submit and the unreachable-API banner. CI runs lint, tests and build on Node 22 and 24. I also ran the app against the real backend by hand: create an incident, move it to `INVESTIGATING`, filter by status, search by title.

## Structure

- `src/api.ts`: fetch wrapper and one function per endpoint; turns error bodies into `ApiError`.
- `src/types.ts`: types matching the backend JSON, and the allowed status transitions.
- `src/App.tsx`: loads summary and list together, owns filters and paging.
- `src/components/`: `Summary`, `IncidentList`, `IncidentForm`.

## License

MIT
