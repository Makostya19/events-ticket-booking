const bearer = [{ bearerAuth: [] }];
const ref = (name) => ({ $ref: `#/components/schemas/${name}` });
const res = (name) => ({ $ref: `#/components/responses/${name}` });
const json = (schema) => ({ 'application/json': { schema } });
const idParam = (name = 'id') => ({
  name,
  in: 'path',
  required: true,
  schema: { type: 'integer', minimum: 1 },
});
const q = (name, schema, description) => ({ name, in: 'query', required: false, schema, description });

const paging = [
  q('page', { type: 'integer', minimum: 1, default: 1 }),
  q('limit', { type: 'integer', minimum: 1, maximum: 50, default: 12 }),
];

const page = (itemRef) => ({
  type: 'object',
  properties: {
    items: { type: 'array', items: ref(itemRef) },
    page: { type: 'integer' },
    limit: { type: 'integer' },
    total: { type: 'integer' },
    totalPages: { type: 'integer' },
  },
});

const ok = (description, schema) => ({
  description,
  ...(schema ? { content: json(schema) } : {}),
});

const eventStatuses = ['draft', 'published', 'cancelled', 'completed'];
const bookingSort = ['created_desc', 'created_asc', 'event_date_asc', 'event_date_desc'];

export const openapi = {
  openapi: '3.0.3',
  info: {
    title: 'Events Ticket Booking API',
    version: '1.0.0',
    description:
      'REST API for an events ticket booking platform.\n\n' +
      '**How to authorize:** call `POST /api/auth/login`, copy the `token` from the response, click **Authorize** and paste it.\n\n' +
      'Demo accounts (after `npm run seed`): `admin@example.com` / `Admin12345`. Create a customer with `POST /api/auth/register`.\n\n' +
      'Errors always have the shape `{ success: false, error, message, details? }`.',
  },
  servers: [{ url: '/', description: 'Current server' }],
  tags: [
    { name: 'Auth' },
    { name: 'Events' },
    { name: 'Bookings' },
    { name: 'Favorites' },
    { name: 'Dashboard' },
    { name: 'Admin: events' },
    { name: 'Admin: bookings' },
    { name: 'Admin: users' },
    { name: 'Profile' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    responses: {
      BadRequest: {
        description: 'Validation error',
        content: json(ref('Error')),
      },
      Unauthorized: {
        description: 'Missing or invalid token',
        content: json(ref('Error')),
      },
      Forbidden: {
        description: 'Not enough permissions or account blocked',
        content: json(ref('Error')),
      },
      NotFound: { description: 'Resource not found', content: json(ref('Error')) },
      Conflict: {
        description: 'Business rule conflict (duplicate, not enough tickets, invalid status change)',
        content: json(ref('Error')),
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: { type: 'string', example: 'VALIDATION_ERROR' },
          message: { type: 'string', example: 'Validation failed' },
          details: {
            type: 'array',
            items: {
              type: 'object',
              properties: { field: { type: 'string' }, message: { type: 'string' } },
            },
          },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          role: { type: 'string', enum: ['customer', 'admin'] },
          status: { type: 'string', enum: ['active', 'blocked'] },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      AuthResponse: {
        type: 'object',
        properties: { user: ref('User'), token: { type: 'string' } },
      },
      Event: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          title: { type: 'string' },
          description: { type: 'string' },
          category: { type: 'string' },
          city: { type: 'string' },
          venue: { type: 'string' },
          startsAt: { type: 'string', format: 'date-time' },
          endsAt: { type: 'string', format: 'date-time' },
          price: { type: 'number' },
          totalTickets: { type: 'integer' },
          availableTickets: { type: 'integer' },
          status: { type: 'string', enum: eventStatuses },
          imageUrl: { type: 'string', nullable: true },
          createdBy: { type: 'integer', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      EventInput: {
        type: 'object',
        required: ['title', 'description', 'category', 'city', 'venue', 'startsAt', 'endsAt', 'price', 'totalTickets'],
        properties: {
          title: { type: 'string', minLength: 3, maxLength: 120, example: 'Seoul Street Food Night' },
          description: { type: 'string', minLength: 20, maxLength: 5000 },
          category: { type: 'string', maxLength: 60, example: 'Local' },
          city: { type: 'string', maxLength: 80, example: 'Seoul' },
          venue: { type: 'string', maxLength: 120 },
          startsAt: { type: 'string', format: 'date-time', description: 'Must be in the future when creating' },
          endsAt: { type: 'string', format: 'date-time', description: 'Must be after startsAt' },
          price: { type: 'number', minimum: 0, maximum: 10000000 },
          totalTickets: { type: 'integer', minimum: 1, maximum: 100000 },
        },
      },
      EventPage: page('Event'),
      Booking: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          userId: { type: 'integer' },
          eventId: { type: 'integer' },
          quantity: { type: 'integer' },
          totalPrice: { type: 'number' },
          status: { type: 'string', enum: ['confirmed', 'cancelled'] },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          event: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              startsAt: { type: 'string', format: 'date-time' },
              city: { type: 'string' },
              venue: { type: 'string' },
              imageUrl: { type: 'string', nullable: true },
              status: { type: 'string', enum: eventStatuses },
            },
          },
          user: {
            type: 'object',
            properties: { name: { type: 'string' }, email: { type: 'string' } },
          },
        },
      },
      BookingPage: page('Booking'),
      UserPage: page('User'),
      Favorite: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          eventId: { type: 'integer' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      FavoriteEvent: {
        allOf: [
          ref('Event'),
          { type: 'object', properties: { favoritedAt: { type: 'string', format: 'date-time' } } },
        ],
      },
      FavoritePage: {
        type: 'object',
        properties: {
          items: { type: 'array', items: ref('FavoriteEvent') },
          page: { type: 'integer' },
          limit: { type: 'integer' },
          total: { type: 'integer' },
          totalPages: { type: 'integer' },
        },
      },
      CustomerDashboard: {
        type: 'object',
        properties: {
          upcomingBookings: { type: 'array', items: ref('Booking') },
          recentBookings: { type: 'array', items: ref('Booking') },
          favoriteCount: { type: 'integer' },
          confirmedBookings: { type: 'integer' },
          totalSpent: { type: 'number' },
        },
      },
      AdminDashboard: {
        type: 'object',
        properties: {
          totalUsers: { type: 'integer' },
          totalEvents: { type: 'integer' },
          publishedEvents: { type: 'integer' },
          totalBookings: { type: 'integer' },
          confirmedBookings: { type: 'integer' },
          ticketsSold: { type: 'integer' },
          revenue: { type: 'number' },
          recentBookings: { type: 'array', items: ref('Booking') },
        },
      },
    },
  },
  paths: {
    '/api/health': {
      get: {
        summary: 'Health check',
        responses: { 200: ok('Server is running', { type: 'object', properties: { success: { type: 'boolean' }, status: { type: 'string' } } }) },
      },
    },

    // ---------- auth ----------
    '/api/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a customer account',
        requestBody: {
          required: true,
          content: json({
            type: 'object',
            required: ['name', 'email', 'password'],
            properties: {
              name: { type: 'string', minLength: 2, maxLength: 80 },
              email: { type: 'string', format: 'email' },
              password: { type: 'string', minLength: 8, maxLength: 72 },
            },
          }),
        },
        responses: {
          201: ok('Account created', ref('AuthResponse')),
          400: res('BadRequest'),
          409: res('Conflict'),
        },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Log in',
        requestBody: {
          required: true,
          content: json({
            type: 'object',
            required: ['email', 'password'],
            properties: {
              email: { type: 'string', format: 'email', example: 'admin@example.com' },
              password: { type: 'string', example: 'Admin12345' },
            },
          }),
        },
        responses: {
          200: ok('Logged in', ref('AuthResponse')),
          400: res('BadRequest'),
          401: res('Unauthorized'),
          403: res('Forbidden'),
        },
      },
    },
    '/api/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Current user',
        security: bearer,
        responses: {
          200: ok('Current user', { type: 'object', properties: { user: ref('User') } }),
          401: res('Unauthorized'),
          403: res('Forbidden'),
        },
      },
    },
    '/api/users/me': {
      put: {
        tags: ['Profile'],
        summary: 'Update own name and/or password',
        security: bearer,
        requestBody: {
          required: true,
          content: json({
            type: 'object',
            required: ['name'],
            properties: {
              name: { type: 'string', minLength: 2, maxLength: 80 },
              currentPassword: { type: 'string', description: 'Required when newPassword is set' },
              newPassword: { type: 'string', minLength: 8, maxLength: 72 },
            },
          }),
        },
        responses: {
          200: ok('Updated user', { type: 'object', properties: { user: ref('User') } }),
          400: res('BadRequest'),
          401: res('Unauthorized'),
        },
      },
    },

    // ---------- public events ----------
    '/api/events': {
      get: {
        tags: ['Events'],
        summary: 'List published events (search, filters, sorting, pagination)',
        parameters: [
          ...paging,
          q('search', { type: 'string' }, 'Matches title, description, city or venue'),
          q('category', { type: 'string' }),
          q('city', { type: 'string' }),
          q('dateFrom', { type: 'string', format: 'date' }),
          q('dateTo', { type: 'string', format: 'date' }),
          q('priceMin', { type: 'number', minimum: 0 }),
          q('priceMax', { type: 'number', minimum: 0 }),
          q('sort', { type: 'string', enum: ['newest', 'date_asc', 'price_asc', 'price_desc'], default: 'newest' }),
        ],
        responses: { 200: ok('Page of events', ref('EventPage')), 400: res('BadRequest') },
      },
    },
    '/api/events/filters': {
      get: {
        tags: ['Events'],
        summary: 'Categories and cities of published events',
        responses: {
          200: ok('Filter options', {
            type: 'object',
            properties: {
              categories: { type: 'array', items: { type: 'string' } },
              cities: { type: 'array', items: { type: 'string' } },
            },
          }),
        },
      },
    },
    '/api/events/{id}': {
      get: {
        tags: ['Events'],
        summary: 'Event details (drafts are hidden)',
        parameters: [idParam()],
        responses: {
          200: ok('Event', { type: 'object', properties: { event: ref('Event') } }),
          400: res('BadRequest'),
          404: res('NotFound'),
        },
      },
    },

    // ---------- bookings ----------
    '/api/bookings': {
      post: {
        tags: ['Bookings'],
        summary: 'Book tickets (customers only)',
        description: 'Locks the event row, checks availability and reduces available tickets in one transaction.',
        security: bearer,
        requestBody: {
          required: true,
          content: json({
            type: 'object',
            required: ['eventId', 'quantity'],
            properties: {
              eventId: { type: 'integer', minimum: 1 },
              quantity: { type: 'integer', minimum: 1 },
            },
          }),
        },
        responses: {
          201: ok('Booking created', { type: 'object', properties: { booking: ref('Booking') } }),
          400: res('BadRequest'),
          401: res('Unauthorized'),
          403: res('Forbidden'),
          404: res('NotFound'),
          409: res('Conflict'),
        },
      },
    },
    '/api/bookings/my': {
      get: {
        tags: ['Bookings'],
        summary: 'Own bookings',
        security: bearer,
        parameters: [
          ...paging,
          q('status', { type: 'string', enum: ['confirmed', 'cancelled'] }),
          q('sort', { type: 'string', enum: bookingSort, default: 'created_desc' }),
        ],
        responses: {
          200: ok('Page of bookings', ref('BookingPage')),
          401: res('Unauthorized'),
          403: res('Forbidden'),
        },
      },
    },
    '/api/bookings/{id}/cancel': {
      patch: {
        tags: ['Bookings'],
        summary: 'Cancel own booking before the event starts',
        security: bearer,
        parameters: [idParam()],
        responses: {
          200: ok('Cancelled booking', { type: 'object', properties: { booking: ref('Booking') } }),
          401: res('Unauthorized'),
          404: res('NotFound'),
          409: res('Conflict'),
        },
      },
    },

    // ---------- favorites ----------
    '/api/favorites': {
      get: {
        tags: ['Favorites'],
        summary: 'Own favorite events',
        security: bearer,
        parameters: paging,
        responses: { 200: ok('Page of events', ref('FavoritePage')), 401: res('Unauthorized'), 403: res('Forbidden') },
      },
    },
    '/api/favorites/ids': {
      get: {
        tags: ['Favorites'],
        summary: 'Ids of favorite events (for heart icons)',
        security: bearer,
        responses: {
          200: ok('Ids', { type: 'object', properties: { eventIds: { type: 'array', items: { type: 'integer' } } } }),
          401: res('Unauthorized'),
        },
      },
    },
    '/api/favorites/{eventId}': {
      post: {
        tags: ['Favorites'],
        summary: 'Add event to favorites',
        security: bearer,
        parameters: [idParam('eventId')],
        responses: {
          201: ok('Added', { type: 'object', properties: { favorite: ref('Favorite') } }),
          401: res('Unauthorized'),
          404: res('NotFound'),
          409: res('Conflict'),
        },
      },
      delete: {
        tags: ['Favorites'],
        summary: 'Remove event from favorites',
        security: bearer,
        parameters: [idParam('eventId')],
        responses: { 200: ok('Removed'), 401: res('Unauthorized'), 404: res('NotFound') },
      },
    },

    // ---------- dashboards ----------
    '/api/dashboard/my': {
      get: {
        tags: ['Dashboard'],
        summary: 'Customer dashboard',
        security: bearer,
        responses: { 200: ok('Summary', ref('CustomerDashboard')), 401: res('Unauthorized'), 403: res('Forbidden') },
      },
    },
    '/api/admin/dashboard': {
      get: {
        tags: ['Dashboard'],
        summary: 'Admin dashboard metrics',
        security: bearer,
        responses: { 200: ok('Metrics', ref('AdminDashboard')), 401: res('Unauthorized'), 403: res('Forbidden') },
      },
    },

    // ---------- admin: events ----------
    '/api/admin/events': {
      get: {
        tags: ['Admin: events'],
        summary: 'List all events including drafts',
        security: bearer,
        parameters: [
          ...paging,
          q('search', { type: 'string' }),
          q('status', { type: 'string', enum: eventStatuses }),
          q('category', { type: 'string' }),
          q('city', { type: 'string' }),
          q('sort', { type: 'string', enum: ['newest', 'date_asc', 'price_asc', 'price_desc'] }),
        ],
        responses: { 200: ok('Page of events', ref('EventPage')), 401: res('Unauthorized'), 403: res('Forbidden') },
      },
      post: {
        tags: ['Admin: events'],
        summary: 'Create an event (starts as a draft)',
        security: bearer,
        requestBody: { required: true, content: json(ref('EventInput')) },
        responses: {
          201: ok('Created', { type: 'object', properties: { event: ref('Event') } }),
          400: res('BadRequest'),
          401: res('Unauthorized'),
          403: res('Forbidden'),
        },
      },
    },
    '/api/admin/events/{id}': {
      get: {
        tags: ['Admin: events'],
        summary: 'Event details including drafts',
        security: bearer,
        parameters: [idParam()],
        responses: {
          200: ok('Event', { type: 'object', properties: { event: ref('Event') } }),
          401: res('Unauthorized'),
          403: res('Forbidden'),
          404: res('NotFound'),
        },
      },
      put: {
        tags: ['Admin: events'],
        summary: 'Update an event (cancelled and completed events are locked)',
        security: bearer,
        parameters: [idParam()],
        requestBody: { required: true, content: json(ref('EventInput')) },
        responses: {
          200: ok('Updated', { type: 'object', properties: { event: ref('Event') } }),
          400: res('BadRequest'),
          401: res('Unauthorized'),
          403: res('Forbidden'),
          404: res('NotFound'),
          409: res('Conflict'),
        },
      },
      delete: {
        tags: ['Admin: events'],
        summary: 'Delete an event without active bookings',
        security: bearer,
        parameters: [idParam()],
        responses: {
          200: ok('Deleted'),
          401: res('Unauthorized'),
          403: res('Forbidden'),
          404: res('NotFound'),
          409: res('Conflict'),
        },
      },
    },
    '/api/admin/events/{id}/status': {
      patch: {
        tags: ['Admin: events'],
        summary: 'Change event status',
        description:
          'Allowed: draft → published, draft → cancelled, published → cancelled, published → completed. ' +
          'Cancelling an event cancels its confirmed bookings and releases the tickets.',
        security: bearer,
        parameters: [idParam()],
        requestBody: {
          required: true,
          content: json({
            type: 'object',
            required: ['status'],
            properties: { status: { type: 'string', enum: eventStatuses } },
          }),
        },
        responses: {
          200: ok('Updated', { type: 'object', properties: { event: ref('Event') } }),
          400: res('BadRequest'),
          401: res('Unauthorized'),
          403: res('Forbidden'),
          404: res('NotFound'),
          409: res('Conflict'),
        },
      },
    },
    '/api/admin/events/{id}/image': {
      post: {
        tags: ['Admin: events'],
        summary: 'Upload or replace the cover image (jpg, png, webp, up to 2 MB)',
        security: bearer,
        parameters: [idParam()],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['image'],
                properties: { image: { type: 'string', format: 'binary' } },
              },
            },
          },
        },
        responses: {
          200: ok('Updated', { type: 'object', properties: { event: ref('Event') } }),
          400: res('BadRequest'),
          401: res('Unauthorized'),
          403: res('Forbidden'),
          404: res('NotFound'),
        },
      },
    },

    // ---------- admin: bookings & users ----------
    '/api/admin/bookings': {
      get: {
        tags: ['Admin: bookings'],
        summary: 'All bookings',
        security: bearer,
        parameters: [
          ...paging,
          q('status', { type: 'string', enum: ['confirmed', 'cancelled'] }),
          q('userId', { type: 'integer' }),
          q('eventId', { type: 'integer' }),
          q('sort', { type: 'string', enum: bookingSort, default: 'created_desc' }),
        ],
        responses: { 200: ok('Page of bookings', ref('BookingPage')), 401: res('Unauthorized'), 403: res('Forbidden') },
      },
    },
    '/api/admin/users': {
      get: {
        tags: ['Admin: users'],
        summary: 'List users',
        security: bearer,
        parameters: [
          ...paging,
          q('search', { type: 'string' }, 'Matches name or email'),
          q('role', { type: 'string', enum: ['customer', 'admin'] }),
          q('status', { type: 'string', enum: ['active', 'blocked'] }),
        ],
        responses: { 200: ok('Page of users', ref('UserPage')), 401: res('Unauthorized'), 403: res('Forbidden') },
      },
    },
    '/api/admin/users/{id}': {
      patch: {
        tags: ['Admin: users'],
        summary: 'Change role or block/unblock a user (not yourself)',
        security: bearer,
        parameters: [idParam()],
        requestBody: {
          required: true,
          content: json({
            type: 'object',
            properties: {
              role: { type: 'string', enum: ['customer', 'admin'] },
              status: { type: 'string', enum: ['active', 'blocked'] },
            },
          }),
        },
        responses: {
          200: ok('Updated', { type: 'object', properties: { user: ref('User') } }),
          400: res('BadRequest'),
          401: res('Unauthorized'),
          403: res('Forbidden'),
          404: res('NotFound'),
          409: res('Conflict'),
        },
      },
    },
  },
};