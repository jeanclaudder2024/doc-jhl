import { z } from 'zod';
import { insertProposalSchema, proposals, insertProposalItemSchema } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
};

export const api = {
  proposals: {
    list: {
      method: 'GET' as const,
      path: '/api/proposals',
      responses: {
        200: z.array(z.custom<any>()), // Typed as ProposalResponse[] in implementation
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/proposals/:id',
      responses: {
        200: z.custom<any>(), // Typed as ProposalResponse
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/proposals',
      input: insertProposalSchema.extend({
        items: z.array(insertProposalItemSchema.omit({ proposalId: true })).optional()
      }),
      responses: {
        201: z.custom<any>(), // Typed as ProposalResponse
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/proposals/:id',
      input: insertProposalSchema.partial().extend({
        items: z.array(insertProposalItemSchema.omit({ proposalId: true }).extend({ id: z.number().optional() })).optional()
      }),
      responses: {
        200: z.custom<any>(), // Typed as ProposalResponse
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/proposals/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized,
      },
    },
    // Public access for viewing/signing
    getByToken: { // In a real app we'd use a secure token, here we might just use ID for MVP
      method: 'GET' as const,
      path: '/api/public/proposals/:id',
      responses: {
        200: z.custom<any>(),
        404: errorSchemas.notFound,
      },
    },
    sign: {
      method: 'POST' as const,
      path: '/api/public/proposals/:id/sign',
      input: z.object({
        role: z.enum(['noviq', 'licensee']),
        signature: z.string(), // Data URI
      }),
      responses: {
        200: z.custom<any>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    publicUpdate: {
      method: 'PUT' as const,
      path: '/api/public/proposals/:id',
      input: z.object({
        paymentOption: z.enum(['full', 'milestone', 'custom']).optional(),
        paymentTerms: z.any().optional(),
        domainPackageFee: z.union([z.string(), z.number()]).optional(),
      }),
      responses: {
        200: z.custom<any>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
