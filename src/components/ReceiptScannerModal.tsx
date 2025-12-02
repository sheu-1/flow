/**
 * ReceiptScannerModal Component
 * 
 * Modal for scanning receipts and extracting transaction data
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useThemeColors } from '../theme/ThemeProvider';
import { ReceiptScanService, ReceiptData } from '../services/ReceiptScanService';
import { spacing, fontSize, borderRadius } from '../theme/colors';

interface ReceiptScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onReceiptScanned: (data: ReceiptData) => void;
}

export const ReceiptScannerModal: React.FC<ReceiptScannerModalProps> = ({
  visible,
  onClose,
  onReceiptScanned,
}) => {
  const colors = useThemeColors();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState<ReceiptData | null>(null);

  const handleTakePhoto = async () => {
    try {
      const uri = await ReceiptScanService.takeReceiptPhoto();
      if (uri) {
        setImageUri(uri);
        processReceipt(uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const handlePickImage = async () => {
    try {
      const uri = await ReceiptScanService.pickReceiptImage();
      if (uri) {
        setImageUri(uri);
        processReceipt(uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const processReceipt = async (uri: string) => {
    setIsProcessing(true);
    try {
      const data = await ReceiptScanService.extractReceiptData(uri);
      if (data) {
        setExtractedData(data);
      } else {
        Alert.alert(
          'No Data Found',
          'Could not extract transaction data from this receipt. Please try a clearer image.'
        );
      }
    } catch (error) {
      console.error('Error processing receipt:', error);
      Alert.alert('Error', 'Failed to process receipt. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmTransaction = () => {
    if (extractedData) {
      onReceiptScanned(extractedData);
      handleClose();
    }
  };

  const handleClose = () => {
    setImageUri(null);
    setExtractedData(null);
    setIsProcessing(false);
    onClose();
  };

  const handleRetry = () => {
    setImageUri(null);
    setExtractedData(null);
    setIsProcessing(false);
  };

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
          <Text style={[styles.title, { color: colors.text }]}>Scan Receipt</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {!imageUri ? (
            /* Camera Options */
            <View style={styles.cameraOptions}>
              <Animated.View entering={FadeInUp.delay(100).springify()}>
                <View style={[styles.instructionContainer, { backgroundColor: colors.surface }]}>
                  <Ionicons name="receipt-outline" size={48} color={colors.primary} />
                  <Text style={[styles.instructionTitle, { color: colors.text }]}>
                    Scan Your Receipt
                  </Text>
                  <Text style={[styles.instructionText, { color: colors.textSecondary }]}>
                    Take a clear photo of your receipt or select one from your gallery.
                    We'll automatically extract the amount and merchant information.
                  </Text>
                </View>
              </Animated.View>

              <Animated.View entering={FadeInUp.delay(200).springify()}>
                <TouchableOpacity
                  style={[styles.cameraButton, { backgroundColor: colors.primary }]}
                  onPress={handleTakePhoto}
                >
                  <Ionicons name="camera" size={32} color="#fff" />
                  <Text style={[styles.cameraButtonText, { color: '#fff' }]}>
                    Take Photo
                  </Text>
                </TouchableOpacity>
              </Animated.View>

              <Animated.View entering={FadeInUp.delay(300).springify()}>
                <TouchableOpacity
                  style={[styles.galleryButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={handlePickImage}
                >
                  <Ionicons name="images" size={32} color={colors.primary} />
                  <Text style={[styles.galleryButtonText, { color: colors.primary }]}>
                    Choose from Gallery
                  </Text>
                </TouchableOpacity>
              </Animated.View>

              {/* Tips */}
              <Animated.View entering={FadeInUp.delay(400).springify()}>
                <View style={styles.tipsContainer}>
                  <Text style={[styles.tipsTitle, { color: colors.text }]}>
                    📸 Tips for better results:
                  </Text>
                  <Text style={[styles.tipText, { color: colors.textSecondary }]}>
                    • Ensure good lighting
                  </Text>
                  <Text style={[styles.tipText, { color: colors.textSecondary }]}>
                    • Keep the receipt flat and straight
                  </Text>
                  <Text style={[styles.tipText, { color: colors.textSecondary }]}>
                    • Make sure all text is visible
                  </Text>
                  <Text style={[styles.tipText, { color: colors.textSecondary }]}>
                    • Avoid shadows and glare
                  </Text>
                </View>
              </Animated.View>
            </View>
          ) : (
            /* Image Preview and Results */
            <View style={styles.previewContainer}>
              {/* Image Preview */}
              <Animated.View entering={FadeInUp.springify()}>
                <View style={[styles.imageContainer, { backgroundColor: colors.surface }]}>
                  <Image source={{ uri: imageUri }} style={styles.receiptImage} />
                  {isProcessing && (
                    <View style={styles.processingOverlay}>
                      <ActivityIndicator size="large" color={colors.primary} />
                      <Text style={[styles.processingText, { color: colors.text }]}>
                        Processing receipt...
                      </Text>
                    </View>
                  )}
                </View>
              </Animated.View>

              {/* Extracted Data */}
              {extractedData && (
                <Animated.View entering={FadeInUp.delay(200).springify()}>
                  <View style={[styles.extractedDataContainer, { backgroundColor: colors.surface }]}>
                    <View style={styles.dataHeader}>
                      <Ionicons name="checkmark-circle" size={24} color={colors.success} />
                      <Text style={[styles.dataHeaderText, { color: colors.text }]}>
                        Receipt Processed
                      </Text>
                    </View>

                    <View style={styles.dataRow}>
                      <Text style={[styles.dataLabel, { color: colors.textSecondary }]}>
                        Merchant:
                      </Text>
                      <Text style={[styles.dataValue, { color: colors.text }]}>
                        {extractedData.merchant}
                      </Text>
                    </View>

                    <View style={styles.dataRow}>
                      <Text style={[styles.dataLabel, { color: colors.textSecondary }]}>
                        Amount:
                      </Text>
                      <Text style={[styles.dataValue, styles.amountValue, { color: colors.success }]}>
                        ${extractedData.amount.toFixed(2)}
                      </Text>
                    </View>

                    {extractedData.date && (
                      <View style={styles.dataRow}>
                        <Text style={[styles.dataLabel, { color: colors.textSecondary }]}>
                          Date:
                        </Text>
                        <Text style={[styles.dataValue, { color: colors.text }]}>
                          {extractedData.date.toLocaleDateString()}
                        </Text>
                      </View>
                    )}

                    <View style={styles.dataRow}>
                      <Text style={[styles.dataLabel, { color: colors.textSecondary }]}>
                        Confidence:
                      </Text>
                      <Text style={[styles.dataValue, { color: colors.text }]}>
                        {Math.round(extractedData.confidence * 100)}%
                      </Text>
                    </View>

                    {extractedData.items && extractedData.items.length > 0 && (
                      <View style={styles.itemsContainer}>
                        <Text style={[styles.itemsTitle, { color: colors.textSecondary }]}>
                          Items:
                        </Text>
                        {extractedData.items.slice(0, 5).map((item, index) => (
                          <Text key={index} style={[styles.itemText, { color: colors.text }]}>
                            • {item}
                          </Text>
                        ))}
                        {extractedData.items.length > 5 && (
                          <Text style={[styles.moreItemsText, { color: colors.textSecondary }]}>
                            +{extractedData.items.length - 5} more items
                          </Text>
                        )}
                      </View>
                    )}
                  </View>
                </Animated.View>
              )}

              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={handleRetry}
                >
                  <Ionicons name="camera" size={20} color={colors.text} />
                  <Text style={[styles.actionButtonText, { color: colors.text }]}>
                    Try Again
                  </Text>
                </TouchableOpacity>

                {extractedData && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.confirmButton, { backgroundColor: colors.primary }]}
                    onPress={handleConfirmTransaction}
                  >
                    <Ionicons name="checkmark" size={20} color="#fff" />
                    <Text style={[styles.actionButtonText, { color: '#fff' }]}>
                      Create Transaction
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        </ScrollView>
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
  },
  cameraOptions: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  instructionContainer: {
    alignItems: 'center',
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.xl,
  },
  instructionTitle: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  instructionText: {
    fontSize: fontSize.md,
    textAlign: 'center',
    lineHeight: 22,
  },
  cameraButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    minWidth: 200,
    justifyContent: 'center',
  },
  cameraButtonText: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    marginLeft: spacing.sm,
  },
  galleryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    marginBottom: spacing.xl,
    minWidth: 200,
    justifyContent: 'center',
  },
  galleryButtonText: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    marginLeft: spacing.sm,
  },
  tipsContainer: {
    alignSelf: 'stretch',
    padding: spacing.lg,
  },
  tipsTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  tipText: {
    fontSize: fontSize.sm,
    marginBottom: spacing.xs,
    paddingLeft: spacing.sm,
  },
  previewContainer: {
    padding: spacing.lg,
  },
  imageContainer: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginBottom: spacing.lg,
    position: 'relative',
  },
  receiptImage: {
    width: '100%',
    height: 300,
    resizeMode: 'contain',
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  processingText: {
    marginTop: spacing.sm,
    fontSize: fontSize.md,
  },
  extractedDataContainer: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
  },
  dataHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  dataHeaderText: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    marginLeft: spacing.sm,
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  dataLabel: {
    fontSize: fontSize.md,
    flex: 1,
  },
  dataValue: {
    fontSize: fontSize.md,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  amountValue: {
    fontSize: fontSize.lg,
  },
  itemsContainer: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  itemsTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  itemText: {
    fontSize: fontSize.sm,
    marginBottom: spacing.xs,
    paddingLeft: spacing.sm,
  },
  moreItemsText: {
    fontSize: fontSize.sm,
    fontStyle: 'italic',
    paddingLeft: spacing.sm,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  confirmButton: {
    borderWidth: 0,
  },
  actionButtonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    marginLeft: spacing.xs,
  },
});
