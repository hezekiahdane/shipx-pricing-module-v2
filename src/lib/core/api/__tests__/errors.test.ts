import { describe, expect, it } from 'vitest';
import {
  AppError,
  ForbiddenError,
  NotFoundError,
  RateLimitError,
  UnauthorizedError,
  ValidationError,
} from '../errors';

describe('AppError', () => {
  it('creates an error with status code and message', () => {
    const error = new AppError('Something went wrong', 500);
    expect(error.message).toBe('Something went wrong');
    expect(error.statusCode).toBe(500);
    expect(error).toBeInstanceOf(Error);
  });
});

describe('ValidationError', () => {
  it('has status code 422', () => {
    const error = new ValidationError('Invalid input');
    expect(error.statusCode).toBe(422);
    expect(error.message).toBe('Invalid input');
  });
});

describe('NotFoundError', () => {
  it('has status code 404', () => {
    const error = new NotFoundError('Resource not found');
    expect(error.statusCode).toBe(404);
  });
});

describe('UnauthorizedError', () => {
  it('has status code 401', () => {
    const error = new UnauthorizedError();
    expect(error.statusCode).toBe(401);
    expect(error.message).toBe('Unauthorized');
  });
});

describe('ForbiddenError', () => {
  it('has status code 403', () => {
    const error = new ForbiddenError();
    expect(error.statusCode).toBe(403);
  });
});

describe('RateLimitError', () => {
  it('has status code 429', () => {
    const error = new RateLimitError();
    expect(error.statusCode).toBe(429);
    expect(error.message).toBe('Too many requests');
  });
});
