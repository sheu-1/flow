import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../theme/ThemeProvider';

interface Props {
  visible: boolean;
  onClose: () => void;
  context?: string; // Context about where feedback was triggered
}

type FeedbackType = 'bug' | 'feature' | 'improvement' | 'other';

export const FeedbackSystem: React.FC<Props> = ({ visible, onClose, context }) => {
  const colors = useThemeColors();
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('improvement');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const feedbackTypes = [
    { key: 'bug' as const, label: 'Bug Report', icon: 'bug-outline', color: colors.danger },
    { key: 'feature' as const, label: 'Feature Request', icon: 'bulb-outline', color: colors.warning },
    { key: 'improvement' as const, label: 'Improvement', icon: 'trending-up-outline', color: colors.success },
    { key: 'other' as const, label: 'Other', icon: 'chatbubble-outline', color: colors.primary },
  ];

  const handleSubmit = async () => {
    if (!message.trim()) {
      Alert.alert('Missing Information', 'Please provide your feedback message.');
      return;
    }

    setSubmitting(true);
    
    try {
      // In a real app, you'd send this to your feedback service
      const feedbackData = {
        type: feedbackType,
        message: message.trim(),
        email: email.trim(),
        context,
        timestamp: new Date().toISOString(),
        userAgent: 'Cashflow Tracker Mobile App',
      };

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('Feedback submitted:', feedbackData);
      
      Alert.alert(
        'Thank You!', 
        'Your feedback has been submitted. We appreciate your input and will review it soon.',
        [{ text: 'OK', onPress: handleClose }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to submit feedback. Please try again later.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setMessage('');
    setEmail('');
    setFeedbackType('improvement');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>Send Feedback</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {/* Feedback Type Selection */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>What type of feedback?</Text>
          <View style={styles.typeContainer}>
            {feedbackTypes.map(type => (
              <TouchableOpacity
                key={type.key}
                style={[
                  styles.typeButton,
                  { 
                    backgroundColor: feedbackType === type.key ? type.color + '20' : colors.surface,
                    borderColor: feedbackType === type.key ? type.color : colors.border,
                  }
                ]}
                onPress={() => setFeedbackType(type.key)}
              >
                <Ionicons 
                  name={type.icon as any} 
                  size={20} 
                  color={feedbackType === type.key ? type.color : colors.textSecondary} 
                />
                <Text style={[
                  styles.typeText,
                  { color: feedbackType === type.key ? type.color : colors.text }
                ]}>
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Message Input */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Message</Text>
          <TextInput
            style={[
              styles.messageInput,
              { 
                backgroundColor: colors.surface,
                borderColor: colors.border,
                color: colors.text,
              }
            ]}
            placeholder="Tell us what's on your mind..."
            placeholderTextColor={colors.textMuted}
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            maxLength={1000}
          />
          <Text style={[styles.characterCount, { color: colors.textMuted }]}>
            {message.length}/1000 characters
          </Text>

          {/* Email Input (Optional) */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Email (Optional)
            <Text style={[styles.optional, { color: colors.textMuted }]}> - for follow-up</Text>
          </Text>
          <TextInput
            style={[
              styles.emailInput,
              { 
                backgroundColor: colors.surface,
                borderColor: colors.border,
                color: colors.text,
              }
            ]}
            placeholder="your.email@example.com"
            placeholderTextColor={colors.textMuted}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          {context && (
            <View style={[styles.contextContainer, { backgroundColor: colors.surface }]}>
              <Text style={[styles.contextLabel, { color: colors.textSecondary }]}>Context:</Text>
              <Text style={[styles.contextText, { color: colors.textMuted }]}>{context}</Text>
            </View>
          )}
        </View>

        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.cancelButton, { backgroundColor: colors.surface }]}
            onPress={handleClose}
          >
            <Text style={[styles.cancelText, { color: colors.text }]}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.submitButton,
              { 
                backgroundColor: colors.primary,
                opacity: submitting || !message.trim() ? 0.5 : 1,
              }
            ]}
            onPress={handleSubmit}
            disabled={submitting || !message.trim()}
          >
            {submitting ? (
              <Text style={[styles.submitText, { color: colors.background }]}>Sending...</Text>
            ) : (
              <>
                <Ionicons name="send" size={16} color={colors.background} />
                <Text style={[styles.submitText, { color: colors.background }]}>Send Feedback</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    marginTop: 20,
  },
  typeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: '45%',
  },
  typeText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  messageInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    minHeight: 120,
  },
  characterCount: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
  },
  emailInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
  },
  optional: {
    fontSize: 14,
    fontWeight: 'normal',
  },
  contextContainer: {
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
  },
  contextLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  contextText: {
    fontSize: 12,
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    flex: 2,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 8,
    gap: 8,
  },
  submitText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
