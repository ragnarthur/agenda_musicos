import { http, HttpResponse } from 'msw';
import type {
  LoginCredentials,
  Availability,
  Instrument,
  MarketplaceApplication,
} from '../../types';
import {
  mockMusicians,
  mockEvents,
  mockAuthResponse,
  mockInstruments,
  mockConnections,
  mockBadges,
  mockGigs,
} from './data';

const API_URL = 'http://localhost:8000/api';
export const handlers = [
  // Auth endpoints
  http.post(`${API_URL}/token/`, async ({ request }) => {
    const body = (await request.json()) as LoginCredentials;
    if (body.username === 'valid_user' && body.password === 'valid_pass') {
      return HttpResponse.json(mockAuthResponse);
    }
    return HttpResponse.json({ detail: 'Invalid credentials' }, { status: 401 });
  }),

  http.post(`${API_URL}/token/logout/`, () => {
    return HttpResponse.json({ detail: 'Successfully logged out' });
  }),

  http.post(`${API_URL}/token/refresh/`, () => {
    return HttpResponse.json(mockAuthResponse);
  }),

  http.post(`${API_URL}/password-reset/`, async ({ request }) => {
    await request.json();
    return HttpResponse.json({ message: 'Password reset email sent' });
  }),

  http.post(`${API_URL}/password-reset-confirm/`, async () => {
    return HttpResponse.json({ message: 'Password reset successful' });
  }),

  // Musician endpoints
  http.get(`${API_URL}/musicians/`, () => {
    return HttpResponse.json(mockMusicians);
  }),

  http.get(`${API_URL}/musicians/me/`, () => {
    return HttpResponse.json(mockMusicians[0]);
  }),

  http.patch(`${API_URL}/musicians/me/`, async ({ request }) => {
    const updatedMusician = { ...mockMusicians[0], ...(await request.json()) };
    return HttpResponse.json(updatedMusician);
  }),

  http.get(`${API_URL}/musicians/:id/`, ({ params }) => {
    const musician = mockMusicians.find(m => m.id === Number(params.id));
    if (!musician) {
      return HttpResponse.json({ detail: 'Not found' }, { status: 404 });
    }
    return HttpResponse.json(musician);
  }),

  http.get(`${API_URL}/musicians/:id/connections/`, ({ params }) => {
    const musicianConnections = mockConnections.filter(
      c => c.follower.id === Number(params.id) || c.target.id === Number(params.id)
    );
    return HttpResponse.json(musicianConnections);
  }),

  http.get(`${API_URL}/musicians/:id/reviews/`, () => {
    return HttpResponse.json([]);
  }),

  http.get(`${API_URL}/musicians/:id/badges/`, ({ params }) => {
    const musicianBadges = mockBadges.filter(b => b.musician.id === Number(params.id));
    return HttpResponse.json(musicianBadges);
  }),

  // Event endpoints
  http.get(`${API_URL}/events/`, ({ request }) => {
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const search = url.searchParams.get('search');
    const myProposals = url.searchParams.get('my_proposals');
    const pendingApproval = url.searchParams.get('pending_approval');
    const pendingResponses = url.searchParams.get('pending_responses');
    const past = url.searchParams.get('past');
    const upcoming = url.searchParams.get('upcoming');

    let filteredEvents = [...mockEvents];

    if (status) {
      const statuses = status
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
      filteredEvents = filteredEvents.filter(e => statuses.includes(e.status));
    }

    if (search) {
      const searchLower = search.toLowerCase();
      filteredEvents = filteredEvents.filter(
        e =>
          e.title.toLowerCase().includes(searchLower) ||
          e.location.toLowerCase().includes(searchLower)
      );
    }

    if (myProposals === 'true') {
      filteredEvents = filteredEvents.filter(e => e.created_by === 1);
    }

    if (pendingApproval === 'true') {
      filteredEvents = filteredEvents.filter(e => e.status === 'proposed');
    }

    if (pendingResponses === 'true' || pendingResponses === '1') {
      filteredEvents = filteredEvents.filter(
        e => e.created_by === 1 && (e.availability_summary?.pending || 0) > 0
      );
    }

    if (past === 'true') {
      filteredEvents = filteredEvents.filter(e => new Date(e.event_date) < new Date());
    }

    if (upcoming === 'true') {
      filteredEvents = filteredEvents.filter(e => new Date(e.event_date) >= new Date());
    }

    return HttpResponse.json({
      count: filteredEvents.length,
      next: null,
      previous: null,
      results: filteredEvents,
    });
  }),

  http.get(`${API_URL}/events/pending_my_response/`, () => {
    const pendingEvents = mockEvents.filter(e =>
      e.availabilities?.some(a => a.response === 'pending')
    );
    return HttpResponse.json(pendingEvents);
  }),

  http.get(`${API_URL}/events/:id/`, ({ params }) => {
    const event = mockEvents.find(e => e.id === Number(params.id));
    if (!event) {
      return HttpResponse.json({ detail: 'Not found' }, { status: 404 });
    }
    return HttpResponse.json(event);
  }),

  http.post(`${API_URL}/events/`, async ({ request }) => {
    const newEvent = await request.json();
    return HttpResponse.json({
      ...newEvent,
      id: mockEvents.length + 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status: 'proposed',
      status_display: 'Proposto',
      availabilities: [],
    });
  }),

  http.put(`${API_URL}/events/:id/`, async ({ params, request }) => {
    const eventId = Number(params.id);
    const updatedData = await request.json();
    const eventIndex = mockEvents.findIndex(e => e.id === eventId);

    if (eventIndex === -1) {
      return HttpResponse.json({ detail: 'Not found' }, { status: 404 });
    }

    const updatedEvent = { ...mockEvents[eventIndex], ...updatedData };
    return HttpResponse.json(updatedEvent);
  }),

  http.delete(`${API_URL}/events/:id/`, ({ params }) => {
    const eventId = Number(params.id);
    const eventIndex = mockEvents.findIndex(e => e.id === eventId);

    if (eventIndex === -1) {
      return HttpResponse.json({ detail: 'Not found' }, { status: 404 });
    }

    return HttpResponse.json(null, { status: 204 });
  }),

  http.post(`${API_URL}/events/:id/cancel/`, async ({ params }) => {
    const eventId = Number(params.id);
    const event = mockEvents.find(e => e.id === eventId);

    if (!event) {
      return HttpResponse.json({ detail: 'Not found' }, { status: 404 });
    }

    return HttpResponse.json({
      ...event,
      status: 'cancelled',
      status_display: 'Cancelado',
      updated_at: new Date().toISOString(),
    });
  }),

  http.post(`${API_URL}/events/:id/set_availability/`, async ({ params, request }) => {
    const eventId = Number(params.id);
    const { response, notes } = await request.json();
    const event = mockEvents.find(e => e.id === eventId);

    if (!event) {
      return HttpResponse.json({ detail: 'Not found' }, { status: 404 });
    }

    const availability: Availability = {
      id: 1,
      musician: mockMusicians[0],
      musician_id: 1,
      event: eventId,
      response,
      notes,
      responded_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return HttpResponse.json({
      ...event,
      availabilities: [availability],
      updated_at: new Date().toISOString(),
    });
  }),

  http.post(`${API_URL}/events/preview_conflicts/`, async ({ request }) => {
    const { event_date } = await request.json();

    const conflicts = mockEvents.filter(e => {
      if (e.event_date !== event_date) return false;
      return e.status === 'approved' || e.status === 'confirmed';
    });

    return HttpResponse.json({
      has_conflicts: conflicts.length > 0,
      count: conflicts.length,
      buffer_minutes: 30,
      conflicts,
    });
  }),

  http.post(`${API_URL}/events/:id/submit_ratings/`, async ({ request }) => {
    await request.json();
    return HttpResponse.json({
      detail: 'Ratings submitted successfully',
      can_rate: false,
    });
  }),

  // Instrument endpoints
  http.get(`${API_URL}/instruments/`, ({ request }) => {
    const url = new URL(request.url);
    const q = url.searchParams.get('q');

    if (q) {
      const filtered = mockInstruments.filter(
        i =>
          i.display_name.toLowerCase().includes(q.toLowerCase()) ||
          i.name.toLowerCase().includes(q.toLowerCase())
      );
      return HttpResponse.json(filtered);
    }

    return HttpResponse.json(mockInstruments);
  }),

  http.get(`${API_URL}/instruments/popular/`, () => {
    return HttpResponse.json(mockInstruments.slice(0, 5));
  }),

  http.post(`${API_URL}/instruments/create_custom/`, async ({ request }) => {
    const { display_name } = await request.json();
    const newInstrument: Instrument = {
      id: mockInstruments.length + 100,
      name: display_name.toLowerCase().replace(/[^a-z0-9]/g, ''),
      display_name,
      type: 'community',
      usage_count: 0,
    };
    return HttpResponse.json(newInstrument);
  }),

  // Connection endpoints
  http.get(`${API_URL}/connections/`, () => {
    return HttpResponse.json(mockConnections);
  }),

  http.post(`${API_URL}/connections/`, async ({ request }) => {
    const newConnection = await request.json();
    return HttpResponse.json({
      ...newConnection,
      id: mockConnections.length + 1,
      verified: false,
      created_at: new Date().toISOString(),
    });
  }),

  http.delete(`${API_URL}/connections/:id/`, ({ params }) => {
    const connectionId = Number(params.id);
    const connectionIndex = mockConnections.findIndex(c => c.id === connectionId);

    if (connectionIndex === -1) {
      return HttpResponse.json({ detail: 'Not found' }, { status: 404 });
    }

    return HttpResponse.json(null, { status: 204 });
  }),

  // Badge endpoints
  http.get(`${API_URL}/musicians/:id/badges/progress/`, () => {
    return HttpResponse.json({
      total_badges: 5,
      earned_badges: 3,
      next_badge: mockBadges[0],
    });
  }),

  // Notification endpoints
  http.get(`${API_URL}/notifications/preferences/`, () => {
    return HttpResponse.json({
      email: true,
      sms: false,
      push: true,
      event_reminders: true,
      new_connections: true,
      marketplace_opportunities: false,
    });
  }),

  http.put(`${API_URL}/notifications/preferences/:type/`, async ({ params, request }) => {
    const enabled = await request.json();
    return HttpResponse.json({ type: params.type, enabled });
  }),

  http.post(`${API_URL}/notifications/telegram/connect/`, async () => {
    return HttpResponse.json({
      bot_username: '@gigflow_bot',
      chat_id: '123456789',
    });
  }),

  // Marketplace endpoints
  http.get(`${API_URL}/marketplace/gigs/`, ({ request }) => {
    const url = new URL(request.url);
    const status = url.searchParams.get('status');

    let filteredGigs = [...mockGigs];

    if (status) {
      filteredGigs = filteredGigs.filter(g => g.status === status);
    }

    return HttpResponse.json({
      count: filteredGigs.length,
      next: null,
      previous: null,
      results: filteredGigs,
    });
  }),

  http.post(`${API_URL}/marketplace/gigs/:id/apply/`, async ({ params, request }) => {
    const gigId = Number(params.id);
    const { cover_letter, expected_fee } = await request.json();
    const gig = mockGigs.find(g => g.id === gigId);

    if (!gig) {
      return HttpResponse.json({ detail: 'Not found' }, { status: 404 });
    }

    const application: MarketplaceApplication = {
      id: 100,
      gig: gigId,
      musician: 1,
      musician_name: 'Test User',
      cover_letter,
      expected_fee,
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    return HttpResponse.json(application);
  }),

  http.post(`${API_URL}/marketplace/gigs/`, async ({ request }) => {
    const newGig = await request.json();
    return HttpResponse.json({
      ...newGig,
      id: mockGigs.length + 1,
      status: 'open',
      created_by: 1,
      created_by_name: 'Test User',
      applications_count: 0,
      applications: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }),
];
