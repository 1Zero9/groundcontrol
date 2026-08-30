"use client";

import { useEffect, useState } from "react";
import { Check, Copy, X } from "lucide-react";
import type { FamilyMember } from "../../src/core/models";
import { generateMemberInviteLinkAction, revokeMemberInviteLinkAction } from "../../lib/auth/actions";

interface InviteLinkModalProps {
  member: FamilyMember | null;
  onClose: () => void;
}

export function InviteLinkModal({ member, onClose }: InviteLinkModalProps) {
  const [link, setLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [revoked, setRevoked] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [confirmingRevoke, setConfirmingRevoke] = useState(false);

  useEffect(() => {
    if (!member) return;

    let cancelled = false;
    generateMemberInviteLinkAction(member.id)
      .then((token) => {
        if (cancelled) return;
        setLink(`${window.location.origin}/invite?token=${encodeURIComponent(token)}`);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Couldn't create a link");
      });

    return () => {
      cancelled = true;
    };
  }, [member]);

  if (!member) return null;

  const handleCopy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Couldn't copy — select and copy the link manually.");
    }
  };

  const handleRevoke = async () => {
    setRevoking(true);
    try {
      await revokeMemberInviteLinkAction(member.id);
      setRevoked(true);
      setConfirmingRevoke(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't revoke the link");
    } finally {
      setRevoking(false);
    }
  };

  return (
    <div
      className="modal-backdrop-overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div
        className="add-sheet-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="invite-link-modal-title"
      >
        <div className="sheet-pill-handle" />

        <div className="sheet-header">
          <h2 id="invite-link-modal-title" className="sheet-title">
            Send login link to {member.name}
          </h2>
          <button type="button" className="sheet-close-btn" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="add-sheet-form">
          <p className="whos-it-for-label">
            Share this link so {member.name} can set up their own login on
            their own phone. It expires in 3 days, and generating a new one
            here will invalidate this link.
          </p>

          {error && <p className="module-feed-status is-error">{error}</p>}

          {revoked ? (
            <p className="module-feed-status is-error">
              Link revoked. It can no longer be used to connect.
            </p>
          ) : (
            <>
              <div className="module-feed-input-row">
                <input
                  type="text"
                  className="module-feed-input"
                  value={link ?? "Generating link…"}
                  readOnly
                  onFocus={(e) => e.currentTarget.select()}
                  aria-label="Invite link"
                />
                <button
                  type="button"
                  className="module-sync-btn"
                  onClick={handleCopy}
                  disabled={!link}
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? "Copied" : "Copy link"}
                </button>
              </div>

              {confirmingRevoke ? (
                <div className="admin-reset-login-actions">
                  <button
                    type="button"
                    className="revoke-link-btn"
                    onClick={handleRevoke}
                    disabled={revoking}
                  >
                    {revoking ? "Revoking…" : "Yes, revoke it"}
                  </button>
                  <button
                    type="button"
                    className="admin-reset-login-cancel-btn"
                    onClick={() => setConfirmingRevoke(false)}
                    disabled={revoking}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="revoke-link-btn"
                  onClick={() => setConfirmingRevoke(true)}
                  disabled={!link}
                >
                  Revoke this link
                </button>
              )}
            </>
          )}

          <div className="sheet-actions-row">
            <button type="button" className="sheet-cancel-btn" onClick={onClose}>
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
