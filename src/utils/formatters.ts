/**
 * Response Formatting Utilities
 *
 * Helpers for formatting tool responses in JSON or Markdown.
 */

import type {
  Form,
  FormResponse,
  PaginatedResponse,
  ResponseFormat,
  Theme,
  Webhook,
  Workspace,
} from '../types/entities.js';
import { TypeformApiError, formatErrorForLogging } from './errors.js';

/**
 * MCP tool response type
 * Note: Index signature required for MCP SDK 1.25+ compatibility
 */
export interface ToolResponse {
  [key: string]: unknown;
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}

/**
 * Format a successful response
 */
export function formatResponse(
  data: unknown,
  format: ResponseFormat,
  entityType: string
): ToolResponse {
  if (format === 'markdown') {
    return {
      content: [{ type: 'text', text: formatAsMarkdown(data, entityType) }],
    };
  }
  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
  };
}

/**
 * Format an error response
 */
export function formatError(error: unknown): ToolResponse {
  const errorInfo = formatErrorForLogging(error);

  let message: string;
  if (error instanceof TypeformApiError) {
    message = `Error: ${error.message}`;
    if (error.retryable) {
      message += ' (retryable)';
    }
  } else if (error instanceof Error) {
    message = `Error: ${error.message}`;
  } else {
    message = `Error: ${String(error)}`;
  }

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({ error: message, details: errorInfo }, null, 2),
      },
    ],
    isError: true,
  };
}

/**
 * Format data as Markdown
 */
function formatAsMarkdown(data: unknown, entityType: string): string {
  if (isPaginatedResponse(data)) {
    return formatPaginatedAsMarkdown(data, entityType);
  }

  if (Array.isArray(data)) {
    return formatArrayAsMarkdown(data, entityType);
  }

  if (typeof data === 'object' && data !== null) {
    return formatObjectAsMarkdown(data as Record<string, unknown>, entityType);
  }

  return String(data);
}

/**
 * Type guard for paginated response
 */
function isPaginatedResponse(data: unknown): data is PaginatedResponse<unknown> {
  return (
    typeof data === 'object' &&
    data !== null &&
    'items' in data &&
    Array.isArray((data as PaginatedResponse<unknown>).items)
  );
}

/**
 * Format paginated response as Markdown
 */
function formatPaginatedAsMarkdown(data: PaginatedResponse<unknown>, entityType: string): string {
  const lines: string[] = [];

  lines.push(`## ${capitalize(entityType)}`);
  lines.push('');
  lines.push(`**Total:** ${data.totalItems} | **Pages:** ${data.pageCount}`);
  lines.push('');

  if (data.items.length === 0) {
    lines.push('_No items found._');
    return lines.join('\n');
  }

  // Format items based on entity type
  switch (entityType) {
    case 'forms':
      lines.push(formatFormsTable(data.items as Form[]));
      break;
    case 'workspaces':
      lines.push(formatWorkspacesTable(data.items as Workspace[]));
      break;
    case 'themes':
      lines.push(formatThemesTable(data.items as Theme[]));
      break;
    case 'responses':
      lines.push(formatResponsesTable(data.items as FormResponse[]));
      break;
    case 'webhooks':
      lines.push(formatWebhooksTable(data.items as Webhook[]));
      break;
    default:
      lines.push(formatGenericTable(data.items));
  }

  return lines.join('\n');
}

/**
 * Format forms as Markdown table
 */
function formatFormsTable(forms: Form[]): string {
  const lines: string[] = [];
  lines.push('| ID | Title | Public | Last Updated |');
  lines.push('|---|---|---|---|');

  for (const form of forms) {
    lines.push(
      `| ${form.id} | ${form.title} | ${form.settings?.isPublic ? 'Yes' : 'No'} | ${form.lastUpdatedAt || '-'} |`
    );
  }

  return lines.join('\n');
}

/**
 * Format workspaces as Markdown table
 */
function formatWorkspacesTable(workspaces: Workspace[]): string {
  const lines: string[] = [];
  lines.push('| ID | Name | Shared | Forms |');
  lines.push('|---|---|---|---|');

  for (const workspace of workspaces) {
    lines.push(
      `| ${workspace.id} | ${workspace.name} | ${workspace.shared ? 'Yes' : 'No'} | ${workspace.forms?.count || 0} |`
    );
  }

  return lines.join('\n');
}

/**
 * Format themes as Markdown table
 */
function formatThemesTable(themes: Theme[]): string {
  const lines: string[] = [];
  lines.push('| ID | Name | Visibility | Font |');
  lines.push('|---|---|---|---|');

  for (const theme of themes) {
    lines.push(
      `| ${theme.id} | ${theme.name || '-'} | ${theme.visibility || '-'} | ${theme.font || '-'} |`
    );
  }

  return lines.join('\n');
}

/**
 * Format responses as Markdown table
 */
function formatResponsesTable(responses: FormResponse[]): string {
  const lines: string[] = [];
  lines.push('| Response ID | Submitted At | Score | Answers |');
  lines.push('|---|---|---|---|');

  for (const response of responses) {
    const score = response.calculated?.score !== undefined ? String(response.calculated.score) : '-';
    const answersCount = response.answers?.length || 0;
    lines.push(
      `| ${response.responseId} | ${response.submittedAt || response.landedAt} | ${score} | ${answersCount} |`
    );
  }

  return lines.join('\n');
}

/**
 * Format webhooks as Markdown table
 */
function formatWebhooksTable(webhooks: Webhook[]): string {
  const lines: string[] = [];
  lines.push('| Tag | URL | Enabled | Created At |');
  lines.push('|---|---|---|---|');

  for (const webhook of webhooks) {
    lines.push(
      `| ${webhook.tag} | ${webhook.url} | ${webhook.enabled ? 'Yes' : 'No'} | ${webhook.createdAt || '-'} |`
    );
  }

  return lines.join('\n');
}

/**
 * Format a generic array as Markdown table
 */
function formatGenericTable(items: unknown[]): string {
  if (items.length === 0) return '_No items_';

  const first = items[0] as Record<string, unknown>;
  const keys = Object.keys(first).slice(0, 5); // Limit columns

  const lines: string[] = [];
  lines.push(`| ${keys.join(' | ')} |`);
  lines.push(`|${keys.map(() => '---').join('|')}|`);

  for (const item of items) {
    const record = item as Record<string, unknown>;
    const values = keys.map((k) => String(record[k] ?? '-'));
    lines.push(`| ${values.join(' | ')} |`);
  }

  return lines.join('\n');
}

/**
 * Format an array as Markdown
 */
function formatArrayAsMarkdown(data: unknown[], entityType: string): string {
  switch (entityType) {
    case 'forms':
      return formatFormsTable(data as Form[]);
    case 'workspaces':
      return formatWorkspacesTable(data as Workspace[]);
    case 'themes':
      return formatThemesTable(data as Theme[]);
    case 'responses':
      return formatResponsesTable(data as FormResponse[]);
    case 'webhooks':
      return formatWebhooksTable(data as Webhook[]);
    default:
      return formatGenericTable(data);
  }
}

/**
 * Format a single object as Markdown
 */
function formatObjectAsMarkdown(data: Record<string, unknown>, entityType: string): string {
  const lines: string[] = [];
  lines.push(`## ${capitalize(entityType.replace(/s$/, ''))}`);
  lines.push('');

  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined) continue;

    if (typeof value === 'object') {
      lines.push(`**${formatKey(key)}:**`);
      lines.push('```json');
      lines.push(JSON.stringify(value, null, 2));
      lines.push('```');
    } else {
      lines.push(`**${formatKey(key)}:** ${value}`);
    }
  }

  return lines.join('\n');
}

/**
 * Capitalize first letter
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Format a key for display (camelCase to Title Case)
 */
function formatKey(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}
