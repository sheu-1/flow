import AsyncStorage from '@react-native-async-storage/async-storage';

const OFFLINE_USER_KEY = 'offline_user';

export interface OfflineUser {
  id: string;
  email: string;
  name: string;
  isOffline: true;
}

export class OfflineAuthService {
  static async createOfflineUser(email: string, password: string, name?: string): Promise<OfflineUser> {
    const user: OfflineUser = {
      id: `offline_${Date.now()}`,
      email,
      name: name || email.split('@')[0],
      isOffline: true,
    };
    
    await AsyncStorage.setItem(OFFLINE_USER_KEY, JSON.stringify(user));
    return user;
  }

  static async getOfflineUser(): Promise<OfflineUser | null> {
    try {
      const userData = await AsyncStorage.getItem(OFFLINE_USER_KEY);
      return userData ? JSON.parse(userData) : null;
    } catch {
      return null;
    }
  }

  static async signOutOffline(): Promise<void> {
    await AsyncStorage.removeItem(OFFLINE_USER_KEY);
  }

  static async signInOffline(email: string, password: string): Promise<OfflineUser> {
    // For demo purposes, accept any email/password
    // In a real app, you'd validate against stored credentials
    const existingUser = await this.getOfflineUser();
    
    if (existingUser && existingUser.email === email) {
      return existingUser;
    }
    
    // Create new offline user
    return this.createOfflineUser(email, password);
  }
}
