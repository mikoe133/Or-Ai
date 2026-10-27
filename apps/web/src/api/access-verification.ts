import { ClientError } from "./client.js";
import { AuthFlowError } from "../auth/errors.js";

export type AccessCheckState = {
  checking: boolean;
  failed: boolean;
  verifiedEpoch: number;
};

interface AccessCheckOptions<T> {
  epoch: () => number;
  read: () => Promise<T>;
  fingerprint: (snapshot: T) => string;
  identityChanged: () => Promise<void>;
  accept: (snapshot: T) => void;
  refresh: () => void;
  state: (value: AccessCheckState) => void;
  now?: () => number;
}

// Validation keeps its own lifetime so late replies cannot reopen a private view.
export class AccessVerification<T> {
  private confirmed?: { epoch: number; fingerprint: string };
  private pending?: Promise<void>;
  private generation = 0;
  private suspended = false;
  private disposed = false;
  private failed = false;
  private lastVerifiedAt = -Infinity;

  constructor(private readonly options: AccessCheckOptions<T>) {}

  isCurrent() {
    return !this.failed && this.confirmed?.epoch === this.options.epoch();
  }

  private publish(checking: boolean, failed = false) {
    if (this.disposed) return;
    this.failed = failed;
    this.options.state({ checking, failed, verifiedEpoch: this.confirmed?.epoch ?? -1 });
  }

  suspend() {
    this.suspended = true;
    this.generation++;
    this.publish(true);
  }

  resume() {
    this.suspended = false;
    return this.verify(true);
  }

  dispose() {
    this.disposed = true;
    this.generation++;
  }

  verify(blocking = false): Promise<void> {
    if (this.disposed || this.suspended) return Promise.resolve();
    const requiresConfirmation = blocking || !this.isCurrent();
    if (requiresConfirmation) this.publish(true);
    if (this.pending) return this.pending;
    const now = this.options.now ?? Date.now;
    // focus/pageshow/visibility events often describe the same return to a tab.
    if (!requiresConfirmation && now() - this.lastVerifiedAt < 1000)
      return Promise.resolve();
    const generation = this.generation;
    const startedEpoch = this.options.epoch();
    const stale = (epoch: number) => this.disposed || this.suspended ||
      generation !== this.generation || epoch !== this.options.epoch();
    const attempt = async () => {
      try {
        const snapshot = await this.options.read();
        if (stale(startedEpoch)) return true;
        const fingerprint = this.options.fingerprint(snapshot);
        const alreadyConfirmed = this.confirmed?.epoch === startedEpoch;
        const changed = alreadyConfirmed && this.confirmed!.fingerprint !== fingerprint;
        let acceptedEpoch = startedEpoch;
        if (changed) {
          this.publish(true);
          await this.options.identityChanged();
          acceptedEpoch++;
          if (stale(acceptedEpoch)) return true;
        }
        this.confirmed = { epoch: acceptedEpoch, fingerprint };
        this.lastVerifiedAt = now();
        this.options.accept(snapshot);
        this.publish(false);
        if (alreadyConfirmed && !changed) this.options.refresh();
        return false;
      } catch {
        if (stale(startedEpoch)) return true;
        this.publish(false, true);
        return false;
      }
    };
    this.pending = attempt().then(async repeat => {
      this.pending = undefined;
      if (repeat && !this.disposed && !this.suspended) await this.verify(true);
    });
    return this.pending;
  }
}

export function refreshOnAccessCheck(key: readonly unknown[]) {
  if (key[0] !== "private") return false;
  // Editors use explicit reads and mutation invalidations; polling must not replace drafts.
  return key[1] !== "admin" || key[2] === "overview" || key[2] === "audit";
}


export function isAccessFailure(error: unknown) {
  if (error instanceof ClientError && (error.status === 401 || error.status === 403)) return true;
  return (error instanceof ClientError || error instanceof AuthFlowError) &&
    ["AUTH_REQUIRED", "FORBIDDEN", "ACCOUNT_REQUIRED", "EMAIL_UNVERIFIED", "SESSION_CHANGED"].includes(error.code);
}
