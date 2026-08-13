"use client";

import { useCallback, useId, useState, type FormEvent } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";

export function LoginModal() {
  const { loginModalOpen, closeLoginModal, login } = useAuth();
  const titleId = useId();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClose = useCallback(() => {
    setUsername("");
    setPassword("");
    setError(null);
    closeLoginModal();
  }, [closeLoginModal]);

  const handleSubmit = useCallback(
    async (event: FormEvent) => {
      event.preventDefault();
      setError(null);
      setIsSubmitting(true);
      try {
        const result = await login(username, password);
        if (result.ok) {
          handleClose();
          return;
        }
        const { error: loginError } = result;
        if (loginError.locked) {
          const seconds = loginError.retryAfterSeconds;
          const minutes = seconds ? Math.ceil(seconds / 60) : 15;
          setError(`Account locked. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`);
        } else {
          setError(loginError.message);
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [handleClose, login, password, username],
  );

  if (!loginModalOpen) return null;

  return (
    <Modal onClose={handleClose} testId="login-modal" labelledBy={titleId} className="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4 p-6" data-testid="login-form">
        <h2 id={titleId} className="font-fraunces text-display-sm text-paper-100">
          Admin login
        </h2>
        <Input
          label="Username"
          name="username"
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          data-testid="login-username"
        />
        <Input
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          data-testid="login-password"
        />
        {error && (
          <p className="text-body-sm text-accent-ember" role="alert" data-testid="login-error">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting} data-testid="login-submit">
            {isSubmitting ? "Signing in…" : "Sign in"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
