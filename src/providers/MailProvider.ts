// MailProvider — the ONE interface every mail provider must satisfy.
// All mail traffic in the app goes through this interface. No screen, hook
// or repository ever calls a provider host directly, and no provider host,
// key or endpoint is hard-coded anywhere in the app (FULL_BUILD_PROMPT §3.1).
// The owner supplies a concrete provider; until then the app shows a
// "Provider not configured" state (see configuredProvider.ts).

export interface ProviderMessage {
  providerMessageId: string;
  fromAddress: string;
  subject: string;
  receivedAt: number; // unix milliseconds
  bodyText: string;
  bodyHtml: string | null;
}

export interface MailProvider {
  /** Ask the provider for a brand-new disposable address. */
  createAddress(): Promise<{ address: string; providerRef: string }>;
  /** List messages the provider has received for this address. */
  listMessages(address: string): Promise<ProviderMessage[]>;
  /** Fetch one full message (body included). */
  getMessage(address: string, providerMessageId: string): Promise<ProviderMessage | null>;
  /** Release the address at the provider, if it supports that. */
  deleteAddress(providerRef: string): Promise<void>;
}

export class ProviderNotConfiguredError extends Error {
  constructor() {
    super(
      'No mail provider is configured. Open Settings and add your provider ' +
        'details, or use the app with local data only.',
    );
    this.name = 'ProviderNotConfiguredError';
  }
}
