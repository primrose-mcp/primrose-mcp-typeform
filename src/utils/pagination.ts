/**
 * Pagination Utilities
 *
 * Helpers for handling pagination for Typeform API.
 */

import type { PaginatedResponse, PaginationParams } from '../types/entities.js';

/**
 * Default pagination settings
 */
export const PAGINATION_DEFAULTS = {
  pageSize: 10,
  maxPageSize: 200,
} as const;

/**
 * Normalize pagination parameters
 */
export function normalizePaginationParams(
  params?: PaginationParams,
  maxPageSize = PAGINATION_DEFAULTS.maxPageSize
): Required<PaginationParams> {
  return {
    page: params?.page || 1,
    pageSize: Math.min(params?.pageSize || PAGINATION_DEFAULTS.pageSize, maxPageSize),
  };
}

/**
 * Create an empty paginated response
 */
export function emptyPaginatedResponse<T>(): PaginatedResponse<T> {
  return {
    items: [],
    totalItems: 0,
    pageCount: 0,
  };
}

/**
 * Create a paginated response from an array
 */
export function createPaginatedResponse<T>(
  items: T[],
  options: {
    totalItems?: number;
    pageCount?: number;
  } = {}
): PaginatedResponse<T> {
  return {
    items,
    totalItems: options.totalItems ?? items.length,
    pageCount: options.pageCount ?? 1,
  };
}
