import { useEffect, useRef, useState, type ReactNode } from "react";
import QRCode from "qrcode";
import gsap from "gsap";
import {
  ArrowDownToLine,
  ArrowUpRight,
  Check,
  Copy,
  File,
  Link,
  LoaderCircle,
  Plus,
  Share2,
  Smartphone,
  X,
} from "lucide-react";
import type { useRoom } from "./useRoom";
import type { Item } from "./transfer";
export type Room = ReturnType<typeof useRoom>;
export const bytes = (n: number) =>
  n < 1024
    ? `${n} B`
    : n < 1024 * 1024
      ? `${(n / 1024).toFixed(1)} KB`
      : `${(n / 1024 / 1024).toFixed(1)} MB`;

export function CopyButton({
  value,
  children = "Copy",
  compact = false,
  onError,
}: {
  value: string;
  children?: ReactNode;
  compact?: boolean;
  onError: (message: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <button
      className={compact ? "icon-button copy-message" : "button secondary"}
      aria-label={compact ? (copied ? "Copied" : "Copy message") : undefined}
      title={compact ? (copied ? "Copied" : "Copy message") : undefined}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          clearTimeout(timer.current);
          timer.current = setTimeout(() => setCopied(false), 1800);
        } catch {
          onError(
            "Clipboard access was denied. Select and copy the text manually.",
          );
        }
      }}
    >
      {copied ? <Check size={18} /> : <Copy size={18} />}{" "}
      {!compact && (copied ? "Copied" : children)}
    </button>
  );
}

export function Connection({
  room,
  compact = false,
}: {
  room: Room;
  compact?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const drawer = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const open = !compact || expanded;
  useEffect(() => {
    if (!compact) setExpanded(false);
  }, [compact]);
  useEffect(() => {
    if (!drawer.current) return;
    const tween = gsap.to(drawer.current, {
      height: open ? "auto" : 0,
      opacity: open ? 1 : 0,
      duration: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? 0
        : 0.35,
      ease: "power2.inOut",
    });
    return () => {
      tween.kill();
    };
  }, [open, room.invite]);
  function closeInvite() {
    setExpanded(false);
    toggle.current?.focus();
  }
  const [link, setLink] = useState("");
  const [qr, setQR] = useState("");
  const [sharing, setSharing] = useState(false);
  const [now, setNow] = useState(Date.now);
  const away = room.members.filter((m) => m.awayUntil > 0);
  const until = Math.min(
    room.awayUntil || Infinity,
    ...away.map((m) => m.awayUntil),
  );
  useEffect(() => {
    if (!Number.isFinite(until)) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [until]);
  useEffect(() => {
    let active = true;
    setQR("");
    if (room.invite)
      void QRCode.toDataURL(room.invite, {
        width: 240,
        margin: 2,
        color: { dark: "#232723", light: "#ffffff" },
      }).then((value) => {
        if (active) setQR(value);
      });
    return () => {
      active = false;
    };
  }, [room.invite]);
  const initial = ["idle", "closed"].includes(room.status);
  const seconds = Math.max(0, Math.ceil((until - now) / 1000));
  return (
    <section
      className={
        "connection panel v2-connection" + (compact ? " room-toolbar" : "")
      }
      aria-labelledby="connection-title"
    >
      <div className="room-heading">
        <span>{initial ? "A temporary space" : "YOUR ROOM"}</span>
        <h2 id="connection-title">
          {initial
            ? "Bring your devices together."
            : room.nickname || "Opening Drop…"}
        </h2>
        {!initial && !compact && (
          <p>Up to 3 devices · One approval per new device</p>
        )}
      </div>
      {compact &&
        room.role === "host" &&
        room.invite &&
        room.members.length < 3 && (
          <button
            ref={toggle}
            className="button secondary connect-more"
            aria-expanded={expanded}
            aria-controls="room-invitation"
            onClick={() => setExpanded((value) => !value)}
          >
            <Plus size={18} className={expanded ? "plus-open" : ""} />
            Connect more
          </button>
        )}
      {initial ? (
        <>
          <button
            className="button primary full"
            onClick={() => void room.create()}
          >
            <Plus size={20} />
            Create a room
          </button>
          <div className="divider">
            <span>or use an invitation</span>
          </div>
          <form
            className="join-form"
            onSubmit={(e) => {
              e.preventDefault();
              room.join(link);
            }}
          >
            <label className="invite-field">
              <Link size={18} />
              <input
                aria-label="Invite link"
                type="url"
                placeholder="Paste invitation link"
                required
                value={link}
                onChange={(e) => setLink(e.target.value)}
              />
            </label>
            <button className="button secondary" disabled={!link.trim()}>
              Join
            </button>
          </form>
          <p className="pairing-note">
            No account. Your files go between your devices.
          </p>
        </>
      ) : (
        <>
          {room.role === "host" && room.invite && room.members.length < 3 && (
            <div
              ref={drawer}
              id="room-invitation"
              className="invite-drawer"
              aria-hidden={!open}
              inert={!open}
              onKeyDown={(event) => {
                if (event.key === "Escape" && compact) closeInvite();
              }}
            >
              <div className="v2-invite">
                {compact && (
                  <button
                    className="icon-button close-invite"
                    aria-label="Close invitation"
                    onClick={closeInvite}
                  >
                    <X size={20} />
                  </button>
                )}
                <div className="qr-frame">
                  {qr ? (
                    <img
                      src={qr}
                      width="220"
                      height="220"
                      alt="Scan to request access to this Drop room"
                    />
                  ) : (
                    <LoaderCircle className="spin" />
                  )}
                </div>
                <p>Scan on your next device</p>
                <div className="invite-actions">
                  <CopyButton value={room.invite} onError={room.setError}>
                    Copy link
                  </CopyButton>
                  {typeof navigator.share === "function" && (
                    <button
                      className="button secondary"
                      disabled={sharing}
                      onClick={async () => {
                        setSharing(true);
                        try {
                          await navigator.share({
                            title: "Join my Drop room",
                            url: room.invite,
                          });
                        } catch (e) {
                          if (!(
                            e instanceof DOMException && e.name === "AbortError"
                          ))
                            room.setError(
                              "Use Copy invite link to share this invitation.",
                            );
                        } finally {
                          setSharing(false);
                        }
                      }}
                    >
                      <Share2 size={18} />
                      Share invite
                    </button>
                  )}
                </div>
                <label className="invite-url-label">
                  Private invitation
                  <input
                    className="invite-visible"
                    aria-label="Room invite"
                    value={room.invite}
                    readOnly
                  />
                </label>
                <small>
                  Invitation valid for 10 minutes. Share only with your devices.
                </small>
              </div>
            </div>
          )}
          {room.requests.map((request) => (
            <div className="v2-approval" key={request.id}>
              <Smartphone size={25} />
              <h3>{request.label} wants to join</h3>
              <p>
                Does its screen show <strong>{room.nickname}</strong>? Approve
                only the device you just scanned.
              </p>
              <div>
                <button
                  className="button secondary"
                  onClick={() => room.reject(request)}
                >
                  Decline
                </button>
                <button
                  className="button primary"
                  onClick={() => room.approve(request)}
                >
                  Allow device
                </button>
              </div>
            </div>
          ))}
          {room.status === "approval" && (
            <div className="pending-state">
              <LoaderCircle className="spin" />
              <h3>One check, then you’re in.</h3>
              <p>
                Check <strong aria-label="Room name">{room.nickname}</strong> on
                the owner’s screen. Ask them to allow this device.
              </p>
            </div>
          )}
          {["creating", "connecting", "recovering"].includes(room.status) && (
            <div className="pending-state" role="status">
              <LoaderCircle className="spin" />
              <p>
                {room.status === "recovering"
                  ? "Reconnecting to your room. Your approval is remembered for up to 10 minutes."
                  : "Preparing your connection…"}
              </p>
            </div>
          )}
          {room.members.length > 0 && (
            <ul className="device-roster" aria-label="Room devices">
              {room.members.map((member) => (
                <li key={member.id}>
                  <Smartphone size={18} />
                  {member.id !== room.selfId &&
                  room.readyIds.length > 1 &&
                  room.readyIds.includes(member.id) ? (
                    <button
                      className="device-choice"
                      aria-label={"Choose " + member.label}
                      aria-pressed={room.target === member.id}
                      onClick={() => room.setTarget(member.id)}
                    >
                      {member.label}
                    </button>
                  ) : (
                    <span>
                      {member.label}
                      {member.id === room.selfId ? " · You" : ""}
                    </span>
                  )}
                  <small>
                    {member.id === room.selfId
                      ? "Here"
                      : room.readyIds.includes(member.id)
                        ? "Connected"
                        : member.awayUntil
                          ? "Away"
                          : "Connecting"}
                  </small>
                </li>
              ))}
            </ul>
          )}
          {Number.isFinite(until) && (
            <p className="return-window" role="status">
              Device away · return within{" "}
              <output aria-label="Background time remaining">
                {Math.floor(seconds / 60)}:
                {String(seconds % 60).padStart(2, "0")}
              </output>
            </p>
          )}
          {room.expires > 0 && (
            <div className="room-session">
              <p>
                Room ends at{" "}
                {new Date(room.expires).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                . Return within 10 minutes after switching apps.
              </p>
              <div className="session-actions">
                <button
                  className="session-action session-exit"
                  onClick={room.leave}
                >
                  <X size={16} />
                  {room.role === "host" ? "End room" : "Leave room"}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}

export function TransferList({
  items,
  cancel,
  onError,
}: {
  items: Item[];
  cancel: (id: string) => void;
  onError: (message: string) => void;
}) {
  if (!items.length) return null;
  return (
    <section className="history" aria-label="Transfers">
      <div className="section-head">
        <h2>This room</h2>
        <span className="small muted">Latest activity first</span>
      </div>
      {items.map((item) => (
        <article className="transfer-row" key={item.id}>
          <div className="file-icon">
            {item.text ? <Link size={20} /> : <File size={20} />}
          </div>
          <div className="transfer-details">
            <strong>
              {item.text
                ? `${item.direction === "in" ? "Received" : "Sent"} note`
                : item.name}
            </strong>
            <p className="small muted">
              {item.direction === "in" ? "Incoming" : "Outgoing"}
              {!item.text ? ` · ${bytes(item.size)}` : ""} ·{" "}
              {item.peerLabel && <>{item.peerLabel} · </>}
              <span>{item.status}</span>
            </p>
            {item.text ? <pre className="note-content">{item.text}</pre> : null}
            {!item.text &&
            ["Sending", "Receiving", "Verifying", "Verifying receipt"].includes(
              item.status,
            ) ? (
              <progress
                max="100"
                value={item.progress}
                aria-label={`${item.name} transfer progress`}
              />
            ) : null}
          </div>
          <div className="transfer-actions">
            {item.url ? (
              <a
                className="button secondary"
                href={item.url}
                download={item.name}
              >
                <ArrowDownToLine size={18} />
                Save file
              </a>
            ) : null}
            {item.text ? (
              <CopyButton value={item.text} onError={onError} />
            ) : null}
            {!item.text &&
            ![
              "Delivered",
              "Received",
              "Cancelled",
              "Failed",
              "Interrupted",
            ].includes(item.status) ? (
              <button
                className="icon-button"
                aria-label={`Cancel ${item.name}`}
                onClick={() => cancel(item.id)}
              >
                <X size={18} />
              </button>
            ) : null}
          </div>
        </article>
      ))}
    </section>
  );
}

export function InfoDialog({
  kind,
  close,
}: {
  kind: "help" | "privacy";
  close: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={close}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="dialog-heading">
        <h2>{kind === "help" ? "A short journey." : "What stays where."}</h2>
        <button className="icon-button" aria-label="Close" onClick={close}>
          <X />
        </button>
      </div>
      {kind === "help" ? (
        <>
          <ol className="steps">
            <li>
              <strong>Open a room.</strong>
              <p>Create a room and scan its QR on up to two other devices.</p>
            </li>
            <li>
              <strong>One check.</strong>
              <p>
                Check the six-letter room name and allow each device on the
                owner’s screen. The private QR link is the invitation; the name
                alone cannot join a room.
              </p>
            </li>
            <li>
              <strong>Choose a recipient.</strong>
              <p>
                Send files or notes to a connected device. Files need acceptance
                before download.
              </p>
            </li>
          </ol>
          <p>
            Return within 10 minutes after switching apps to reconnect without
            approving again. Keep both screens foregrounded during transfers.
            Interrupted files need to be sent again.
          </p>
        </>
      ) : (
        <p>
          Files and notes use encrypted WebRTC channels. Drop’s website and
          signaling service are trusted to introduce the right devices; there is
          no independent certificate-code comparison in this version. Files are
          not scanned for malware.
        </p>
      )}
      <p>
        Files up to 50 MB. Rooms up to two hours. No TURN relay is currently
        enabled, so some networks cannot connect. Browser termination or a
        server restart can end a room.
      </p>
      <p>
        <a href="/privacy.html">Privacy policy</a> ·{" "}
        <a href="/contact.html">Contact us</a>
      </p>
      <button className="button primary" onClick={close}>
        Got it
      </button>
    </dialog>
  );
}
