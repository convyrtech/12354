import type { CourierApiErrorCode } from "@/lib/courier/types";

type CourierDomainErrorOptions = {
  code: CourierApiErrorCode;
  message: string;
  statusCode: number;
  cause?: unknown;
};

export class CourierDomainError extends Error {
  readonly code: CourierApiErrorCode;
  readonly statusCode: number;

  constructor({ code, message, statusCode, cause }: CourierDomainErrorOptions) {
    super(message, cause ? { cause } : undefined);
    this.name = "CourierDomainError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class CourierValidationError extends CourierDomainError {
  constructor(message: string, cause?: unknown) {
    super({
      code: "invalid_request",
      message,
      statusCode: 400,
      cause,
    });
    this.name = "CourierValidationError";
  }
}

export class CourierAuthError extends CourierDomainError {
  constructor(message = "Courier authentication is required.", cause?: unknown) {
    super({
      code: "unauthorized",
      message,
      statusCode: 401,
      cause,
    });
    this.name = "CourierAuthError";
  }
}

export class CourierNotFoundError extends CourierDomainError {
  constructor(message = "Courier resource was not found.", cause?: unknown) {
    super({
      code: "not_found",
      message,
      statusCode: 404,
      cause,
    });
    this.name = "CourierNotFoundError";
  }
}

export class CourierConflictError extends CourierDomainError {
  constructor(message: string, cause?: unknown) {
    super({
      code: "conflict",
      message,
      statusCode: 409,
      cause,
    });
    this.name = "CourierConflictError";
  }
}

export class CourierTransitionError extends CourierDomainError {
  constructor(message: string, cause?: unknown) {
    super({
      code: "unsupported_transition",
      message,
      statusCode: 409,
      cause,
    });
    this.name = "CourierTransitionError";
  }
}

export class CourierTrackingTokenError extends CourierDomainError {
  constructor(code: "tracking_token_invalid" | "tracking_token_expired", message: string) {
    super({
      code,
      message,
      statusCode: 404,
    });
    this.name = "CourierTrackingTokenError";
  }
}
