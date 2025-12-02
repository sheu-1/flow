/**
 * VoiceInputModal Component
 * 
 * Modal for voice-based transaction creation
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { useThemeColors } from '../theme/ThemeProvider';
import { VoiceService, VoiceTransactionData } from '../services/VoiceService';
import { spacing, fontSize, borderRadius } from '../theme/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface VoiceInputModalProps {
  visible: boolean;
  onClose: () => void;
  onTransactionCreated: (data: VoiceTransactionData) => void;
}

export const VoiceInputModal: React.FC<VoiceInputModalProps> = ({
  visible,
  onClose,
  onTransactionCreated,
}) => {
  const colors = useThemeColors();
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');
  const [parsedData, setParsedData] = useState<VoiceTransactionData | null>(null);

  // Animation values
  const pulseScale = useSharedValue(1);
  const waveOpacity = useSharedValue(0);

  useEffect(() => {
    if (isRecording) {
      // Start pulse animation
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.2, { duration: 800, easing: Easing.inOut(Easing.quad) }),
          withTiming(1, { duration: 800, easing: Easing.inOut(Easing.quad) })
        ),
        -1,
        false
      );

      // Start wave animation
      waveOpacity.value = withRepeat(
        withSequence(
          withTiming(0.8, { duration: 600 }),
          withTiming(0.2, { duration: 600 })
        ),
        -1,
        false
      );
    } else {
      pulseScale.value = withTiming(1, { duration: 300 });
      waveOpacity.value = withTiming(0, { duration: 300 });
    }
  }, [isRecording]);

  const handleStartRecording = async () => {
    try {
      const success = await VoiceService.startRecording();
      if (success) {
        setIsRecording(true);
        setTranscribedText('');
        setParsedData(null);
        
        // Auto-stop after 10 seconds
        setTimeout(() => {
          if (isRecording) {
            handleStopRecording();
          }
        }, 10000);
      } else {
        Alert.alert('Permission Required', 'Please allow microphone access to use voice input.');
      }
    } catch (error) {
      console.error('Error starting recording:', error);
      Alert.alert('Error', 'Failed to start recording. Please try again.');
    }
  };

  const handleStopRecording = async () => {
    try {
      setIsRecording(false);
      setIsProcessing(true);

      const audioUri = await VoiceService.stopRecording();
      if (audioUri) {
        // In a real implementation, you would send the audio to a speech-to-text service
        // For now, we'll simulate the process
        await simulateSpeechToText();
      }
    } catch (error) {
      console.error('Error stopping recording:', error);
      Alert.alert('Error', 'Failed to process recording. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const simulateSpeechToText = async (): Promise<void> => {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Mock transcribed text for demonstration
    const mockTexts = [
      "Spent 12 on lunch at Joe's Diner",
      "Paid 45 for gas at Shell station",
      "Bought coffee for 4.50",
      "Received 500 salary payment",
      "Purchased groceries for 85 at SuperMart",
      "Paid 25 for movie tickets",
    ];

    const randomText = mockTexts[Math.floor(Math.random() * mockTexts.length)];
    setTranscribedText(randomText);

    // Parse the text
    const parsed = VoiceService.parseVoiceText(randomText);
    setParsedData(parsed);

    if (parsed) {
      await VoiceService.speakFeedback(
        `I heard: ${parsed.description} for $${parsed.amount}. Is this correct?`
      );
    }
  };

  const handleConfirmTransaction = () => {
    if (parsedData) {
      onTransactionCreated(parsedData);
      handleClose();
    }
  };

  const handleClose = () => {
    setIsRecording(false);
    setIsProcessing(false);
    setTranscribedText('');
    setParsedData(null);
    onClose();
  };

  const microphoneAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const waveAnimatedStyle = useAnimatedStyle(() => ({
    opacity: waveOpacity.value,
  }));

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>Voice Input</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Microphone Button */}
          <View style={styles.microphoneContainer}>
            {/* Wave animations */}
            {isRecording && (
              <>
                <Animated.View
                  style={[
                    styles.wave,
                    styles.wave1,
                    { borderColor: colors.primary },
                    waveAnimatedStyle,
                  ]}
                />
                <Animated.View
                  style={[
                    styles.wave,
                    styles.wave2,
                    { borderColor: colors.primary },
                    waveAnimatedStyle,
                  ]}
                />
                <Animated.View
                  style={[
                    styles.wave,
                    styles.wave3,
                    { borderColor: colors.primary },
                    waveAnimatedStyle,
                  ]}
                />
              </>
            )}

            <Animated.View style={microphoneAnimatedStyle}>
              <TouchableOpacity
                style={[
                  styles.microphoneButton,
                  {
                    backgroundColor: isRecording ? colors.danger : colors.primary,
                  },
                ]}
                onPress={isRecording ? handleStopRecording : handleStartRecording}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <ActivityIndicator color="#fff" size="large" />
                ) : (
                  <Ionicons
                    name={isRecording ? 'stop' : 'mic'}
                    size={40}
                    color="#fff"
                  />
                )}
              </TouchableOpacity>
            </Animated.View>
          </View>

          {/* Status Text */}
          <Text style={[styles.statusText, { color: colors.textSecondary }]}>
            {isProcessing
              ? 'Processing your voice...'
              : isRecording
              ? 'Listening... Tap to stop'
              : 'Tap to start recording'}
          </Text>

          {/* Transcribed Text */}
          {transcribedText && (
            <View style={[styles.transcriptionContainer, { backgroundColor: colors.surface }]}>
              <Text style={[styles.transcriptionLabel, { color: colors.textSecondary }]}>
                I heard:
              </Text>
              <Text style={[styles.transcriptionText, { color: colors.text }]}>
                "{transcribedText}"
              </Text>
            </View>
          )}

          {/* Parsed Data */}
          {parsedData && (
            <View style={[styles.parsedDataContainer, { backgroundColor: colors.surface }]}>
              <Text style={[styles.parsedDataLabel, { color: colors.textSecondary }]}>
                Transaction Details:
              </Text>
              <View style={styles.parsedDataRow}>
                <Text style={[styles.parsedDataKey, { color: colors.textSecondary }]}>
                  Amount:
                </Text>
                <Text style={[styles.parsedDataValue, { color: colors.text }]}>
                  ${parsedData.amount.toFixed(2)}
                </Text>
              </View>
              <View style={styles.parsedDataRow}>
                <Text style={[styles.parsedDataKey, { color: colors.textSecondary }]}>
                  Type:
                </Text>
                <Text style={[styles.parsedDataValue, { color: colors.text }]}>
                  {parsedData.type === 'income' ? 'Money In' : 'Money Out'}
                </Text>
              </View>
              <View style={styles.parsedDataRow}>
                <Text style={[styles.parsedDataKey, { color: colors.textSecondary }]}>
                  Description:
                </Text>
                <Text style={[styles.parsedDataValue, { color: colors.text }]}>
                  {parsedData.description}
                </Text>
              </View>
              {parsedData.category && (
                <View style={styles.parsedDataRow}>
                  <Text style={[styles.parsedDataKey, { color: colors.textSecondary }]}>
                    Category:
                  </Text>
                  <Text style={[styles.parsedDataValue, { color: colors.text }]}>
                    {parsedData.category}
                  </Text>
                </View>
              )}
              <View style={styles.parsedDataRow}>
                <Text style={[styles.parsedDataKey, { color: colors.textSecondary }]}>
                  Confidence:
                </Text>
                <Text style={[styles.parsedDataValue, { color: colors.text }]}>
                  {Math.round(parsedData.confidence * 100)}%
                </Text>
              </View>
            </View>
          )}

          {/* Example Commands */}
          {!transcribedText && !isRecording && !isProcessing && (
            <View style={styles.examplesContainer}>
              <Text style={[styles.examplesTitle, { color: colors.text }]}>
                Try saying:
              </Text>
              {VoiceService.getExampleCommands().slice(0, 4).map((example, index) => (
                <Text key={index} style={[styles.exampleText, { color: colors.textSecondary }]}>
                  • "{example}"
                </Text>
              ))}
            </View>
          )}
        </View>

        {/* Action Buttons */}
        {parsedData && (
          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton, { backgroundColor: colors.surface }]}
              onPress={handleClose}
            >
              <Text style={[styles.actionButtonText, { color: colors.text }]}>
                Try Again
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.confirmButton, { backgroundColor: colors.primary }]}
              onPress={handleConfirmTransaction}
            >
              <Text style={[styles.actionButtonText, { color: colors.background }]}>
                Create Transaction
              </Text>
            </TouchableOpacity>
          </View>
        )}
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: spacing.xs,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl * 2,
  },
  microphoneContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
    position: 'relative',
  },
  wave: {
    position: 'absolute',
    borderWidth: 2,
    borderRadius: 100,
  },
  wave1: {
    width: 120,
    height: 120,
  },
  wave2: {
    width: 160,
    height: 160,
  },
  wave3: {
    width: 200,
    height: 200,
  },
  microphoneButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  statusText: {
    fontSize: fontSize.md,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  transcriptionContainer: {
    width: '100%',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  transcriptionLabel: {
    fontSize: fontSize.sm,
    marginBottom: spacing.xs,
  },
  transcriptionText: {
    fontSize: fontSize.md,
    fontStyle: 'italic',
  },
  parsedDataContainer: {
    width: '100%',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  parsedDataLabel: {
    fontSize: fontSize.sm,
    marginBottom: spacing.sm,
    fontWeight: '600',
  },
  parsedDataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  parsedDataKey: {
    fontSize: fontSize.sm,
    flex: 1,
  },
  parsedDataValue: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    flex: 2,
    textAlign: 'right',
  },
  examplesContainer: {
    width: '100%',
    marginTop: spacing.lg,
  },
  examplesTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  exampleText: {
    fontSize: fontSize.sm,
    marginBottom: spacing.xs,
    paddingLeft: spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    gap: spacing.md,
  },
  actionButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  cancelButton: {
    marginRight: spacing.xs,
  },
  confirmButton: {
    marginLeft: spacing.xs,
  },
  actionButtonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
});
