// Provider tests — the adapter returns null until configured, and the
// generic REST provider only calls the owner's configured URLs.
import { createTestDb } from './dbAdapter';
import { migrate } from '../src/db/migrate';
import { getProviderConfig, getProvider, ConfigurableRestProvider } from '../src/providers/configuredProvider';
import { setSetting, SETTING_KEYS } from '../src/db/repositories/settingsRepository';
import type { DbLike } from '../src/db/types';

let db: DbLike;
let close: () => void;

beforeEach(async () => {
  ({ db, close } = createTestDb());
  await migrate(db);
});

afterEach(() => close());

describe('provider configuration', () => {
  it('returns null when nothing is configured (the honest default)', async () => {
    expect(await getProviderConfig(db)).toBeNull();
    expect(await getProvider(db)).toBeNull();
  });

  it('returns null when only the base URL is set (paths missing)', async () => {
    await setSetting(db, SETTING_KEYS.providerBaseUrl, 'https://mail.example.com');
    expect(await getProviderConfig(db)).toBeNull();
  });

  it('returns a provider when base URL and all four paths are set', async () => {
    await setSetting(db, SETTING_KEYS.providerBaseUrl, 'https://mail.example.com');
    await setSetting(db, SETTING_KEYS.providerCreatePath, '/addresses');
    await setSetting(db, SETTING_KEYS.providerListPath, '/addresses/{address}/messages');
    await setSetting(db, SETTING_KEYS.providerGetPath, '/addresses/{address}/messages/{id}');
    await setSetting(db, SETTING_KEYS.providerDeletePath, '/addresses/{ref}');
    const provider = await getProvider(db);
    expect(provider).not.toBeNull();
  });
});

describe('ConfigurableRestProvider', () => {
  const config = {
    baseUrl: 'https://mail.example.com',
    apiKey: 'key-123',
    createPath: '/addresses',
    listPath: '/addresses/{address}/messages',
    getPath: '/addresses/{address}/messages/{id}',
    deletePath: '/addresses/{ref}',
  };

  it('calls the configured create URL and returns the address', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ address: 'tmp1@mail.example.com', id: 'ref-9' }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    const provider = new ConfigurableRestProvider(config);
    const created = await provider.createAddress();
    expect(created.address).toBe('tmp1@mail.example.com');
    expect(created.providerRef).toBe('ref-9');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://mail.example.com/addresses',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('maps list results to ProviderMessage and fills in the address', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        { id: 'm1', from: 'a@b.test', subject: 'Hi', receivedAt: 123, bodyText: 'hello' },
      ],
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    const provider = new ConfigurableRestProvider(config);
    const messages = await provider.listMessages('tmp1@mail.example.com');
    expect(messages).toHaveLength(1);
    expect(messages[0].providerMessageId).toBe('m1');
    expect(fetchMock.mock.calls[0][0]).toContain('tmp1%40mail.example.com');
  });

  it('throws a clear error when the provider answers with a failure', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 401 }) as unknown as typeof fetch;
    const provider = new ConfigurableRestProvider(config);
    await expect(provider.createAddress()).rejects.toThrow('401');
  });
});
