/**
 * Typeform Entity Types
 *
 * Data structures for Typeform API entities.
 */

// =============================================================================
// Pagination
// =============================================================================

export interface PaginationParams {
  /** Page number (1-based) */
  page?: number;
  /** Number of items per page (default: 10, max: 200 for most, 1000 for responses) */
  pageSize?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  totalItems: number;
  pageCount: number;
}

// =============================================================================
// User / Account
// =============================================================================

export interface User {
  alias: string;
  email: string;
  language: string;
}

// =============================================================================
// Workspace
// =============================================================================

export interface Workspace {
  id: string;
  name: string;
  accountId?: string;
  shared: boolean;
  forms?: {
    count: number;
    href: string;
  };
  members?: WorkspaceMember[];
  self?: {
    href: string;
  };
}

export interface WorkspaceMember {
  email: string;
  name?: string;
  role: 'owner' | 'member';
}

export interface WorkspaceCreateInput {
  name: string;
}

export interface WorkspaceUpdateOperation {
  op: 'replace' | 'add' | 'remove';
  path: '/name' | '/members';
  value: string | { email: string; role?: 'owner' | 'member' };
}

// =============================================================================
// Form
// =============================================================================

export interface Form {
  id: string;
  title: string;
  type?: 'quiz' | 'form';
  language?: string;
  createdAt?: string;
  lastUpdatedAt?: string;
  publishedAt?: string;
  settings?: FormSettings;
  theme?: {
    href: string;
  };
  workspace?: {
    href: string;
  };
  welcomeScreens?: WelcomeScreen[];
  thankYouScreens?: ThankYouScreen[];
  fields?: FormField[];
  logic?: FormLogic[];
  hidden?: string[];
  variables?: FormVariables;
  links?: {
    display: string;
  };
  self?: {
    href: string;
  };
}

export interface FormSettings {
  language?: string;
  isPublic?: boolean;
  progressBar?: 'proportion' | 'percentage';
  showProgressBar?: boolean;
  showTypeformBranding?: boolean;
  meta?: {
    title?: string;
    allowIndexing?: boolean;
    description?: string;
    image?: {
      href: string;
    };
  };
  redirectAfterSubmitUrl?: string;
  googleAnalytics?: string;
  facebookPixel?: string;
  googleTagManager?: string;
  notifications?: {
    self?: {
      enabled: boolean;
      recipients: string[];
      replyTo?: string[];
      subject: string;
      message: string;
    };
    respondent?: {
      enabled: boolean;
      recipient: string;
      replyTo?: string[];
      subject: string;
      message: string;
    };
  };
}

export interface WelcomeScreen {
  ref?: string;
  title: string;
  properties?: {
    showButton?: boolean;
    buttonText?: string;
    description?: string;
  };
  attachment?: Attachment;
  layout?: Layout;
}

export interface ThankYouScreen {
  ref?: string;
  title: string;
  properties?: {
    showButton?: boolean;
    buttonText?: string;
    buttonMode?: 'redirect' | 'reload' | 'default_redirect';
    redirectUrl?: string;
    shareIcons?: boolean;
  };
  attachment?: Attachment;
  layout?: Layout;
}

export interface FormField {
  id?: string;
  ref?: string;
  title: string;
  type: FieldType;
  properties?: FieldProperties;
  validations?: FieldValidations;
  attachment?: Attachment;
  layout?: Layout;
}

export type FieldType =
  | 'short_text'
  | 'long_text'
  | 'email'
  | 'phone_number'
  | 'number'
  | 'rating'
  | 'opinion_scale'
  | 'yes_no'
  | 'multiple_choice'
  | 'dropdown'
  | 'date'
  | 'file_upload'
  | 'payment'
  | 'picture_choice'
  | 'ranking'
  | 'matrix'
  | 'group'
  | 'statement'
  | 'website'
  | 'legal'
  | 'contact_info'
  | 'nps'
  | 'calendly';

export interface FieldProperties {
  description?: string;
  choices?: Choice[];
  fields?: FormField[];
  allowMultipleSelection?: boolean;
  allowOtherChoice?: boolean;
  randomize?: boolean;
  alphabeticalOrder?: boolean;
  verticalAlignment?: boolean;
  supersized?: boolean;
  showLabels?: boolean;
  startAtOne?: boolean;
  steps?: number;
  shape?: 'star' | 'heart' | 'thumb' | 'crown' | 'cat' | 'dog' | 'circle' | 'flag' | 'droplet' | 'tick' | 'lightbulb' | 'trophy' | 'cloud' | 'thunderbolt' | 'up' | 'pencil' | 'skull' | 'user';
  labels?: {
    left?: string;
    center?: string;
    right?: string;
  };
  structure?: string;
  separator?: string;
  currency?: string;
  price?: {
    type: 'fixed' | 'variable';
    value: string;
  };
  defaultCountryCode?: string;
}

export interface Choice {
  id?: string;
  ref?: string;
  label: string;
  attachment?: Attachment;
}

export interface FieldValidations {
  required?: boolean;
  maxLength?: number;
  minValue?: number;
  maxValue?: number;
  maxSelection?: number;
  minSelection?: number;
}

export interface Attachment {
  type: 'image' | 'video';
  href: string;
  properties?: {
    description?: string;
  };
  scale?: number;
}

export interface Layout {
  type?: 'float' | 'split' | 'wallpaper';
  attachment?: Attachment;
  placement?: 'left' | 'right';
}

export interface FormLogic {
  type: 'field' | 'hidden';
  ref: string;
  actions: LogicAction[];
}

export interface LogicAction {
  action: 'jump' | 'add' | 'subtract' | 'multiply' | 'divide' | 'set';
  details: {
    to?: {
      type: 'field' | 'thankyou' | 'hidden';
      value: string;
    };
    target?: {
      type: 'variable';
      value: string;
    };
    value?: {
      type: 'constant' | 'field' | 'variable' | 'hidden';
      value: string | number;
    };
  };
  condition: LogicCondition;
}

export interface LogicCondition {
  op:
    | 'is'
    | 'is_not'
    | 'equal'
    | 'not_equal'
    | 'begins_with'
    | 'ends_with'
    | 'contains'
    | 'not_contains'
    | 'lower_than'
    | 'lower_equal_than'
    | 'greater_than'
    | 'greater_equal_than'
    | 'always'
    | 'on'
    | 'not_on'
    | 'earlier_than'
    | 'earlier_than_or_on'
    | 'later_than'
    | 'later_than_or_on';
  vars: Array<{
    type: 'field' | 'constant' | 'variable' | 'hidden' | 'end';
    value?: string | number | boolean;
  }>;
}

export interface FormVariables {
  score?: number;
  price?: number;
}

export interface FormCreateInput {
  title: string;
  type?: 'quiz' | 'form';
  settings?: FormSettings;
  theme?: { href: string };
  workspace?: { href: string };
  welcomeScreens?: WelcomeScreen[];
  thankYouScreens?: ThankYouScreen[];
  fields?: FormField[];
  logic?: FormLogic[];
  hidden?: string[];
  variables?: FormVariables;
}

export interface FormUpdateInput extends FormCreateInput {
  // Same as create but all fields are optional
}

export interface FormPatchOperation {
  op: 'replace';
  path: string;
  value: unknown;
}

// =============================================================================
// Form Response
// =============================================================================

export interface FormResponse {
  responseId: string;
  token?: string;
  landedAt: string;
  submittedAt?: string;
  metadata?: ResponseMetadata;
  hidden?: Record<string, string>;
  calculated?: {
    score?: number;
  };
  variables?: Array<{
    key: string;
    type: 'number' | 'text';
    number?: number;
    text?: string;
  }>;
  answers?: Answer[];
}

export interface ResponseMetadata {
  userAgent?: string;
  platform?: string;
  referer?: string;
  networkId?: string;
  browser?: string;
}

export interface Answer {
  field: {
    id: string;
    ref?: string;
    type: FieldType;
  };
  type: AnswerType;
  text?: string;
  number?: number;
  boolean?: boolean;
  email?: string;
  date?: string;
  url?: string;
  fileUrl?: string;
  payment?: {
    amount: string;
    last4: string;
    name: string;
    success: boolean;
  };
  choice?: {
    id?: string;
    label?: string;
    ref?: string;
    other?: string;
  };
  choices?: {
    ids?: string[];
    labels?: string[];
    refs?: string[];
    other?: string;
  };
  phoneNumber?: string;
  matrix?: Record<string, { id: string; label: string; ref?: string }>;
  ranking?: { ids?: string[]; labels?: string[]; refs?: string[] };
}

export type AnswerType =
  | 'text'
  | 'number'
  | 'boolean'
  | 'email'
  | 'date'
  | 'url'
  | 'file_url'
  | 'payment'
  | 'choice'
  | 'choices'
  | 'phone_number';

export interface ResponsesQueryParams {
  pageSize?: number;
  since?: string;
  until?: string;
  after?: string;
  before?: string;
  includedResponseIds?: string[];
  completed?: boolean;
  responseType?: ('started' | 'partial' | 'completed')[];
  sort?: string;
  query?: string;
  fields?: string[];
}

// =============================================================================
// Theme
// =============================================================================

export interface Theme {
  id: string;
  name?: string;
  visibility?: 'public' | 'private';
  font?: string;
  hasTransparentButton?: boolean;
  roundedCorners?: 'none' | 'small' | 'medium' | 'large';
  colors?: ThemeColors;
  background?: ThemeBackground;
  fields?: ThemeFields;
  screens?: ThemeScreens;
}

export interface ThemeColors {
  answer?: string;
  background?: string;
  button?: string;
  question?: string;
}

export interface ThemeBackground {
  href?: string;
  layout?: 'fullscreen' | 'repeat' | 'no-repeat';
  brightness?: number;
}

export interface ThemeFields {
  alignment?: 'left' | 'center';
  fontSize?: 'small' | 'medium' | 'large';
}

export interface ThemeScreens {
  alignment?: 'left' | 'center';
  fontSize?: 'small' | 'medium' | 'large';
}

export interface ThemeCreateInput {
  name?: string;
  font?: string;
  hasTransparentButton?: boolean;
  roundedCorners?: 'none' | 'small' | 'medium' | 'large';
  colors: ThemeColors;
  background?: ThemeBackground;
  fields?: ThemeFields;
  screens?: ThemeScreens;
}

export interface ThemeUpdateInput extends Partial<ThemeCreateInput> {}

// =============================================================================
// Image
// =============================================================================

export interface TypeformImage {
  id: string;
  src: string;
  fileName: string;
  width?: number;
  height?: number;
  mediaType?: 'image/gif' | 'image/jpeg' | 'image/png';
  hasAlpha?: boolean;
  avgColor?: string;
}

export interface ImageCreateInput {
  fileName?: string;
  image?: string; // Base64 encoded image without data:image/xxx;base64, prefix
  url?: string;
}

// =============================================================================
// Webhook
// =============================================================================

export interface Webhook {
  id: string;
  formId: string;
  tag: string;
  url: string;
  enabled: boolean;
  secret?: string;
  verifySsl?: boolean;
  eventTypes?: {
    formResponse?: boolean;
    formResponsePartial?: boolean;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface WebhookCreateInput {
  tag: string;
  url: string;
  enabled?: boolean;
  secret?: string;
  verifySsl?: boolean;
  eventTypes?: {
    formResponse?: boolean;
    formResponsePartial?: boolean;
  };
}

export interface WebhookUpdateInput extends WebhookCreateInput {}

// =============================================================================
// Custom Messages
// =============================================================================

export interface FormMessages {
  [key: string]: string;
}

// =============================================================================
// Response Format
// =============================================================================

export type ResponseFormat = 'json' | 'markdown';
