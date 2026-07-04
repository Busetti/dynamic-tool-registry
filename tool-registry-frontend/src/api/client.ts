import axios, { AxiosError } from 'axios';
import type { ProblemDetail } from './types';

export const apiClient = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

/** Extracts a human-readable message from an RFC 7807 problem response. */
export function errorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const problem = (error as AxiosError<ProblemDetail>).response?.data;
    if (problem?.violations?.length) {
      return problem.violations.join('; ');
    }
    if (problem?.detail) {
      return problem.detail;
    }
    return error.message;
  }
  return error instanceof Error ? error.message : 'Unexpected error';
}
