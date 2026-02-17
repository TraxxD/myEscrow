const { z } = require('zod');

const registerSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be at most 20 characters')
    .regex(/^[a-zA-Z0-9]+$/, 'Username must be alphanumeric'),
  email: z.string().email('Invalid email format'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

const createEscrowSchema = z.object({
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters')
    .max(100, 'Title must be at most 100 characters'),
  amount: z
    .number({ coerce: true })
    .positive('Amount must be positive')
    .max(21_000_000, 'Amount cannot exceed 21 million'),
  sellerUsername: z.string().min(1, 'Seller username is required'),
  description: z.string().max(500, 'Description must be at most 500 characters').optional().default(''),
  expiresInDays: z.number({ coerce: true }).int().min(1).max(90).optional().default(14),
});

const fundEscrowSchema = z.object({}).passthrough();

const deliverSchema = z.object({
  trackingInfo: z.string().optional(),
  notes: z.string().max(500, 'Notes must be at most 500 characters').optional(),
});

const disputeSchema = z.object({
  reason: z
    .string()
    .min(10, 'Reason must be at least 10 characters')
    .max(500, 'Reason must be at most 500 characters'),
  evidence: z.string().max(1000, 'Evidence must be at most 1000 characters').optional(),
});

const resolveSchema = z.object({
  ruling: z.enum(['BUYER', 'SELLER'], { message: 'Ruling must be BUYER or SELLER' }),
  splitPercentage: z.number({ coerce: true }).min(1).max(100).optional().default(100),
  notes: z.string().max(500, 'Notes must be at most 500 characters').optional(),
});

module.exports = {
  registerSchema,
  loginSchema,
  createEscrowSchema,
  fundEscrowSchema,
  deliverSchema,
  disputeSchema,
  resolveSchema,
};
