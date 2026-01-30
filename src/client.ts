/**
 * Typeform API Client
 *
 * Implements the full Typeform API including:
 * - Forms (Create, Read, Update, Delete)
 * - Responses (Retrieve, Delete)
 * - Workspaces (Create, Read, Update, Delete)
 * - Themes (Create, Read, Update, Delete)
 * - Images (Create, Read, Delete)
 * - Webhooks (Create, Read, Update, Delete)
 * - User Info (Me)
 *
 * MULTI-TENANT: This client receives credentials per-request via TenantCredentials,
 * allowing a single server to serve multiple tenants with different access tokens.
 */

import type {
  Answer,
  AnswerType,
  Attachment,
  Choice,
  FieldProperties,
  FieldType,
  Form,
  FormCreateInput,
  FormField,
  FormMessages,
  FormPatchOperation,
  FormResponse,
  FormSettings,
  FormUpdateInput,
  ImageCreateInput,
  Layout,
  PaginatedResponse,
  PaginationParams,
  ResponsesQueryParams,
  ThankYouScreen,
  Theme,
  ThemeCreateInput,
  ThemeUpdateInput,
  TypeformImage,
  User,
  Webhook,
  WebhookCreateInput,
  WelcomeScreen,
  Workspace,
  WorkspaceCreateInput,
  WorkspaceUpdateOperation,
} from './types/entities.js';
import type { TenantCredentials } from './types/env.js';
import { AuthenticationError, RateLimitError, TypeformApiError } from './utils/errors.js';

// =============================================================================
// Configuration
// =============================================================================

const DEFAULT_API_BASE_URL = 'https://api.typeform.com';

// =============================================================================
// Typeform Client Interface
// =============================================================================

export interface TypeformClient {
  // Connection
  testConnection(): Promise<{ connected: boolean; message: string }>;
  getMe(): Promise<User>;

  // Forms
  listForms(params?: PaginationParams & { search?: string; workspaceId?: string; sortBy?: string; orderBy?: string }): Promise<PaginatedResponse<Form>>;
  getForm(formId: string): Promise<Form>;
  createForm(input: FormCreateInput): Promise<Form>;
  updateForm(formId: string, input: FormUpdateInput): Promise<Form>;
  patchForm(formId: string, operations: FormPatchOperation[]): Promise<void>;
  deleteForm(formId: string): Promise<void>;
  getFormMessages(formId: string): Promise<FormMessages>;
  updateFormMessages(formId: string, messages: FormMessages): Promise<void>;

  // Responses
  listResponses(formId: string, params?: ResponsesQueryParams): Promise<PaginatedResponse<FormResponse>>;
  deleteResponses(formId: string, responseIds: string[]): Promise<void>;

  // Workspaces
  listWorkspaces(params?: PaginationParams & { search?: string }): Promise<PaginatedResponse<Workspace>>;
  getWorkspace(workspaceId: string): Promise<Workspace>;
  createWorkspace(input: WorkspaceCreateInput): Promise<Workspace>;
  updateWorkspace(workspaceId: string, operations: WorkspaceUpdateOperation[]): Promise<void>;
  deleteWorkspace(workspaceId: string): Promise<void>;

  // Themes
  listThemes(params?: PaginationParams): Promise<PaginatedResponse<Theme>>;
  getTheme(themeId: string): Promise<Theme>;
  createTheme(input: ThemeCreateInput): Promise<Theme>;
  updateTheme(themeId: string, input: ThemeUpdateInput): Promise<Theme>;
  deleteTheme(themeId: string): Promise<void>;

  // Images
  listImages(): Promise<TypeformImage[]>;
  getImage(imageId: string): Promise<TypeformImage>;
  createImage(input: ImageCreateInput): Promise<TypeformImage>;
  deleteImage(imageId: string): Promise<void>;

  // Webhooks
  listWebhooks(formId: string): Promise<Webhook[]>;
  getWebhook(formId: string, tag: string): Promise<Webhook>;
  createOrUpdateWebhook(formId: string, input: WebhookCreateInput): Promise<Webhook>;
  deleteWebhook(formId: string, tag: string): Promise<void>;
}

// =============================================================================
// Typeform Client Implementation
// =============================================================================

class TypeformClientImpl implements TypeformClient {
  private credentials: TenantCredentials;
  private baseUrl: string;

  constructor(credentials: TenantCredentials) {
    this.credentials = credentials;
    this.baseUrl = credentials.baseUrl || DEFAULT_API_BASE_URL;
  }

  // ===========================================================================
  // HTTP Request Helper
  // ===========================================================================

  private getAuthHeaders(): Record<string, string> {
    if (!this.credentials.accessToken) {
      throw new AuthenticationError(
        'No access token provided. Include X-Typeform-Access-Token header.'
      );
    }

    return {
      Authorization: `Bearer ${this.credentials.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getAuthHeaders(),
        ...(options.headers || {}),
      },
    });

    // Handle rate limiting (Typeform allows 2 requests/second)
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      throw new RateLimitError('Rate limit exceeded', retryAfter ? parseInt(retryAfter, 10) : 60);
    }

    // Handle authentication errors
    if (response.status === 401 || response.status === 403) {
      throw new AuthenticationError('Authentication failed. Check your access token.');
    }

    // Handle not found
    if (response.status === 404) {
      const errorBody = await response.text();
      throw new TypeformApiError(`Resource not found: ${errorBody}`, 404, 'NOT_FOUND');
    }

    // Handle other errors
    if (!response.ok) {
      const errorBody = await response.text();
      let message = `API error: ${response.status}`;
      try {
        const errorJson = JSON.parse(errorBody);
        message = errorJson.description || errorJson.message || errorJson.error || message;
      } catch {
        // Use default message
      }
      throw new TypeformApiError(message, response.status);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return undefined as T;
    }

    return response.json() as Promise<T>;
  }

  // ===========================================================================
  // Connection / User
  // ===========================================================================

  async testConnection(): Promise<{ connected: boolean; message: string }> {
    try {
      const user = await this.getMe();
      return { connected: true, message: `Connected as ${user.email} (${user.alias})` };
    } catch (error) {
      return {
        connected: false,
        message: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  }

  async getMe(): Promise<User> {
    return this.request<User>('/me');
  }

  // ===========================================================================
  // Forms
  // ===========================================================================

  async listForms(params?: PaginationParams & { search?: string; workspaceId?: string; sortBy?: string; orderBy?: string }): Promise<PaginatedResponse<Form>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.set('page', String(params.page));
    if (params?.pageSize) queryParams.set('page_size', String(params.pageSize));
    if (params?.search) queryParams.set('search', params.search);
    if (params?.workspaceId) queryParams.set('workspace_id', params.workspaceId);
    if (params?.sortBy) queryParams.set('sort_by', params.sortBy);
    if (params?.orderBy) queryParams.set('order_by', params.orderBy);

    const queryString = queryParams.toString();
    const data = await this.request<{
      total_items: number;
      page_count: number;
      items: Array<{
        id: string;
        title: string;
        last_updated_at?: string;
        created_at?: string;
        settings?: { is_public?: boolean };
        theme?: { href: string };
        self?: { href: string };
      }>;
    }>(`/forms${queryString ? `?${queryString}` : ''}`);

    return {
      items: data.items.map((f) => ({
        id: f.id,
        title: f.title,
        lastUpdatedAt: f.last_updated_at,
        createdAt: f.created_at,
        settings: f.settings ? { isPublic: f.settings.is_public } : undefined,
        theme: f.theme,
        self: f.self,
      })),
      totalItems: data.total_items,
      pageCount: data.page_count,
    };
  }

  async getForm(formId: string): Promise<Form> {
    const data = await this.request<Record<string, unknown>>(`/forms/${formId}`);
    return this.mapFormResponse(data);
  }

  async createForm(input: FormCreateInput): Promise<Form> {
    const body = this.mapFormInput(input);
    const data = await this.request<Record<string, unknown>>('/forms', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return this.mapFormResponse(data);
  }

  async updateForm(formId: string, input: FormUpdateInput): Promise<Form> {
    const body = this.mapFormInput(input);
    const data = await this.request<Record<string, unknown>>(`/forms/${formId}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
    return this.mapFormResponse(data);
  }

  async patchForm(formId: string, operations: FormPatchOperation[]): Promise<void> {
    await this.request(`/forms/${formId}`, {
      method: 'PATCH',
      body: JSON.stringify(operations),
    });
  }

  async deleteForm(formId: string): Promise<void> {
    await this.request(`/forms/${formId}`, { method: 'DELETE' });
  }

  async getFormMessages(formId: string): Promise<FormMessages> {
    return this.request<FormMessages>(`/forms/${formId}/messages`);
  }

  async updateFormMessages(formId: string, messages: FormMessages): Promise<void> {
    await this.request(`/forms/${formId}/messages`, {
      method: 'PUT',
      body: JSON.stringify(messages),
    });
  }

  // ===========================================================================
  // Responses
  // ===========================================================================

  async listResponses(formId: string, params?: ResponsesQueryParams): Promise<PaginatedResponse<FormResponse>> {
    const queryParams = new URLSearchParams();
    if (params?.pageSize) queryParams.set('page_size', String(params.pageSize));
    if (params?.since) queryParams.set('since', params.since);
    if (params?.until) queryParams.set('until', params.until);
    if (params?.after) queryParams.set('after', params.after);
    if (params?.before) queryParams.set('before', params.before);
    if (params?.completed !== undefined) queryParams.set('completed', String(params.completed));
    if (params?.responseType) queryParams.set('response_type', params.responseType.join(','));
    if (params?.sort) queryParams.set('sort', params.sort);
    if (params?.query) queryParams.set('query', params.query);
    if (params?.fields) queryParams.set('fields', params.fields.join(','));
    if (params?.includedResponseIds) queryParams.set('included_response_ids', params.includedResponseIds.join(','));

    const queryString = queryParams.toString();
    const data = await this.request<{
      total_items: number;
      page_count: number;
      items: Array<Record<string, unknown>>;
    }>(`/forms/${formId}/responses${queryString ? `?${queryString}` : ''}`);

    return {
      items: data.items.map((r) => this.mapResponseItem(r)),
      totalItems: data.total_items,
      pageCount: data.page_count,
    };
  }

  async deleteResponses(formId: string, responseIds: string[]): Promise<void> {
    const queryParams = new URLSearchParams();
    queryParams.set('included_response_ids', responseIds.join(','));
    await this.request(`/forms/${formId}/responses?${queryParams}`, { method: 'DELETE' });
  }

  // ===========================================================================
  // Workspaces
  // ===========================================================================

  async listWorkspaces(params?: PaginationParams & { search?: string }): Promise<PaginatedResponse<Workspace>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.set('page', String(params.page));
    if (params?.pageSize) queryParams.set('page_size', String(params.pageSize));
    if (params?.search) queryParams.set('search', params.search);

    const queryString = queryParams.toString();
    const data = await this.request<{
      total_items: number;
      page_count?: number;
      items: Array<{
        id: string;
        name: string;
        account_id?: string;
        shared: boolean;
        forms?: { count: number; href: string };
        self?: { href: string };
      }>;
    }>(`/workspaces${queryString ? `?${queryString}` : ''}`);

    return {
      items: data.items.map((w) => ({
        id: w.id,
        name: w.name,
        accountId: w.account_id,
        shared: w.shared,
        forms: w.forms,
        self: w.self,
      })),
      totalItems: data.total_items,
      pageCount: data.page_count || 1,
    };
  }

  async getWorkspace(workspaceId: string): Promise<Workspace> {
    const data = await this.request<{
      id: string;
      name: string;
      account_id?: string;
      shared: boolean;
      forms?: { count: number; href: string };
      members?: Array<{ email: string; name?: string; role: 'owner' | 'member' }>;
      self?: { href: string };
    }>(`/workspaces/${workspaceId}`);

    return {
      id: data.id,
      name: data.name,
      accountId: data.account_id,
      shared: data.shared,
      forms: data.forms,
      members: data.members,
      self: data.self,
    };
  }

  async createWorkspace(input: WorkspaceCreateInput): Promise<Workspace> {
    const data = await this.request<{
      id: string;
      name: string;
      account_id?: string;
      shared: boolean;
      forms?: { count: number; href: string };
      members?: Array<{ email: string; name?: string; role: 'owner' | 'member' }>;
      self?: { href: string };
    }>('/workspaces', {
      method: 'POST',
      body: JSON.stringify({ name: input.name }),
    });

    return {
      id: data.id,
      name: data.name,
      accountId: data.account_id,
      shared: data.shared,
      forms: data.forms,
      members: data.members,
      self: data.self,
    };
  }

  async updateWorkspace(workspaceId: string, operations: WorkspaceUpdateOperation[]): Promise<void> {
    await this.request(`/workspaces/${workspaceId}`, {
      method: 'PATCH',
      body: JSON.stringify(operations),
    });
  }

  async deleteWorkspace(workspaceId: string): Promise<void> {
    await this.request(`/workspaces/${workspaceId}`, { method: 'DELETE' });
  }

  // ===========================================================================
  // Themes
  // ===========================================================================

  async listThemes(params?: PaginationParams): Promise<PaginatedResponse<Theme>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.set('page', String(params.page));
    if (params?.pageSize) queryParams.set('page_size', String(params.pageSize));

    const queryString = queryParams.toString();
    const data = await this.request<{
      total_items: number;
      page_count: number;
      items: Array<Record<string, unknown>>;
    }>(`/themes${queryString ? `?${queryString}` : ''}`);

    return {
      items: data.items.map((t) => this.mapThemeResponse(t)),
      totalItems: data.total_items,
      pageCount: data.page_count,
    };
  }

  async getTheme(themeId: string): Promise<Theme> {
    const data = await this.request<Record<string, unknown>>(`/themes/${themeId}`);
    return this.mapThemeResponse(data);
  }

  async createTheme(input: ThemeCreateInput): Promise<Theme> {
    const body = this.mapThemeInput(input);
    const data = await this.request<Record<string, unknown>>('/themes', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return this.mapThemeResponse(data);
  }

  async updateTheme(themeId: string, input: ThemeUpdateInput): Promise<Theme> {
    const body = this.mapThemeInput(input);
    const data = await this.request<Record<string, unknown>>(`/themes/${themeId}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
    return this.mapThemeResponse(data);
  }

  async deleteTheme(themeId: string): Promise<void> {
    await this.request(`/themes/${themeId}`, { method: 'DELETE' });
  }

  // ===========================================================================
  // Images
  // ===========================================================================

  async listImages(): Promise<TypeformImage[]> {
    const data = await this.request<Array<{
      id: string;
      src: string;
      file_name: string;
      width?: number;
      height?: number;
      media_type?: string;
      has_alpha?: boolean;
      avg_color?: string;
    }>>('/images');

    return data.map((img) => ({
      id: img.id,
      src: img.src,
      fileName: img.file_name,
      width: img.width,
      height: img.height,
      mediaType: img.media_type as TypeformImage['mediaType'],
      hasAlpha: img.has_alpha,
      avgColor: img.avg_color,
    }));
  }

  async getImage(imageId: string): Promise<TypeformImage> {
    const data = await this.request<{
      id: string;
      src: string;
      file_name: string;
      width?: number;
      height?: number;
      media_type?: string;
      has_alpha?: boolean;
      avg_color?: string;
    }>(`/images/${imageId}`, {
      headers: { Accept: 'application/json' },
    });

    return {
      id: data.id,
      src: data.src,
      fileName: data.file_name,
      width: data.width,
      height: data.height,
      mediaType: data.media_type as TypeformImage['mediaType'],
      hasAlpha: data.has_alpha,
      avgColor: data.avg_color,
    };
  }

  async createImage(input: ImageCreateInput): Promise<TypeformImage> {
    const body: Record<string, string> = {};
    if (input.fileName) body.file_name = input.fileName;
    if (input.image) body.image = input.image;
    if (input.url) body.url = input.url;

    const data = await this.request<{
      id: string;
      src: string;
      file_name: string;
    }>('/images', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    return {
      id: data.id,
      src: data.src,
      fileName: data.file_name,
    };
  }

  async deleteImage(imageId: string): Promise<void> {
    await this.request(`/images/${imageId}`, { method: 'DELETE' });
  }

  // ===========================================================================
  // Webhooks
  // ===========================================================================

  async listWebhooks(formId: string): Promise<Webhook[]> {
    const data = await this.request<{
      items: Array<Record<string, unknown>>;
    }>(`/forms/${formId}/webhooks`);

    return data.items.map((w) => this.mapWebhookResponse(w, formId));
  }

  async getWebhook(formId: string, tag: string): Promise<Webhook> {
    const data = await this.request<Record<string, unknown>>(`/forms/${formId}/webhooks/${tag}`);
    return this.mapWebhookResponse(data, formId);
  }

  async createOrUpdateWebhook(formId: string, input: WebhookCreateInput): Promise<Webhook> {
    const body: Record<string, unknown> = {
      url: input.url,
      enabled: input.enabled ?? true,
    };
    if (input.secret) body.secret = input.secret;
    if (input.verifySsl !== undefined) body.verify_ssl = input.verifySsl;
    if (input.eventTypes) {
      body.event_types = {
        form_response: input.eventTypes.formResponse,
        form_response_partial: input.eventTypes.formResponsePartial,
      };
    }

    const data = await this.request<Record<string, unknown>>(`/forms/${formId}/webhooks/${input.tag}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });

    return this.mapWebhookResponse(data, formId);
  }

  async deleteWebhook(formId: string, tag: string): Promise<void> {
    await this.request(`/forms/${formId}/webhooks/${tag}`, { method: 'DELETE' });
  }

  // ===========================================================================
  // Private Mapping Helpers
  // ===========================================================================

  private mapFormInput(input: FormCreateInput | FormUpdateInput): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    if (input.title) result.title = input.title;
    if (input.type) result.type = input.type;
    if (input.theme) result.theme = input.theme;
    if (input.workspace) result.workspace = input.workspace;
    if (input.hidden) result.hidden = input.hidden;
    if (input.variables) result.variables = input.variables;

    if (input.settings) {
      result.settings = this.mapSettingsInput(input.settings);
    }

    if (input.welcomeScreens) {
      result.welcome_screens = input.welcomeScreens.map((s) => ({
        ref: s.ref,
        title: s.title,
        properties: s.properties,
        attachment: s.attachment,
        layout: s.layout,
      }));
    }

    if (input.thankYouScreens) {
      result.thankyou_screens = input.thankYouScreens.map((s) => ({
        ref: s.ref,
        title: s.title,
        properties: s.properties,
        attachment: s.attachment,
        layout: s.layout,
      }));
    }

    if (input.fields) {
      result.fields = input.fields.map((f) => this.mapFieldInput(f));
    }

    if (input.logic) {
      result.logic = input.logic;
    }

    return result;
  }

  private mapSettingsInput(settings: FormSettings): Record<string, unknown> {
    return {
      language: settings.language,
      is_public: settings.isPublic,
      progress_bar: settings.progressBar,
      show_progress_bar: settings.showProgressBar,
      show_typeform_branding: settings.showTypeformBranding,
      meta: settings.meta,
      redirect_after_submit_url: settings.redirectAfterSubmitUrl,
      google_analytics: settings.googleAnalytics,
      facebook_pixel: settings.facebookPixel,
      google_tag_manager: settings.googleTagManager,
    };
  }

  private mapFieldInput(field: FormField): Record<string, unknown> {
    const result: Record<string, unknown> = {
      title: field.title,
      type: field.type,
    };

    if (field.ref) result.ref = field.ref;
    if (field.properties) {
      result.properties = {
        description: field.properties.description,
        choices: field.properties.choices,
        fields: field.properties.fields?.map((f) => this.mapFieldInput(f)),
        allow_multiple_selection: field.properties.allowMultipleSelection,
        allow_other_choice: field.properties.allowOtherChoice,
        randomize: field.properties.randomize,
        alphabetical_order: field.properties.alphabeticalOrder,
        vertical_alignment: field.properties.verticalAlignment,
        supersized: field.properties.supersized,
        show_labels: field.properties.showLabels,
        start_at_one: field.properties.startAtOne,
        steps: field.properties.steps,
        shape: field.properties.shape,
        labels: field.properties.labels,
        structure: field.properties.structure,
        separator: field.properties.separator,
        currency: field.properties.currency,
        price: field.properties.price,
        default_country_code: field.properties.defaultCountryCode,
      };
    }
    if (field.validations) {
      result.validations = {
        required: field.validations.required,
        max_length: field.validations.maxLength,
        min_value: field.validations.minValue,
        max_value: field.validations.maxValue,
        max_selection: field.validations.maxSelection,
        min_selection: field.validations.minSelection,
      };
    }
    if (field.attachment) result.attachment = field.attachment;
    if (field.layout) result.layout = field.layout;

    return result;
  }

  private mapFormResponse(data: Record<string, unknown>): Form {
    const settings = data.settings as Record<string, unknown> | undefined;
    const welcomeScreens = data.welcome_screens as Array<Record<string, unknown>> | undefined;
    const thankYouScreens = data.thankyou_screens as Array<Record<string, unknown>> | undefined;
    const fields = data.fields as Array<Record<string, unknown>> | undefined;
    const links = data._links as Record<string, unknown> | undefined;

    return {
      id: data.id as string,
      title: data.title as string,
      type: data.type as Form['type'],
      language: data.language as string | undefined,
      createdAt: data.created_at as string | undefined,
      lastUpdatedAt: data.last_updated_at as string | undefined,
      publishedAt: data.published_at as string | undefined,
      settings: settings ? this.mapSettingsResponse(settings) : undefined,
      theme: data.theme as Form['theme'],
      workspace: data.workspace as Form['workspace'],
      welcomeScreens: welcomeScreens?.map((s) => ({
        ref: s.ref as string | undefined,
        title: s.title as string,
        properties: s.properties as WelcomeScreen['properties'],
        attachment: s.attachment as Attachment | undefined,
        layout: s.layout as Layout | undefined,
      })),
      thankYouScreens: thankYouScreens?.map((s) => ({
        ref: s.ref as string | undefined,
        title: s.title as string,
        properties: s.properties as ThankYouScreen['properties'],
        attachment: s.attachment as Attachment | undefined,
        layout: s.layout as Layout | undefined,
      })),
      fields: fields?.map((f) => this.mapFieldResponse(f)),
      logic: data.logic as Form['logic'],
      hidden: data.hidden as string[] | undefined,
      variables: data.variables as Form['variables'],
      links: links ? { display: links.display as string } : undefined,
    };
  }

  private mapSettingsResponse(settings: Record<string, unknown>): FormSettings {
    return {
      language: settings.language as string | undefined,
      isPublic: settings.is_public as boolean | undefined,
      progressBar: settings.progress_bar as 'proportion' | 'percentage' | undefined,
      showProgressBar: settings.show_progress_bar as boolean | undefined,
      showTypeformBranding: settings.show_typeform_branding as boolean | undefined,
      meta: settings.meta as FormSettings['meta'],
      redirectAfterSubmitUrl: settings.redirect_after_submit_url as string | undefined,
      googleAnalytics: settings.google_analytics as string | undefined,
      facebookPixel: settings.facebook_pixel as string | undefined,
      googleTagManager: settings.google_tag_manager as string | undefined,
    };
  }

  private mapFieldResponse(data: Record<string, unknown>): FormField {
    const properties = data.properties as Record<string, unknown> | undefined;
    const validations = data.validations as Record<string, unknown> | undefined;

    return {
      id: data.id as string | undefined,
      ref: data.ref as string | undefined,
      title: data.title as string,
      type: data.type as FormField['type'],
      properties: properties ? {
        description: properties.description as string | undefined,
        choices: properties.choices as Choice[] | undefined,
        fields: (properties.fields as Array<Record<string, unknown>> | undefined)?.map((f) => this.mapFieldResponse(f)),
        allowMultipleSelection: properties.allow_multiple_selection as boolean | undefined,
        allowOtherChoice: properties.allow_other_choice as boolean | undefined,
        randomize: properties.randomize as boolean | undefined,
        alphabeticalOrder: properties.alphabetical_order as boolean | undefined,
        verticalAlignment: properties.vertical_alignment as boolean | undefined,
        supersized: properties.supersized as boolean | undefined,
        showLabels: properties.show_labels as boolean | undefined,
        startAtOne: properties.start_at_one as boolean | undefined,
        steps: properties.steps as number | undefined,
        shape: properties.shape as FieldProperties['shape'],
        labels: properties.labels as FieldProperties['labels'],
        structure: properties.structure as string | undefined,
        separator: properties.separator as string | undefined,
        currency: properties.currency as string | undefined,
        price: properties.price as FieldProperties['price'],
        defaultCountryCode: properties.default_country_code as string | undefined,
      } : undefined,
      validations: validations ? {
        required: validations.required as boolean | undefined,
        maxLength: validations.max_length as number | undefined,
        minValue: validations.min_value as number | undefined,
        maxValue: validations.max_value as number | undefined,
        maxSelection: validations.max_selection as number | undefined,
        minSelection: validations.min_selection as number | undefined,
      } : undefined,
      attachment: data.attachment as FormField['attachment'],
      layout: data.layout as FormField['layout'],
    };
  }

  private mapResponseItem(data: Record<string, unknown>): FormResponse {
    const metadata = data.metadata as Record<string, unknown> | undefined;
    const answers = data.answers as Array<Record<string, unknown>> | undefined;
    const calculated = data.calculated as Record<string, unknown> | undefined;

    return {
      responseId: data.response_id as string,
      token: data.token as string | undefined,
      landedAt: data.landed_at as string,
      submittedAt: data.submitted_at as string | undefined,
      metadata: metadata ? {
        userAgent: metadata.user_agent as string | undefined,
        platform: metadata.platform as string | undefined,
        referer: metadata.referer as string | undefined,
        networkId: metadata.network_id as string | undefined,
        browser: metadata.browser as string | undefined,
      } : undefined,
      hidden: data.hidden as Record<string, string> | undefined,
      calculated: calculated ? { score: calculated.score as number | undefined } : undefined,
      variables: data.variables as FormResponse['variables'],
      answers: answers?.map((a) => {
        const field = a.field as Record<string, unknown>;
        return {
          field: {
            id: field.id as string,
            ref: field.ref as string | undefined,
            type: field.type as FieldType,
          },
          type: a.type as AnswerType,
          text: a.text as string | undefined,
          number: a.number as number | undefined,
          boolean: a.boolean as boolean | undefined,
          email: a.email as string | undefined,
          date: a.date as string | undefined,
          url: a.url as string | undefined,
          fileUrl: a.file_url as string | undefined,
          payment: a.payment as Answer['payment'],
          choice: a.choice as Answer['choice'],
          choices: a.choices as Answer['choices'],
          phoneNumber: a.phone_number as string | undefined,
          matrix: a.matrix as Answer['matrix'],
          ranking: a.ranking as Answer['ranking'],
        };
      }),
    };
  }

  private mapThemeInput(input: ThemeCreateInput | ThemeUpdateInput): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    if (input.name) result.name = input.name;
    if (input.font) result.font = input.font;
    if (input.hasTransparentButton !== undefined) result.has_transparent_button = input.hasTransparentButton;
    if (input.roundedCorners) result.rounded_corners = input.roundedCorners;
    if (input.colors) result.colors = input.colors;
    if (input.background) result.background = input.background;
    if (input.fields) result.fields = input.fields;
    if (input.screens) result.screens = input.screens;

    return result;
  }

  private mapThemeResponse(data: Record<string, unknown>): Theme {
    return {
      id: data.id as string,
      name: data.name as string | undefined,
      visibility: data.visibility as Theme['visibility'],
      font: data.font as string | undefined,
      hasTransparentButton: data.has_transparent_button as boolean | undefined,
      roundedCorners: data.rounded_corners as Theme['roundedCorners'],
      colors: data.colors as Theme['colors'],
      background: data.background as Theme['background'],
      fields: data.fields as Theme['fields'],
      screens: data.screens as Theme['screens'],
    };
  }

  private mapWebhookResponse(data: Record<string, unknown>, formId: string): Webhook {
    const eventTypes = data.event_types as Record<string, boolean> | undefined;

    return {
      id: data.id as string,
      formId,
      tag: data.tag as string,
      url: data.url as string,
      enabled: data.enabled as boolean,
      secret: data.secret as string | undefined,
      verifySsl: data.verify_ssl as boolean | undefined,
      eventTypes: eventTypes ? {
        formResponse: eventTypes.form_response,
        formResponsePartial: eventTypes.form_response_partial,
      } : undefined,
      createdAt: data.created_at as string | undefined,
      updatedAt: data.updated_at as string | undefined,
    };
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a Typeform client instance with tenant-specific credentials.
 *
 * MULTI-TENANT: Each request provides its own credentials via headers,
 * allowing a single server deployment to serve multiple tenants.
 *
 * @param credentials - Tenant credentials parsed from request headers
 */
export function createTypeformClient(credentials: TenantCredentials): TypeformClient {
  return new TypeformClientImpl(credentials);
}
