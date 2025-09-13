import * as SecureStore from 'expo-secure-store';

const KEY_OPENROUTER = 'openrouter_api_key';

export async function saveApiKey(value: string) {
  try {
    await SecureStore.setItemAsync(KEY_OPENROUTER, value, {
      keychainService: 'cashflow-openrouter',
    });
    return true;
  } catch (e) {
    console.warn('Failed to save API key', e);
    return false;
  }
}

export async function getApiKey(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(KEY_OPENROUTER, {
      keychainService: 'cashflow-openrouter',
    });
  } catch (e) {
    console.warn('Failed to read API key', e);
    return null;
  }
}

export async function deleteApiKey() {
  try {
    await SecureStore.deleteItemAsync(KEY_OPENROUTER, {
      keychainService: 'cashflow-openrouter',
    });
  } catch (e) {
    console.warn('Failed to delete API key', e);
  }
}
