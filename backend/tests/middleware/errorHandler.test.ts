import { Request, Response, NextFunction } from 'express';
import { createError, errorHandler, AppError } from '../../src/middleware/errorHandler';

jest.mock('../../src/utils/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), http: jest.fn() },
}));

describe('createError', () => {
  it('creates an error with the given message and status code', () => {
    const err = createError('Not Found', 404);
    expect(err.message).toBe('Not Found');
    expect(err.statusCode).toBe(404);
    expect(err.isOperational).toBe(true);
  });

  it('creates an instance of Error', () => {
    const err = createError('Test Error', 500);
    expect(err).toBeInstanceOf(Error);
  });

  it('creates errors with different status codes', () => {
    expect(createError('Unauthorized', 401).statusCode).toBe(401);
    expect(createError('Forbidden', 403).statusCode).toBe(403);
    expect(createError('Conflict', 409).statusCode).toBe(409);
  });
});

describe('errorHandler', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    mockReq = {};
    mockRes = { status: statusMock, json: jsonMock };
    mockNext = jest.fn();
  });

  it('responds with statusCode from an operational error', () => {
    const err = createError('Bad Request', 400);
    errorHandler(err, mockReq as Request, mockRes as Response, mockNext);
    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ error: 'Bad Request' }));
  });

  it('responds with 500 and generic message for non-operational errors', () => {
    const err = new Error('Something internal') as AppError;
    errorHandler(err, mockReq as Request, mockRes as Response, mockNext);
    expect(statusMock).toHaveBeenCalledWith(500);
    expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ error: 'Internal Server Error' }));
  });

  it('defaults to status 500 when statusCode is not set', () => {
    const err = new Error('Unexpected') as AppError;
    err.statusCode = undefined;
    errorHandler(err, mockReq as Request, mockRes as Response, mockNext);
    expect(statusMock).toHaveBeenCalledWith(500);
  });

  it('includes stack trace in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    const err = createError('Dev Error', 400);
    errorHandler(err, mockReq as Request, mockRes as Response, mockNext);
    expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ stack: expect.any(String) }));
    process.env.NODE_ENV = originalEnv;
  });

  it('does not include stack trace outside development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const err = createError('Prod Error', 400);
    errorHandler(err, mockReq as Request, mockRes as Response, mockNext);
    const callArg = jsonMock.mock.calls[0][0];
    expect(callArg).not.toHaveProperty('stack');
    process.env.NODE_ENV = originalEnv;
  });
});
