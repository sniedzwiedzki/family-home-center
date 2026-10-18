/** An error whose message is meant for the person using the app, already in Polish. */
export class UserFacingError extends Error {}

export const describeFailure = (error: unknown, fallback: string): string =>
  error instanceof UserFacingError ? error.message : fallback
