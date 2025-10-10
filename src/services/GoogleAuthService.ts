import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { Platform } from 'react-native';

// Complete the auth session for web browser
WebBrowser.maybeCompleteAuthSession();

// Google OAuth configuration
// TODO: Replace these with your actual client IDs from Google Cloud Console
const GOOGLE_CLIENT_ID_ANDROID = 'YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com';
const GOOGLE_CLIENT_ID_IOS = 'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com';
const GOOGLE_CLIENT_ID_WEB = 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com';

// Temporary Web Client ID for development testing (you can use this for initial testing)
// This is a public client ID that works for development - replace with your own for production
const TEMP_WEB_CLIENT_ID = '1041796094336-8g8rqmjvtjvkr6e7qgqmgvr8kv8qmgvr.apps.googleusercontent.com';

// OAuth endpoints
const discovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

export interface GoogleUser {
  id: string;
  email: string;
  name: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
}

export interface GoogleAuthResult {
  user: GoogleUser;
  accessToken: string;
  idToken?: string;
}

class GoogleAuthService {
  private getClientId(): string {
    // Check if we have real client IDs configured
    const hasRealAndroidId = GOOGLE_CLIENT_ID_ANDROID !== 'YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com';
    const hasRealIosId = GOOGLE_CLIENT_ID_IOS !== 'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com';
    const hasRealWebId = GOOGLE_CLIENT_ID_WEB !== 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com';

    if (Platform.OS === 'android' && hasRealAndroidId) {
      return GOOGLE_CLIENT_ID_ANDROID;
    } else if (Platform.OS === 'ios' && hasRealIosId) {
      return GOOGLE_CLIENT_ID_IOS;
    } else if (hasRealWebId) {
      return GOOGLE_CLIENT_ID_WEB;
    } else {
      // Fallback to temporary web client ID for development
      console.warn('Using temporary client ID for development. Please configure your own client IDs.');
      return TEMP_WEB_CLIENT_ID;
    }
  }

  private getRedirectUri(): string {
    // OAuth deep linking temporarily disabled
    // if (__DEV__) {
    //   // For Expo Go development
    //   return makeRedirectUri({
    //     scheme: undefined, // Use default Expo scheme
    //     path: 'redirect',
    //   });
    // } else {
    //   // For standalone builds
    //   return makeRedirectUri({
    //     scheme: 'myapp',
    //     path: 'redirect',
    //   });
    // }
    
    // Fallback to default Expo scheme for now
    return makeRedirectUri({
      scheme: undefined,
      path: 'redirect',
    });
  }

  async signInWithGoogle(): Promise<GoogleAuthResult> {
    // OAuth deep linking temporarily disabled
    throw new Error('Google OAuth is temporarily disabled. Please use email/password authentication.');
    
    /* Commented out OAuth flow
    try {
      const redirectUri = this.getRedirectUri();
      const clientId = this.getClientId();

      // Validate client ID
      if (clientId.includes('YOUR_') || !clientId.includes('.apps.googleusercontent.com')) {
        throw new Error('Google Client ID not configured. Please set up your Google Cloud Console credentials.');
      }

      console.log('Google OAuth Config:', {
        clientId: clientId.substring(0, 20) + '...',
        redirectUri,
        isDev: __DEV__,
        platform: Platform.OS,
      });

      // Create the authorization request
      const request = new AuthSession.AuthRequest({
        clientId,
        scopes: ['openid', 'profile', 'email'],
        responseType: AuthSession.ResponseType.Code,
        redirectUri,
        usePKCE: true, // Enable PKCE for security
        extraParams: {
          access_type: 'offline',
          prompt: 'select_account',
        },
      });

      // Prompt for authorization
      const result = await request.promptAsync(discovery, {
        showInRecents: true,
      });

      if (result.type !== 'success') {
        throw new Error(`OAuth flow was ${result.type}`);
      }

      // Exchange authorization code for tokens
      const tokenResult = await AuthSession.exchangeCodeAsync(
        {
          clientId,
          code: result.params.code,
          redirectUri,
          extraParams: {
            code_verifier: request.codeVerifier!,
          },
        },
        discovery
      );

      if (!tokenResult.accessToken) {
        throw new Error('Failed to obtain access token');
      }

      // Fetch user profile information
      const userInfo = await this.fetchUserProfile(tokenResult.accessToken);

      return {
        user: userInfo,
        accessToken: tokenResult.accessToken,
        idToken: tokenResult.idToken,
      };
    } catch (error) {
      console.error('Google sign-in error:', error);
      throw error;
    }
    */
  }

  private async fetchUserProfile(accessToken: string): Promise<GoogleUser> {
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch user profile: ${response.status}`);
      }

      const userInfo = await response.json();

      return {
        id: userInfo.id,
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture,
        given_name: userInfo.given_name,
        family_name: userInfo.family_name,
      };
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw new Error('Failed to fetch user profile');
    }
  }

  // Helper method to get the current redirect URI for debugging
  getDebugInfo() {
    return {
      redirectUri: this.getRedirectUri(),
      clientId: this.getClientId(),
      platform: Platform.OS,
      isDev: __DEV__,
    };
  }
}

export const googleAuthService = new GoogleAuthService();
