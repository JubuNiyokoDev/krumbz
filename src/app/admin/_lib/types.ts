/** Shapes exchanged between the super-admin Server Actions and their client forms. */

export interface Credentials {
  identifier: string;
  /** Temporary password: shown once, never stored in clear. */
  password: string;
  whatsappUrl: string;
  loginUrl: string;
}

export interface ActionState {
  ok?: boolean;
  /** Main error (French). */
  error?: string;
  /** Field-level errors: field name → message. */
  fields?: Record<string, string>;
  message?: string;
  /** Non-blocking notices (contrast, certificate…). */
  warnings?: string[];
  credentials?: Credentials;
  /** Extra data of a specific form (e.g. the created vendor). */
  data?: Record<string, string | number | boolean | null>;
}

export type FormAction = (state: ActionState | null, form: FormData) => Promise<ActionState>;
