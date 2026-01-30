# Typeform MCP Server

[![Primrose MCP](https://img.shields.io/badge/Primrose-MCP-blue)](https://primrose.dev/mcp/typeform)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A Model Context Protocol (MCP) server for Typeform, enabling AI assistants to create and manage forms, collect responses, and customize themes and workspaces.

## Features

- **Forms** - Create, update, and manage typeforms
- **Responses** - Collect and analyze form responses
- **Workspaces** - Organize forms into workspaces
- **Themes** - Create and customize form themes
- **Images** - Upload and manage form images
- **Webhooks** - Configure webhooks for form submissions

## Quick Start

### Recommended: Use Primrose SDK

The easiest way to use this MCP server is with the Primrose SDK:

```bash
npm install primrose-mcp
```

```typescript
import { PrimroseMCP } from 'primrose-mcp';

const primrose = new PrimroseMCP({
  apiKey: process.env.PRIMROSE_API_KEY,
});

const typeformClient = primrose.getClient('typeform', {
  accessToken: process.env.TYPEFORM_ACCESS_TOKEN,
});
```

## Manual Installation

### Prerequisites

- Node.js 18+
- Wrangler CLI (`npm install -g wrangler`)
- Typeform account with API access

### Setup

1. Clone and install dependencies:

```bash
git clone <repository-url>
cd primrose-mcp-typeform
npm install
```

2. Deploy to Cloudflare Workers:

```bash
npx wrangler deploy
```

## Configuration

### Required Headers

| Header | Description |
|--------|-------------|
| `X-Typeform-Access-Token` | Typeform personal access token or OAuth token |

### Optional Headers

| Header | Description |
|--------|-------------|
| `X-Typeform-Base-URL` | Override the default API base URL (default: https://api.typeform.com, EU: https://api.eu.typeform.com) |

### Example Request

```bash
curl -X POST https://your-worker.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -H "X-Typeform-Access-Token: your-access-token" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'
```

## Available Tools

### Connection Tools
- `typeform_test_connection` - Test the connection to Typeform API
- `typeform_get_me` - Get current user information

### Form Tools
- `typeform_list_forms` - List forms in your account
- `typeform_get_form` - Get a single form by ID
- `typeform_create_form` - Create a new form
- `typeform_update_form` - Update an existing form (full replacement)
- `typeform_patch_form` - Partially update a form
- `typeform_delete_form` - Delete a form
- `typeform_get_form_messages` - Get custom messages for a form
- `typeform_update_form_messages` - Update form messages

### Response Tools
- `typeform_list_responses` - Get responses for a form
- `typeform_delete_responses` - Delete specific responses

### Workspace Tools
- `typeform_list_workspaces` - List workspaces
- `typeform_get_workspace` - Get a workspace by ID
- `typeform_create_workspace` - Create a new workspace
- `typeform_update_workspace` - Update a workspace
- `typeform_delete_workspace` - Delete a workspace

### Theme Tools
- `typeform_list_themes` - List themes
- `typeform_get_theme` - Get a theme by ID
- `typeform_create_theme` - Create a new theme
- `typeform_update_theme` - Update a theme
- `typeform_delete_theme` - Delete a theme

### Image Tools
- `typeform_list_images` - List images in your account
- `typeform_get_image` - Get image metadata
- `typeform_create_image` - Upload a new image
- `typeform_delete_image` - Delete an image

### Webhook Tools
- `typeform_list_webhooks` - List webhooks for a form
- `typeform_get_webhook` - Get a webhook by tag
- `typeform_create_webhook` - Create or update a webhook
- `typeform_delete_webhook` - Delete a webhook

## Development

```bash
# Install dependencies
npm install

# Run locally
npm run dev

# Type check
npm run typecheck

# Deploy
npm run deploy
```

## Related Resources

- [Primrose SDK Documentation](https://primrose.dev/docs)
- [Typeform API Documentation](https://www.typeform.com/developers/)
- [Typeform Admin](https://admin.typeform.com)
- [Model Context Protocol](https://modelcontextprotocol.io)
