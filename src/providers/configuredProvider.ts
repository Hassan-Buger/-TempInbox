// Provider configuration — reads the owner's provider details from the
// settings table (entered in the Settings screen, stored on the device only,
// never committed to git). Returns null when nothing is configured.
//
// Why the endpoint paths are settings, not constants: the owner has not
// supplied a provider or its API contract (seed §9 Q1, §11). Hard-coding
// one provider's paths would bake in a guess. Instead the Settings form
// lets the owner enter the base URL and the four endpoint paths his
// provider uses; until all of them are present the app stays in the honest
// "Provider not configured" state and never shows fake addresses or mail.

import type { DbLike } from '../db/types';
import { getSetting, SETTING_KEYS } from '../db/repositories/settingsRepository';
import type { MailProvider, ProviderMessage } from './MailProvider';
import { ProviderNotConfiguredError } from './MailProvider';

export interface ProviderConfig {
  baseUrl: string;
  apiKey: string;
  createPath: string;
  listPath: string;
  getPath: string;
  deletePath: string;
}

export async function getProviderConfig(db: DbLike): Promise<ProviderConfig | null> {
  const [baseUrl, apiKey, createPath, listPath, getPath, deletePath] = await Promise.all([
    getSetting(db, SETTING_KEYS.providerBaseUrl),
    getSetting(db, SETTING_KEYS.providerApiKey),
    getSetting(db, SETTING_KEYS.providerCreatePath),
    getSetting(db, SETTING_KEYS.providerListPath),
    getSetting(db, SETTING_KEYS.providerGetPath),
    getSetting(db, SETTING_KEYS.providerDeletePath),
  ]);
  if (!baseUrl || !createPath || !listPath || !getPath || !deletePath) return null;
  return { baseUrl, apiKey: apiKey ?? '', createPath, listPath, getPath, deletePath };
}

export function isProviderConfigured(config: ProviderConfig | null): boolean {
  return config !== null;
}

/** Replace {address} / {id} / {ref} placeholders in a configured path. */
function fillPath(path: string, values: Record<string, string>): string {
  return path.replace(/\{(\w+)\}/g, (_, key) => encodeURIComponent(values[key] ?? ''));
}

async function requestJson(url: string, apiKey: string, method = 'GET'): Promise<unknown> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
  const response = await fetch(url, { method, headers });
  if (!response.ok) {
    throw new Error(`Provider request failed (${response.status})`);
  }
  return response.json();
}

/**
 * Generic REST provider. It only ever calls the base URL and paths the
 * owner entered in Settings — nothing is hard-coded. The provider's JSON is
 * read with the field names documented in docs/TECHNICAL_GUIDE.md; if the
 * provider answers in a different shape, the owner adjusts the mapping
 * there rather than the app pretending the mail exists.
 */
export class ConfigurableRestProvider implements MailProvider {
  constructor(private config: ProviderConfig) {}

  private url(path: string): string {
    return `${this.config.baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
  }

  async createAddress(): Promise<{ address: string; providerRef: string }> {
    const data = (await requestJson(
      this.url(this.config.createPath),
      this.config.apiKey,
      'POST',
    )) as { address?: string; id?: string };
    if (!data.address) throw new Error('Provider did not return an address.');
    return { address: data.address, providerRef: data.id ?? data.address };
  }

  async listMessages(address: string): Promise<ProviderMessage[]> {
    const data = (await requestJson(
      this.url(fillPath(this.config.listPath, { address })),
      this.config.apiKey,
    )) as Array<Record<string, unknown>>;
    if (!Array.isArray(data)) return [];
    return data.map((m) => ({
      providerMessageId: String(m.id ?? m.providerMessageId ?? ''),
      fromAddress: String(m.from ?? m.fromAddress ?? ''),
      subject: String(m.subject ?? ''),
      receivedAt: Number(m.receivedAt ?? m.received_at ?? Date.now()),
      bodyText: String(m.bodyText ?? m.body_text ?? m.text ?? ''),
      bodyHtml: (m.bodyHtml ?? m.body_html ?? null) as string | null,
    }));
  }

  async getMessage(address: string, providerMessageId: string): Promise<ProviderMessage | null> {
    const data = (await requestJson(
      this.url(fillPath(this.config.getPath, { address, id: providerMessageId })),
      this.config.apiKey,
    )) as Record<string, unknown>;
    if (!data) return null;
    return {
      providerMessageId: String(data.id ?? data.providerMessageId ?? providerMessageId),
      fromAddress: String(data.from ?? data.fromAddress ?? ''),
      subject: String(data.subject ?? ''),
      receivedAt: Number(data.receivedAt ?? data.received_at ?? Date.now()),
      bodyText: String(data.bodyText ?? data.body_text ?? data.text ?? ''),
      bodyHtml: (data.bodyHtml ?? data.body_html ?? null) as string | null,
    };
  }

  async deleteAddress(providerRef: string): Promise<void> {
    await requestJson(
      this.url(fillPath(this.config.deletePath, { ref: providerRef })),
      this.config.apiKey,
      'DELETE',
    );
  }
}

/** The single place screens ask for a provider. Returns null when the
 *  owner has not configured one — callers must show the not-configured
 *  state instead of inventing data. */
export async function getProvider(db: DbLike): Promise<MailProvider | null> {
  const config = await getProviderConfig(db);
  if (!config) return null;
  return new ConfigurableRestProvider(config);
}

export function requireProvider(provider: MailProvider | null): MailProvider {
  if (!provider) throw new ProviderNotConfiguredError();
  return provider;
}
