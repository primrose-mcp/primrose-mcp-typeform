/**
 * Typeform Tools
 *
 * MCP tools for Typeform API operations.
 * Implements all Typeform API endpoints including:
 * - Forms, Responses, Workspaces, Themes, Images, Webhooks
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { TypeformClient } from '../client.js';
import { formatError, formatResponse } from '../utils/formatters.js';

/**
 * Register all Typeform tools
 */
export function registerTypeformTools(server: McpServer, client: TypeformClient): void {
  registerConnectionTools(server, client);
  registerFormTools(server, client);
  registerResponseTools(server, client);
  registerWorkspaceTools(server, client);
  registerThemeTools(server, client);
  registerImageTools(server, client);
  registerWebhookTools(server, client);
}

// =============================================================================
// Connection / User Tools
// =============================================================================

function registerConnectionTools(server: McpServer, client: TypeformClient): void {
  server.tool(
    'typeform_test_connection',
    `Test the connection to Typeform API.

Returns connection status and user information if successful.`,
    {},
    async () => {
      try {
        const result = await client.testConnection();
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        return formatError(error);
      }
    }
  );

  server.tool(
    'typeform_get_me',
    `Get the current user's information.

Returns the user's alias, email, and language setting.`,
    {},
    async () => {
      try {
        const user = await client.getMe();
        return formatResponse(user, 'json', 'user');
      } catch (error) {
        return formatError(error);
      }
    }
  );
}

// =============================================================================
// Form Tools
// =============================================================================

function registerFormTools(server: McpServer, client: TypeformClient): void {
  server.tool(
    'typeform_list_forms',
    `List forms from your Typeform account.

Returns a paginated list of forms with basic information.

Args:
  - page: Page number (1-based, default: 1)
  - pageSize: Results per page (1-200, default: 10)
  - search: Filter results containing this string
  - workspaceId: Filter forms in a specific workspace
  - sortBy: Sort by 'created_at' or 'last_updated_at'
  - orderBy: Sort order 'asc' or 'desc'
  - format: Response format ('json' or 'markdown')`,
    {
      page: z.number().int().min(1).default(1).describe('Page number'),
      pageSize: z.number().int().min(1).max(200).default(10).describe('Results per page'),
      search: z.string().optional().describe('Filter results containing this string'),
      workspaceId: z.string().optional().describe('Filter forms in a specific workspace'),
      sortBy: z.enum(['created_at', 'last_updated_at']).optional().describe('Sort field'),
      orderBy: z.enum(['asc', 'desc']).optional().describe('Sort order'),
      format: z.enum(['json', 'markdown']).default('json').describe('Response format'),
    },
    async ({ page, pageSize, search, workspaceId, sortBy, orderBy, format }) => {
      try {
        const result = await client.listForms({ page, pageSize, search, workspaceId, sortBy, orderBy });
        return formatResponse(result, format, 'forms');
      } catch (error) {
        return formatError(error);
      }
    }
  );

  server.tool(
    'typeform_get_form',
    `Get a single form by its ID.

Returns the complete form configuration including fields, settings, and logic.

Args:
  - formId: The form ID (found in form URL)
  - format: Response format ('json' or 'markdown')`,
    {
      formId: z.string().describe('Form ID'),
      format: z.enum(['json', 'markdown']).default('json'),
    },
    async ({ formId, format }) => {
      try {
        const form = await client.getForm(formId);
        return formatResponse(form, format, 'form');
      } catch (error) {
        return formatError(error);
      }
    }
  );

  server.tool(
    'typeform_create_form',
    `Create a new form in Typeform.

Args:
  - title: Form title (required)
  - type: Form type ('form' or 'quiz')
  - workspaceHref: Workspace URL (e.g., 'https://api.typeform.com/workspaces/abc123')
  - themeHref: Theme URL (e.g., 'https://api.typeform.com/themes/abc123')
  - fields: JSON array of field definitions
  - settings: JSON object with form settings

Returns the created form with its ID.`,
    {
      title: z.string().describe('Form title'),
      type: z.enum(['form', 'quiz']).optional().describe('Form type'),
      workspaceHref: z.string().optional().describe('Workspace URL'),
      themeHref: z.string().optional().describe('Theme URL'),
      fields: z.string().optional().describe('JSON array of field definitions'),
      settings: z.string().optional().describe('JSON object with form settings'),
    },
    async ({ title, type, workspaceHref, themeHref, fields, settings }) => {
      try {
        const input: Parameters<typeof client.createForm>[0] = { title };
        if (type) input.type = type;
        if (workspaceHref) input.workspace = { href: workspaceHref };
        if (themeHref) input.theme = { href: themeHref };
        if (fields) input.fields = JSON.parse(fields);
        if (settings) input.settings = JSON.parse(settings);

        const form = await client.createForm(input);
        return {
          content: [
            { type: 'text', text: JSON.stringify({ success: true, message: 'Form created', form }, null, 2) },
          ],
        };
      } catch (error) {
        return formatError(error);
      }
    }
  );

  server.tool(
    'typeform_update_form',
    `Update an existing form (full replacement).

WARNING: This overwrites the entire form. Include all existing fields with their IDs to preserve them.

Args:
  - formId: Form ID to update
  - title: Form title
  - fields: JSON array of all field definitions (include existing field IDs)
  - settings: JSON object with form settings

Returns the updated form.`,
    {
      formId: z.string().describe('Form ID to update'),
      title: z.string().describe('Form title'),
      fields: z.string().optional().describe('JSON array of all field definitions'),
      settings: z.string().optional().describe('JSON object with form settings'),
    },
    async ({ formId, title, fields, settings }) => {
      try {
        const input: Parameters<typeof client.updateForm>[1] = { title };
        if (fields) input.fields = JSON.parse(fields);
        if (settings) input.settings = JSON.parse(settings);

        const form = await client.updateForm(formId, input);
        return {
          content: [
            { type: 'text', text: JSON.stringify({ success: true, message: 'Form updated', form }, null, 2) },
          ],
        };
      } catch (error) {
        return formatError(error);
      }
    }
  );

  server.tool(
    'typeform_patch_form',
    `Partially update a form (specific properties only).

Args:
  - formId: Form ID to update
  - operations: JSON array of patch operations [{ op: "replace", path: "/title", value: "New Title" }]

Common paths: /title, /settings/is_public, /workspace/href, /theme/href`,
    {
      formId: z.string().describe('Form ID to update'),
      operations: z.string().describe('JSON array of patch operations'),
    },
    async ({ formId, operations }) => {
      try {
        await client.patchForm(formId, JSON.parse(operations));
        return {
          content: [{ type: 'text', text: JSON.stringify({ success: true, message: 'Form patched' }, null, 2) }],
        };
      } catch (error) {
        return formatError(error);
      }
    }
  );

  server.tool(
    'typeform_delete_form',
    `Delete a form and all its responses.

WARNING: This permanently deletes the form and all collected responses.

Args:
  - formId: Form ID to delete`,
    {
      formId: z.string().describe('Form ID to delete'),
    },
    async ({ formId }) => {
      try {
        await client.deleteForm(formId);
        return {
          content: [{ type: 'text', text: JSON.stringify({ success: true, message: `Form ${formId} deleted` }, null, 2) }],
        };
      } catch (error) {
        return formatError(error);
      }
    }
  );

  server.tool(
    'typeform_get_form_messages',
    `Get custom messages for a form.

Returns the customizable UI messages (button labels, error messages, etc.) for the form.

Args:
  - formId: Form ID`,
    {
      formId: z.string().describe('Form ID'),
    },
    async ({ formId }) => {
      try {
        const messages = await client.getFormMessages(formId);
        return formatResponse(messages, 'json', 'messages');
      } catch (error) {
        return formatError(error);
      }
    }
  );

  server.tool(
    'typeform_update_form_messages',
    `Update custom messages for a form.

Args:
  - formId: Form ID
  - messages: JSON object with message key-value pairs`,
    {
      formId: z.string().describe('Form ID'),
      messages: z.string().describe('JSON object with message key-value pairs'),
    },
    async ({ formId, messages }) => {
      try {
        await client.updateFormMessages(formId, JSON.parse(messages));
        return {
          content: [{ type: 'text', text: JSON.stringify({ success: true, message: 'Messages updated' }, null, 2) }],
        };
      } catch (error) {
        return formatError(error);
      }
    }
  );
}

// =============================================================================
// Response Tools
// =============================================================================

function registerResponseTools(server: McpServer, client: TypeformClient): void {
  server.tool(
    'typeform_list_responses',
    `Get responses for a form.

Note: Very recent responses (within ~30 minutes) may not be returned.

Args:
  - formId: Form ID
  - pageSize: Results per page (1-1000, default: 25)
  - since: Filter responses submitted after this date (ISO 8601)
  - until: Filter responses submitted before this date (ISO 8601)
  - after: Pagination token for next page
  - before: Pagination token for previous page
  - completed: Filter by completion status
  - query: Search across all answer and hidden fields
  - format: Response format ('json' or 'markdown')`,
    {
      formId: z.string().describe('Form ID'),
      pageSize: z.number().int().min(1).max(1000).default(25).describe('Results per page'),
      since: z.string().optional().describe('Filter responses after this date (ISO 8601)'),
      until: z.string().optional().describe('Filter responses before this date (ISO 8601)'),
      after: z.string().optional().describe('Pagination token for next page'),
      before: z.string().optional().describe('Pagination token for previous page'),
      completed: z.boolean().optional().describe('Filter by completion status'),
      query: z.string().optional().describe('Search across all fields'),
      format: z.enum(['json', 'markdown']).default('json'),
    },
    async ({ formId, pageSize, since, until, after, before, completed, query, format }) => {
      try {
        const result = await client.listResponses(formId, { pageSize, since, until, after, before, completed, query });
        return formatResponse(result, format, 'responses');
      } catch (error) {
        return formatError(error);
      }
    }
  );

  server.tool(
    'typeform_delete_responses',
    `Delete specific responses from a form.

Args:
  - formId: Form ID
  - responseIds: Comma-separated list of response IDs to delete (max 1000)`,
    {
      formId: z.string().describe('Form ID'),
      responseIds: z.string().describe('Comma-separated list of response IDs'),
    },
    async ({ formId, responseIds }) => {
      try {
        const ids = responseIds.split(',').map((id) => id.trim());
        await client.deleteResponses(formId, ids);
        return {
          content: [
            { type: 'text', text: JSON.stringify({ success: true, message: `Deleted ${ids.length} responses` }, null, 2) },
          ],
        };
      } catch (error) {
        return formatError(error);
      }
    }
  );
}

// =============================================================================
// Workspace Tools
// =============================================================================

function registerWorkspaceTools(server: McpServer, client: TypeformClient): void {
  server.tool(
    'typeform_list_workspaces',
    `List workspaces in your Typeform account.

Args:
  - page: Page number (1-based, default: 1)
  - pageSize: Results per page (1-200, default: 10)
  - search: Filter results containing this string
  - format: Response format ('json' or 'markdown')`,
    {
      page: z.number().int().min(1).default(1),
      pageSize: z.number().int().min(1).max(200).default(10),
      search: z.string().optional(),
      format: z.enum(['json', 'markdown']).default('json'),
    },
    async ({ page, pageSize, search, format }) => {
      try {
        const result = await client.listWorkspaces({ page, pageSize, search });
        return formatResponse(result, format, 'workspaces');
      } catch (error) {
        return formatError(error);
      }
    }
  );

  server.tool(
    'typeform_get_workspace',
    `Get a single workspace by ID.

Args:
  - workspaceId: Workspace ID
  - format: Response format`,
    {
      workspaceId: z.string().describe('Workspace ID'),
      format: z.enum(['json', 'markdown']).default('json'),
    },
    async ({ workspaceId, format }) => {
      try {
        const workspace = await client.getWorkspace(workspaceId);
        return formatResponse(workspace, format, 'workspace');
      } catch (error) {
        return formatError(error);
      }
    }
  );

  server.tool(
    'typeform_create_workspace',
    `Create a new workspace.

Args:
  - name: Workspace name`,
    {
      name: z.string().describe('Workspace name'),
    },
    async ({ name }) => {
      try {
        const workspace = await client.createWorkspace({ name });
        return {
          content: [
            { type: 'text', text: JSON.stringify({ success: true, message: 'Workspace created', workspace }, null, 2) },
          ],
        };
      } catch (error) {
        return formatError(error);
      }
    }
  );

  server.tool(
    'typeform_update_workspace',
    `Update a workspace (rename or manage members).

Args:
  - workspaceId: Workspace ID
  - operations: JSON array of patch operations

Examples:
  Rename: [{ "op": "replace", "path": "/name", "value": "New Name" }]
  Add member: [{ "op": "add", "path": "/members", "value": { "email": "user@example.com", "role": "member" } }]
  Remove member: [{ "op": "remove", "path": "/members", "value": { "email": "user@example.com" } }]`,
    {
      workspaceId: z.string().describe('Workspace ID'),
      operations: z.string().describe('JSON array of patch operations'),
    },
    async ({ workspaceId, operations }) => {
      try {
        await client.updateWorkspace(workspaceId, JSON.parse(operations));
        return {
          content: [{ type: 'text', text: JSON.stringify({ success: true, message: 'Workspace updated' }, null, 2) }],
        };
      } catch (error) {
        return formatError(error);
      }
    }
  );

  server.tool(
    'typeform_delete_workspace',
    `Delete a workspace.

Args:
  - workspaceId: Workspace ID to delete`,
    {
      workspaceId: z.string().describe('Workspace ID to delete'),
    },
    async ({ workspaceId }) => {
      try {
        await client.deleteWorkspace(workspaceId);
        return {
          content: [
            { type: 'text', text: JSON.stringify({ success: true, message: `Workspace ${workspaceId} deleted` }, null, 2) },
          ],
        };
      } catch (error) {
        return formatError(error);
      }
    }
  );
}

// =============================================================================
// Theme Tools
// =============================================================================

function registerThemeTools(server: McpServer, client: TypeformClient): void {
  server.tool(
    'typeform_list_themes',
    `List themes in your Typeform account.

Args:
  - page: Page number (1-based, default: 1)
  - pageSize: Results per page (1-200, default: 10)
  - format: Response format`,
    {
      page: z.number().int().min(1).default(1),
      pageSize: z.number().int().min(1).max(200).default(10),
      format: z.enum(['json', 'markdown']).default('json'),
    },
    async ({ page, pageSize, format }) => {
      try {
        const result = await client.listThemes({ page, pageSize });
        return formatResponse(result, format, 'themes');
      } catch (error) {
        return formatError(error);
      }
    }
  );

  server.tool(
    'typeform_get_theme',
    `Get a single theme by ID.

Args:
  - themeId: Theme ID
  - format: Response format`,
    {
      themeId: z.string().describe('Theme ID'),
      format: z.enum(['json', 'markdown']).default('json'),
    },
    async ({ themeId, format }) => {
      try {
        const theme = await client.getTheme(themeId);
        return formatResponse(theme, format, 'theme');
      } catch (error) {
        return formatError(error);
      }
    }
  );

  server.tool(
    'typeform_create_theme',
    `Create a new theme.

Args:
  - name: Theme name
  - colors: JSON object with colors { answer, background, button, question } (hex values)
  - font: Font name (e.g., 'Arial', 'Helvetica Neue')
  - hasTransparentButton: Whether buttons are transparent
  - roundedCorners: Corner style ('none', 'small', 'medium', 'large')`,
    {
      name: z.string().optional().describe('Theme name'),
      colors: z.string().describe('JSON object with colors { answer, background, button, question }'),
      font: z.string().optional().describe('Font name'),
      hasTransparentButton: z.boolean().optional(),
      roundedCorners: z.enum(['none', 'small', 'medium', 'large']).optional(),
    },
    async ({ name, colors, font, hasTransparentButton, roundedCorners }) => {
      try {
        const input: Parameters<typeof client.createTheme>[0] = {
          colors: JSON.parse(colors),
        };
        if (name) input.name = name;
        if (font) input.font = font;
        if (hasTransparentButton !== undefined) input.hasTransparentButton = hasTransparentButton;
        if (roundedCorners) input.roundedCorners = roundedCorners;

        const theme = await client.createTheme(input);
        return {
          content: [
            { type: 'text', text: JSON.stringify({ success: true, message: 'Theme created', theme }, null, 2) },
          ],
        };
      } catch (error) {
        return formatError(error);
      }
    }
  );

  server.tool(
    'typeform_update_theme',
    `Update an existing theme.

Args:
  - themeId: Theme ID to update
  - name: New theme name
  - colors: JSON object with colors { answer, background, button, question }
  - font: Font name`,
    {
      themeId: z.string().describe('Theme ID to update'),
      name: z.string().optional(),
      colors: z.string().optional().describe('JSON object with colors'),
      font: z.string().optional(),
    },
    async ({ themeId, name, colors, font }) => {
      try {
        const input: Parameters<typeof client.updateTheme>[1] = {};
        if (name) input.name = name;
        if (colors) input.colors = JSON.parse(colors);
        if (font) input.font = font;

        const theme = await client.updateTheme(themeId, input);
        return {
          content: [
            { type: 'text', text: JSON.stringify({ success: true, message: 'Theme updated', theme }, null, 2) },
          ],
        };
      } catch (error) {
        return formatError(error);
      }
    }
  );

  server.tool(
    'typeform_delete_theme',
    `Delete a theme.

Args:
  - themeId: Theme ID to delete`,
    {
      themeId: z.string().describe('Theme ID to delete'),
    },
    async ({ themeId }) => {
      try {
        await client.deleteTheme(themeId);
        return {
          content: [
            { type: 'text', text: JSON.stringify({ success: true, message: `Theme ${themeId} deleted` }, null, 2) },
          ],
        };
      } catch (error) {
        return formatError(error);
      }
    }
  );
}

// =============================================================================
// Image Tools
// =============================================================================

function registerImageTools(server: McpServer, client: TypeformClient): void {
  server.tool(
    'typeform_list_images',
    `List images in your Typeform account.

Returns all images stored in your account.`,
    {
      format: z.enum(['json', 'markdown']).default('json'),
    },
    async ({ format }) => {
      try {
        const images = await client.listImages();
        return formatResponse(images, format, 'images');
      } catch (error) {
        return formatError(error);
      }
    }
  );

  server.tool(
    'typeform_get_image',
    `Get image metadata by ID.

Args:
  - imageId: Image ID`,
    {
      imageId: z.string().describe('Image ID'),
    },
    async ({ imageId }) => {
      try {
        const image = await client.getImage(imageId);
        return formatResponse(image, 'json', 'image');
      } catch (error) {
        return formatError(error);
      }
    }
  );

  server.tool(
    'typeform_create_image',
    `Upload a new image.

Provide either a base64-encoded image OR a URL, not both.

Args:
  - fileName: Image filename
  - image: Base64-encoded image data (without data:image prefix)
  - url: URL to an image to import`,
    {
      fileName: z.string().optional().describe('Image filename'),
      image: z.string().optional().describe('Base64-encoded image data'),
      url: z.string().optional().describe('URL to import image from'),
    },
    async ({ fileName, image, url }) => {
      try {
        const result = await client.createImage({ fileName, image, url });
        return {
          content: [
            { type: 'text', text: JSON.stringify({ success: true, message: 'Image created', image: result }, null, 2) },
          ],
        };
      } catch (error) {
        return formatError(error);
      }
    }
  );

  server.tool(
    'typeform_delete_image',
    `Delete an image.

Args:
  - imageId: Image ID to delete`,
    {
      imageId: z.string().describe('Image ID to delete'),
    },
    async ({ imageId }) => {
      try {
        await client.deleteImage(imageId);
        return {
          content: [
            { type: 'text', text: JSON.stringify({ success: true, message: `Image ${imageId} deleted` }, null, 2) },
          ],
        };
      } catch (error) {
        return formatError(error);
      }
    }
  );
}

// =============================================================================
// Webhook Tools
// =============================================================================

function registerWebhookTools(server: McpServer, client: TypeformClient): void {
  server.tool(
    'typeform_list_webhooks',
    `List webhooks for a form.

Args:
  - formId: Form ID`,
    {
      formId: z.string().describe('Form ID'),
    },
    async ({ formId }) => {
      try {
        const webhooks = await client.listWebhooks(formId);
        return formatResponse(webhooks, 'json', 'webhooks');
      } catch (error) {
        return formatError(error);
      }
    }
  );

  server.tool(
    'typeform_get_webhook',
    `Get a single webhook by tag.

Args:
  - formId: Form ID
  - tag: Webhook tag`,
    {
      formId: z.string().describe('Form ID'),
      tag: z.string().describe('Webhook tag'),
    },
    async ({ formId, tag }) => {
      try {
        const webhook = await client.getWebhook(formId, tag);
        return formatResponse(webhook, 'json', 'webhook');
      } catch (error) {
        return formatError(error);
      }
    }
  );

  server.tool(
    'typeform_create_webhook',
    `Create or update a webhook for a form.

Args:
  - formId: Form ID
  - tag: Unique tag for this webhook
  - url: Destination URL for webhook payloads
  - enabled: Whether the webhook is active (default: true)
  - secret: Optional HMAC SHA256 signing key for payload verification
  - verifySsl: Whether to verify SSL certificates (default: true)
  - formResponse: Trigger on form submission (default: true)
  - formResponsePartial: Trigger on partial responses`,
    {
      formId: z.string().describe('Form ID'),
      tag: z.string().describe('Unique webhook tag'),
      url: z.string().describe('Destination URL'),
      enabled: z.boolean().default(true),
      secret: z.string().optional().describe('HMAC signing key'),
      verifySsl: z.boolean().optional(),
      formResponse: z.boolean().optional().describe('Trigger on form submission'),
      formResponsePartial: z.boolean().optional().describe('Trigger on partial responses'),
    },
    async ({ formId, tag, url, enabled, secret, verifySsl, formResponse, formResponsePartial }) => {
      try {
        const input: Parameters<typeof client.createOrUpdateWebhook>[1] = {
          tag,
          url,
          enabled,
        };
        if (secret) input.secret = secret;
        if (verifySsl !== undefined) input.verifySsl = verifySsl;
        if (formResponse !== undefined || formResponsePartial !== undefined) {
          input.eventTypes = {
            formResponse: formResponse ?? true,
            formResponsePartial,
          };
        }

        const webhook = await client.createOrUpdateWebhook(formId, input);
        return {
          content: [
            { type: 'text', text: JSON.stringify({ success: true, message: 'Webhook created/updated', webhook }, null, 2) },
          ],
        };
      } catch (error) {
        return formatError(error);
      }
    }
  );

  server.tool(
    'typeform_delete_webhook',
    `Delete a webhook.

Args:
  - formId: Form ID
  - tag: Webhook tag to delete`,
    {
      formId: z.string().describe('Form ID'),
      tag: z.string().describe('Webhook tag to delete'),
    },
    async ({ formId, tag }) => {
      try {
        await client.deleteWebhook(formId, tag);
        return {
          content: [
            { type: 'text', text: JSON.stringify({ success: true, message: `Webhook ${tag} deleted` }, null, 2) },
          ],
        };
      } catch (error) {
        return formatError(error);
      }
    }
  );
}
