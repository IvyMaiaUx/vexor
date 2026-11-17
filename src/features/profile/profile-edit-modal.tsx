"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { SupportedLocale } from "@/config/site";
import { useAuthStore } from "@/features/auth/use-auth-store";
import {
  validateProfileUpdate,
  type AuthUserProfile,
  type ProfileUpdateInput,
} from "@/features/auth/validation";
import {
  uploadAndPersistAvatar,
  validateAvatarFile,
} from "@/features/profile/avatar-service";
import { updateOwnProfile } from "@/features/profile/profile-service";
import type { Dictionary } from "@/lib/i18n/dictionaries";

interface ProfileEditModalProps {
  profile: AuthUserProfile;
  locale: SupportedLocale;
  dict: Dictionary;
  isOpen: boolean;
  onClose: () => void;
}

export function ProfileEditModal(props: ProfileEditModalProps) {
  if (!props.isOpen) {
    return null;
  }

  return <ProfileEditModalForm key={props.profile.id} {...props} />;
}

function ProfileEditModalForm({
  profile,
  locale,
  dict,
  onClose,
}: ProfileEditModalProps) {
  const { authMode, updateProfile, setAuthenticatedSession, refreshSession } =
    useAuthStore();

  const [username, setUsername] = useState(profile.username || "");
  const [displayName, setDisplayName] = useState(profile.displayName || "");
  const [bio, setBio] = useState(profile.bio || "");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl || "");
  const [githubUrl, setGithubUrl] = useState(profile.githubUrl || "");
  const [linkedinUrl, setLinkedinUrl] = useState(profile.linkedinUrl || "");
  const [interestsString, setInterestsString] = useState(
    (profile.interests || []).join(", ")
  );
  const [preferredLanguage, setPreferredLanguage] = useState<SupportedLocale>(
    profile.preferredLanguage || locale
  );

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(
    null
  );
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const inFlightRef = useRef(false);

  useEffect(() => {
    return () => {
      if (avatarPreviewUrl && avatarPreviewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(avatarPreviewUrl);
      }
    };
  }, [avatarPreviewUrl]);

  const usernameId = useId();
  const dNameId = useId();
  const bioId = useId();
  const avatarId = useId();
  const ghId = useId();
  const liId = useId();
  const interestsId = useId();
  const langId = useId();

  const isPt = locale === "pt-BR";

  const isDirty = useMemo(() => {
    return (
      selectedAvatarFile !== null ||
      username.trim().toLowerCase() !== (profile.username || "").toLowerCase() ||
      displayName !== (profile.displayName || "") ||
      bio !== (profile.bio || "") ||
      avatarUrl !== (profile.avatarUrl || "") ||
      githubUrl !== (profile.githubUrl || "") ||
      linkedinUrl !== (profile.linkedinUrl || "") ||
      interestsString !== (profile.interests || []).join(", ") ||
      preferredLanguage !== (profile.preferredLanguage || locale)
    );
  }, [
    avatarUrl,
    bio,
    displayName,
    githubUrl,
    interestsString,
    linkedinUrl,
    locale,
    preferredLanguage,
    profile.avatarUrl,
    profile.bio,
    profile.displayName,
    profile.githubUrl,
    profile.interests,
    profile.linkedinUrl,
    profile.preferredLanguage,
    profile.username,
    selectedAvatarFile,
    username,
  ]);

  const handleRequestClose = () => {
    if (isSubmitting) {
      return;
    }
    if (
      isDirty &&
      !success &&
      typeof window !== "undefined" &&
      !window.confirm(
        isPt
          ? "Você possui alterações não salvas. Deseja descartá-las?"
          : "You have unsaved changes. Discard them?"
      )
    ) {
      return;
    }
    setSubmitError(null);
    onClose();
  };

  const handleCancelAvatarSelection = () => {
    if (isSubmitting) {
      return;
    }
    setSelectedAvatarFile(null);
    setAvatarPreviewUrl(null);
    setAvatarError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleAvatarFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }

    const validation = await validateAvatarFile(file, locale);
    if (!validation.valid) {
      setSelectedAvatarFile(null);
      setAvatarPreviewUrl(null);
      setAvatarError(validation.message);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    setAvatarError(null);
    setSubmitError(null);
    setSelectedAvatarFile(file);
    setAvatarPreviewUrl(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inFlightRef.current || isSubmitting) {
      return;
    }

    const parsedInterests = interestsString
      .split(/[,;\n]+/)
      .map((i) => i.trim())
      .filter((i) => i.length > 0)
      .slice(0, 10);

    const input: ProfileUpdateInput = {
      username: username.trim().toLowerCase(),
      displayName,
      bio,
      interests: parsedInterests,
      avatarUrl,
      githubUrl,
      linkedinUrl,
      preferredLanguage,
    };

    const validation = validateProfileUpdate(input, locale);
    if (!validation.valid) {
      setErrors(validation.errors as Record<string, string>);
      setSubmitError(null);
      return;
    }

    if (avatarError) {
      setSubmitError(avatarError);
      return;
    }

    setErrors({});
    setSubmitError(null);
    inFlightRef.current = true;
    setIsSubmitting(true);

    try {
      if (authMode === "supabase") {
        if (selectedAvatarFile) {
          const uploadResult = await uploadAndPersistAvatar({
            file: selectedAvatarFile,
            profileInput: {
              username: input.username,
              displayName: input.displayName,
              bio: input.bio,
              interests: input.interests,
              githubUrl: input.githubUrl,
              linkedinUrl: input.linkedinUrl,
              preferredLanguage: input.preferredLanguage,
            },
            previousAvatarUrl: profile.avatarUrl,
            expectedUserId: profile.id,
            locale,
          });

          if (uploadResult.status === "upload_error") {
            if (uploadResult.fieldErrors) {
              setErrors(uploadResult.fieldErrors as Record<string, string>);
            }
            setSubmitError(uploadResult.message);
            return;
          }

          setAvatarUrl(uploadResult.profile.avatarUrl ?? "");
          setSelectedAvatarFile(null);
          setAvatarPreviewUrl(null);
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
          setAuthenticatedSession(uploadResult.profile);
          void refreshSession();
        } else {
          const result = await updateOwnProfile(input, {
            locale,
            expectedUserId: profile.id,
          });

          if (result.status === "update_error") {
            if (result.fieldErrors) {
              setErrors(result.fieldErrors as Record<string, string>);
            }
            const errorMessages: Record<string, string> = {
              username_taken: isPt
                ? "Este username já está em uso por outro membro."
                : "This username is already taken.",
              rls_denied: isPt
                ? "Permissão negada pela política de segurança (conta suspensa ou não autorizada)."
                : "Permission denied by security policy (suspended or unauthorized account).",
              connection_error: isPt
                ? "Não foi possível conectar ao servidor. Suas alterações foram mantidas para nova tentativa."
                : "Could not reach the server. Your changes were kept so you can retry.",
              unauthenticated: isPt
                ? "Sua sessão expirou. Faça login novamente para salvar."
                : "Your session expired. Sign in again to save.",
              validation_error: isPt
                ? "Verifique os campos destacados antes de salvar."
                : "Please review the highlighted fields before saving.",
              forbidden_field: isPt
                ? "Campos administrativos não podem ser alterados."
                : "Administrative fields cannot be modified.",
              identity_mismatch: isPt
                ? "Inconsistência de identidade detectada."
                : "Identity mismatch detected.",
              update_failed: isPt
                ? "Falha ao atualizar o perfil. Tente novamente."
                : "Failed to update profile. Please try again.",
            };
            setSubmitError(
              errorMessages[result.errorCode] ?? errorMessages.update_failed
            );
            return;
          }

          setAuthenticatedSession(result.profile);
          void refreshSession();
        }
      } else {
        updateProfile(profile.id, {
          username: input.username,
          displayName: displayName.trim(),
          bio: bio.trim(),
          interests: parsedInterests,
          avatarUrl: avatarUrl.trim() || undefined,
          githubUrl: githubUrl.trim() || undefined,
          linkedinUrl: linkedinUrl.trim() || undefined,
          preferredLanguage,
        });
      }

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 700);
    } finally {
      inFlightRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-profile-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
        onClick={handleRequestClose}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div className="relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-800 bg-[#0d1322] p-6 shadow-2xl shadow-cyan-950/50 sm:p-8">
        <div className="flex items-start justify-between">
          <div>
            <h2
              id="edit-profile-title"
              className="text-xl font-bold text-slate-100 sm:text-2xl"
            >
              {dict.profilePage.editModal.title}
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              {dict.profilePage.editModal.subtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={handleRequestClose}
            disabled={isSubmitting}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-100 disabled:opacity-50"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {success && (
          <div
            role="status"
            className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-center font-mono text-xs text-emerald-300"
          >
            ✓ {dict.profilePage.editModal.successMessage}
          </div>
        )}

        {submitError && (
          <div
            role="alert"
            className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 font-mono text-xs text-rose-300"
          >
            {submitError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          {/* Username */}
          <div>
            <label
              htmlFor={usernameId}
              className="block font-mono text-xs font-semibold uppercase tracking-wider text-slate-300"
            >
              Username
            </label>
            <input
              id={usernameId}
              type="text"
              maxLength={30}
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              placeholder="sec_analyst"
              className="mt-1.5 w-full rounded-xl border border-slate-800 bg-[#070b14] px-4 py-2.5 font-mono text-sm text-slate-100 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
            />
            {errors.username && (
              <p className="mt-1 font-mono text-xs text-rose-400">
                {errors.username}
              </p>
            )}
          </div>
          {/* Display Name */}
          <div>
            <div className="flex justify-between">
              <label
                htmlFor={dNameId}
                className="block font-mono text-xs font-semibold uppercase tracking-wider text-slate-300"
              >
                {dict.profilePage.editModal.displayNameLabel}
              </label>
              <span className="font-mono text-[11px] text-slate-500">
                {displayName.length}/60
              </span>
            </div>
            <input
              id={dNameId}
              type="text"
              maxLength={60}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={dict.profilePage.editModal.displayNamePlaceholder}
              className="mt-1.5 w-full rounded-xl border border-slate-800 bg-[#070b14] px-4 py-2.5 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
            />
            {errors.displayName && (
              <p className="mt-1 font-mono text-xs text-rose-400">
                {errors.displayName}
              </p>
            )}
          </div>

          {/* Bio */}
          <div>
            <div className="flex justify-between">
              <label
                htmlFor={bioId}
                className="block font-mono text-xs font-semibold uppercase tracking-wider text-slate-300"
              >
                {dict.profilePage.editModal.bioLabel}
              </label>
              <span className="font-mono text-[11px] text-slate-500">
                {bio.length}/500
              </span>
            </div>
            <textarea
              id={bioId}
              rows={4}
              maxLength={500}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder={dict.profilePage.editModal.bioPlaceholder}
              className="mt-1.5 w-full rounded-xl border border-slate-800 bg-[#070b14] p-3 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
            />
            {errors.bio && (
              <p className="mt-1 font-mono text-xs text-rose-400">
                {errors.bio}
              </p>
            )}
          </div>

          {/* Avatar Upload */}
          <div>
            <label
              htmlFor={avatarId}
              className="block font-mono text-xs font-semibold uppercase tracking-wider text-slate-300"
            >
              {dict.profilePage.editModal.avatarSectionLabel}
            </label>
            <div className="mt-2 flex flex-col gap-4 rounded-2xl border border-slate-800 bg-[#070b14] p-4 sm:flex-row sm:items-center">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-cyan-500/30 bg-[#0d1322]">
                {avatarPreviewUrl || avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarPreviewUrl || avatarUrl}
                    alt={dict.profilePage.editModal.avatarPreviewAlt}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center font-mono text-sm font-bold text-cyan-300">
                    {(displayName || username || "VX")
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    ref={fileInputRef}
                    id={avatarId}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    disabled={isSubmitting}
                    onChange={handleAvatarFileChange}
                    className="sr-only"
                  />
                  <label
                    htmlFor={avatarId}
                    className={`inline-flex cursor-pointer items-center rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-3.5 py-2 text-xs font-semibold text-cyan-200 transition-colors hover:bg-cyan-500/20 ${
                      isSubmitting ? "pointer-events-none opacity-50" : ""
                    }`}
                  >
                    {avatarUrl || selectedAvatarFile
                      ? dict.profilePage.editModal.avatarChangeButton
                      : dict.profilePage.editModal.avatarSelectButton}
                  </label>

                  {selectedAvatarFile && (
                    <button
                      type="button"
                      onClick={handleCancelAvatarSelection}
                      disabled={isSubmitting}
                      className="rounded-xl border border-slate-700 px-3 py-2 text-xs font-medium text-slate-300 transition-colors hover:border-slate-600 hover:text-slate-100 disabled:opacity-50"
                    >
                      {dict.profilePage.editModal.avatarCancelSelection}
                    </button>
                  )}
                </div>

                <p className="font-mono text-[11px] text-slate-400">
                  {selectedAvatarFile
                    ? `${selectedAvatarFile.name} (${Math.max(
                        1,
                        Math.round(selectedAvatarFile.size / 1024)
                      )} KB)`
                    : dict.profilePage.editModal.avatarHint}
                </p>
              </div>
            </div>
            {(avatarError || errors.avatarUrl) && (
              <p className="mt-1.5 font-mono text-xs text-rose-400">
                {avatarError || errors.avatarUrl}
              </p>
            )}
          </div>

          {/* GitHub & LinkedIn Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor={ghId}
                className="block font-mono text-xs font-semibold uppercase tracking-wider text-slate-300"
              >
                {dict.profilePage.editModal.githubUrlLabel}
              </label>
              <input
                id={ghId}
                type="url"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                placeholder={dict.profilePage.editModal.githubUrlPlaceholder}
                className="mt-1.5 w-full rounded-xl border border-slate-800 bg-[#070b14] px-4 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
              />
              {errors.githubUrl && (
                <p className="mt-1 font-mono text-xs text-rose-400">
                  {errors.githubUrl}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor={liId}
                className="block font-mono text-xs font-semibold uppercase tracking-wider text-slate-300"
              >
                {dict.profilePage.editModal.linkedinUrlLabel}
              </label>
              <input
                id={liId}
                type="url"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                placeholder={dict.profilePage.editModal.linkedinUrlPlaceholder}
                className="mt-1.5 w-full rounded-xl border border-slate-800 bg-[#070b14] px-4 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
              />
              {errors.linkedinUrl && (
                <p className="mt-1 font-mono text-xs text-rose-400">
                  {errors.linkedinUrl}
                </p>
              )}
            </div>
          </div>

          {/* Interests */}
          <div>
            <label
              htmlFor={interestsId}
              className="block font-mono text-xs font-semibold uppercase tracking-wider text-slate-300"
            >
              {dict.profilePage.editModal.interestsLabel}
            </label>
            <input
              id={interestsId}
              type="text"
              value={interestsString}
              onChange={(e) => setInterestsString(e.target.value)}
              placeholder={dict.profilePage.editModal.interestsPlaceholder}
              className="mt-1.5 w-full rounded-xl border border-slate-800 bg-[#070b14] px-4 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
            />
            <p className="mt-1 text-xs text-slate-500">
              {dict.profilePage.editModal.interestsHint}
            </p>
            {errors.interests && (
              <p className="mt-1 font-mono text-xs text-rose-400">
                {errors.interests}
              </p>
            )}
          </div>

          {/* Language Preference */}
          <div>
            <label
              htmlFor={langId}
              className="block font-mono text-xs font-semibold uppercase tracking-wider text-slate-300"
            >
              {dict.profilePage.editModal.languageLabel}
            </label>
            <select
              id={langId}
              value={preferredLanguage}
              onChange={(e) =>
                setPreferredLanguage(e.target.value as SupportedLocale)
              }
              className="mt-1.5 w-full rounded-xl border border-slate-800 bg-[#070b14] px-4 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
            >
              <option value="pt-BR">Português (Brasil)</option>
              <option value="en">English (US)</option>
            </select>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-800 pt-4">
            <button
              type="button"
              onClick={handleRequestClose}
              disabled={isSubmitting}
              className="rounded-xl border border-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:border-slate-700 hover:text-slate-100 disabled:opacity-50"
            >
              {dict.profilePage.editModal.cancelButton}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-cyan-500 px-5 py-2 text-xs font-semibold text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-colors hover:bg-cyan-400 disabled:opacity-50"
            >
              {isSubmitting
                ? selectedAvatarFile
                  ? dict.profilePage.editModal.avatarUploading
                  : dict.profilePage.editModal.savingButton
                : dict.profilePage.editModal.saveButton}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
