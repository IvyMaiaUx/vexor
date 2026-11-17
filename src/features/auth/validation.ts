import type { SupportedLocale } from "@/config/site";
import type { Dictionary } from "@/lib/i18n/dictionaries";

export type UserRole = "member" | "moderator" | "admin";

export interface AuthUserProfile {
  id: string;
  username: string;
  displayName: string;
  email: string;
  preferredLanguage: SupportedLocale;
  role: UserRole;
  /** Especialidade técnica opcional (ex: Security Researcher, DFIR, Malware Analyst), tratada separadamente da role RBAC */
  specialty?: string;
  isSuspended: boolean;
  createdAt: string;
  avatarUrl?: string;
  bio?: string;
  interests?: string[];
  githubUrl?: string;
  linkedinUrl?: string;
}

export interface RegisterInput {
  email: string;
  username: string;
  displayName: string;
  password: string;
  confirmPassword: string;
  preferredLanguage: SupportedLocale;
  ethicsAccepted: boolean;
}

export interface RegisterValidationResult {
  valid: boolean;
  errors: Partial<Record<keyof RegisterInput, string>>;
}

/**
 * Exact match with PostgreSQL constraint `profiles_username_format_chk`:
 * `username ~ '^[a-z0-9_]{3,30}$'`
 */
export const USERNAME_REGEX = /^[a-z0-9_]{3,30}$/;
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidUsername(username: string): boolean {
  return USERNAME_REGEX.test(username.trim());
}

export function validateRegistrationInput(
  input: RegisterInput,
  _existingProfiles: AuthUserProfile[],
  dict: Dictionary
): RegisterValidationResult {
  const errors: Partial<Record<keyof RegisterInput, string>> = {};

  const trimmedEmail = input.email.trim().toLowerCase();
  const trimmedUsername = input.username.trim().toLowerCase();
  const trimmedDisplayName = input.displayName.trim();

  if (!trimmedEmail || !EMAIL_REGEX.test(trimmedEmail)) {
    errors.email = dict.auth.errors.invalidEmail;
  }

  if (!isValidUsername(trimmedUsername)) {
    errors.username = dict.auth.errors.invalidUsername;
  }

  if (trimmedDisplayName.length < 1 || trimmedDisplayName.length > 60) {
    errors.displayName = dict.auth.errors.displayNameLength;
  }

  if (!input.password || input.password.length < 8) {
    errors.password = dict.auth.errors.passwordLength;
  }

  if (input.password !== input.confirmPassword) {
    errors.confirmPassword = dict.auth.errors.passwordMismatch;
  }

  if (!input.ethicsAccepted) {
    errors.ethicsAccepted = dict.auth.errors.ethicsRequired;
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export interface ProfileUpdateInput {
  username?: string;
  displayName: string;
  bio: string;
  interests: string[];
  avatarUrl: string;
  githubUrl: string;
  linkedinUrl: string;
  preferredLanguage: SupportedLocale;
}

export const GITHUB_URL_REGEX = /^https:\/\/(www\.)?github\.com\/[A-Za-z0-9._-]+\/?$/;
export const LINKEDIN_URL_REGEX =
  /^https:\/\/([a-z]{2,3}\.)?linkedin\.com\/(in|company)\/[A-Za-z0-9._%-]+\/?$/;

export function validateProfileUpdate(
  input: ProfileUpdateInput,
  locale: SupportedLocale
): { valid: boolean; errors: Partial<Record<keyof ProfileUpdateInput, string>> } {
  const errors: Partial<Record<keyof ProfileUpdateInput, string>> = {};
  const isPt = locale === "pt-BR";

  if (typeof input.username === "string") {
    const trimmedUsername = input.username.trim().toLowerCase();
    if (!isValidUsername(trimmedUsername)) {
      errors.username = isPt
        ? "Username deve ter entre 3 e 30 caracteres (letras minúsculas, números ou _)."
        : "Username must be 3–30 characters (lowercase letters, numbers, or _).";
    }
  }

  const trimmedName = input.displayName.trim();
  if (trimmedName && (trimmedName.length < 1 || trimmedName.length > 60)) {
    errors.displayName = isPt
      ? "O nome de exibição deve ter entre 1 e 60 caracteres."
      : "Display name must be between 1 and 60 characters.";
  }

  const trimmedBio = input.bio.trim();
  if (trimmedBio && trimmedBio.length > 500) {
    errors.bio = isPt
      ? "A biografia não pode exceder 500 caracteres."
      : "Bio cannot exceed 500 characters.";
  }

  const trimmedAvatar = input.avatarUrl.trim();
  if (trimmedAvatar) {
    if (!trimmedAvatar.startsWith("https://")) {
      errors.avatarUrl = isPt
        ? "O avatar deve ser uma URL segura iniciando com https://"
        : "Avatar must be a secure URL starting with https://";
    }
  }

  const trimmedGh = input.githubUrl.trim();
  if (trimmedGh) {
    if (!GITHUB_URL_REGEX.test(trimmedGh)) {
      errors.githubUrl = isPt
        ? "URL do GitHub inválida (ex.: https://github.com/usuario)"
        : "Invalid GitHub URL (e.g. https://github.com/username)";
    }
  }

  const trimmedLi = input.linkedinUrl.trim();
  if (trimmedLi) {
    if (!LINKEDIN_URL_REGEX.test(trimmedLi)) {
      errors.linkedinUrl = isPt
        ? "URL do LinkedIn inválida (ex.: https://linkedin.com/in/usuario)"
        : "Invalid LinkedIn URL (e.g. https://linkedin.com/in/username)";
    }
  }

  if (input.interests.length > 10) {
    errors.interests = isPt
      ? "Máximo de 10 áreas de interesse."
      : "Maximum of 10 interest tags allowed.";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}
