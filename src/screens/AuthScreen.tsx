import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../theme/ThemeProvider';

const AuthScreen: React.FC = () => {
  const { signIn, signUp, signInWithGoogle, loading } = useAuth();
  const { colors } = useTheme();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);

  useEffect(() => {
    let timer: number | undefined;
    if (signupSuccess) {
      // Auto-redirect to login after a short delay
      timer = setTimeout(() => {
        setSignupSuccess(false);
        setMode('login');
      }, 2000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [signupSuccess]);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string): string | null => {
    if (password.length < 6) {
      return 'Password must be at least 6 characters long';
    }
    return null;
  };

  const onSubmit = async () => {
    setError(null);
    setEmailError(null);
    setPasswordError(null);
    
    // Client-side validation
    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }
    
    const passwordValidation = validatePassword(password);
    if (passwordValidation) {
      setPasswordError(passwordValidation);
      return;
    }
    
    try {
      if (mode === 'login') {
        await signIn(email.trim(), password);
      } else {
        await signUp(email.trim(), password);
        // Show success screen and clear fields
        setSignupSuccess(true);
        setEmail('');
        setPassword('');
        setShowPassword(false);
      }
    } catch (e: any) {
      const message = e?.message || 'Something went wrong. Please try again.';
      
      // Show field-specific errors for common auth issues
      if (message.includes('Incorrect email or password') || 
          message.includes('Invalid login credentials') ||
          message.includes('Email not confirmed')) {
        setError('Incorrect email or password');
      } 
      // Handle email-related errors
      else if (message.includes('A user with this email already exists') || 
               message.includes('already registered') || 
               message.includes('already in use') ||
               message.includes('User already registered')) {
        setEmailError('A user with this email already exists');
      }
      // Handle password-related errors
      else if (message.includes('Password must be at least') || 
               message.includes('Password should be at least') || 
               message.includes('Password is too weak') ||
               message.includes('Password')) {
        setPasswordError('Password must be at least 6 characters long');
      }
      // Handle email format errors
      else if (message.includes('Invalid email') || 
               message.includes('not a valid email') ||
               message.includes('email') || 
               message.includes('Email')) {
        setEmailError('Please enter a valid email address');
      }
      // Handle disabled signups
      else if (message.includes('signups are disabled') || 
               message.includes('Email signups are disabled')) {
        setError('Account creation is currently disabled. Please contact support.');
      }
      // Fallback for any other errors
      else {
        setError('Unable to complete request. Please check your details and try again.');
      }
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setEmailError(null);
    setPasswordError(null);
    
    try {
      await signInWithGoogle();
    } catch (e: any) {
      setError('Google sign in failed. Please try again.');
    }
  };

  const isValid = email.includes('@') && password.length >= 6;

  if (signupSuccess) {
    return (
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.successWrap, { padding: 24 }]}> 
          <Ionicons name="checkmark-circle" size={64} color={colors.primary} style={{ marginBottom: 16 }} />
          <Text style={[styles.successTitle, { color: colors.text }]}>Account created!</Text>
          <Text style={[styles.successSubtitle, { color: colors.textSecondary }]}>You can now proceed to login.</Text>

          <TouchableOpacity
            onPress={() => { setSignupSuccess(false); setMode('login'); }}
            style={[styles.button, { backgroundColor: colors.primary, marginTop: 24 }]}
          >
            <Text style={styles.buttonText}>Go to Login</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>{mode === 'login' ? 'Welcome back' : 'Create account'}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {mode === 'login' ? 'Sign in to continue' : 'Sign up to get started'}
          </Text>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="you@example.com"
              placeholderTextColor={colors.textMuted}
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]}
            />
            {emailError ? (
              <Text style={[styles.fieldError, { color: colors.danger }]}>{emailError}</Text>
            ) : null}
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Password</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="••••••••"
                placeholderTextColor={colors.textMuted}
                style={[
                  styles.input,
                  { color: colors.text, borderColor: colors.border, backgroundColor: colors.card, paddingRight: 44 },
                ]}
              />
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                onPress={() => setShowPassword((v) => !v)}
                style={styles.eyeButton}
              >
                <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            {passwordError ? (
              <Text style={[styles.fieldError, { color: colors.danger }]}>{passwordError}</Text>
            ) : null}
          </View>

          {/* Error message display */}
          {error ? (
            <View style={[
              styles.errorContainer, 
              { 
                backgroundColor: colors.danger + '20',
                borderLeftWidth: 4,
                borderLeftColor: colors.danger,
                marginBottom: 16,
                padding: 12,
                borderRadius: 4
              }
            ]}>
              <Ionicons 
                name="alert-circle" 
                size={18} 
                color={colors.danger} 
                style={{ marginRight: 8 }}
              />
              <Text style={[styles.errorText, { color: colors.danger, flex: 1 }]}>
                {error}
              </Text>
            </View>
          ) : null}

          <TouchableOpacity
            disabled={!isValid || loading}
            onPress={onSubmit}
            style={[
              styles.button,
              { backgroundColor: (!isValid || loading) ? colors.inactive : colors.primary },
            ]}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>{mode === 'login' ? 'Sign In' : 'Create Account'}</Text>
            )}
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerText, { color: colors.textSecondary }]}>or</Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </View>

          <TouchableOpacity
            disabled={loading}
            onPress={handleGoogleSignIn}
            style={[styles.googleButton, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <View style={styles.googleButtonContent}>
              <Text style={styles.googleIcon}>G</Text>
              <Text style={[styles.googleButtonText, { color: colors.text }]}>
                Continue with Google
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setMode(mode === 'login' ? 'signup' : 'login')}>
            <Text style={[styles.switchText, { color: colors.primary }]}>
              {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.helper, { color: colors.textMuted }]}>
          By continuing, you agree to our Terms and acknowledge our Privacy Policy.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 480,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 6,
    marginBottom: 16,
  },
  field: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    marginBottom: 6,
  },
  input: {
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  inputWrapper: {
    position: 'relative',
  },
  eyeButton: {
    position: 'absolute',
    right: 10,
    top: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  errorText: {
    fontSize: 14,
    marginLeft: 4,
  },
  fieldError: {
    fontSize: 12,
    marginTop: 4,
  },
  button: {
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  switchText: {
    textAlign: 'center',
    marginTop: 14,
    fontWeight: '600',
  },
  helper: {
    textAlign: 'center',
    marginTop: 16,
    fontSize: 12,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
  },
  googleButton: {
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  googleButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  googleIcon: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4285F4',
    marginRight: 12,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  successWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 6,
  },
  successSubtitle: {
    fontSize: 14,
  },
});

export default AuthScreen;
