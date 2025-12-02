/**
 * VoiceService
 * 
 * Handles voice recognition and natural language processing for transaction creation
 */

import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';

export interface VoiceTransactionData {
  amount: number;
  description: string;
  category?: string;
  type: 'income' | 'expense';
  confidence: number;
}

export class VoiceService {
  private static recording: Audio.Recording | null = null;

  /**
   * Request microphone permissions
   */
  static async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error requesting audio permissions:', error);
      return false;
    }
  }

  /**
   * Start voice recording
   */
  static async startRecording(): Promise<boolean> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        return false;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      this.recording = new Audio.Recording();
      const recordingOptions = {
        android: {
          extension: '.m4a',
          outputFormat: 2,
          audioEncoder: 3,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          outputFormat: 'MPEG4AAC',
          audioQuality: 'MAX',
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: 128000,
        },
      };
      await this.recording.prepareToRecordAsync(recordingOptions);
      await this.recording.startAsync();
      
      return true;
    } catch (error) {
      console.error('Error starting recording:', error);
      return false;
    }
  }

  /**
   * Stop recording and get audio URI
   */
  static async stopRecording(): Promise<string | null> {
    try {
      if (!this.recording) return null;

      await this.recording.stopAndUnloadAsync();
      const uri = this.recording.getURI();
      this.recording = null;

      return uri;
    } catch (error) {
      console.error('Error stopping recording:', error);
      return null;
    }
  }

  /**
   * Parse voice text into transaction data using natural language processing
   */
  static parseVoiceText(text: string): VoiceTransactionData | null {
    try {
      const normalizedText = text.toLowerCase().trim();
      
      // Extract amount using regex patterns
      const amountPatterns = [
        /(?:spent|paid|cost|costs|bought|purchase|purchased)\s*(?:about\s*)?\s*(\d+(?:\.\d{2})?)/i,
        /(\d+(?:\.\d{2})?)\s*(?:on|for|at)/i,
        /(\d+(?:\.\d{2})?)/i,
      ];

      let amount = 0;
      let confidence = 0.5;

      for (const pattern of amountPatterns) {
        const match = normalizedText.match(pattern);
        if (match) {
          amount = parseFloat(match[1]);
          confidence = 0.8;
          break;
        }
      }

      if (amount === 0) {
        // Try to extract any number as potential amount
        const numberMatch = normalizedText.match(/(\d+(?:\.\d{2})?)/);
        if (numberMatch) {
          amount = parseFloat(numberMatch[1]);
          confidence = 0.6;
        }
      }

      // Determine transaction type
      let type: 'income' | 'expense' = 'expense';
      const incomeKeywords = ['received', 'earned', 'got paid', 'salary', 'income', 'bonus', 'refund'];
      const expenseKeywords = ['spent', 'paid', 'bought', 'purchase', 'cost'];

      if (incomeKeywords.some(keyword => normalizedText.includes(keyword))) {
        type = 'income';
        confidence += 0.1;
      } else if (expenseKeywords.some(keyword => normalizedText.includes(keyword))) {
        type = 'expense';
        confidence += 0.1;
      }

      // Extract description (remove amount and common words)
      let description = text;
      description = description.replace(/(?:spent|paid|cost|costs|bought|purchase|purchased|received|earned)\s*/gi, '');
      description = description.replace(/\d+(?:\.\d{2})?/gi, '');
      description = description.replace(/(?:on|for|at)\s*/gi, '');
      description = description.trim();

      // Auto-categorize based on keywords
      const category = this.categorizeFromText(normalizedText);

      if (amount > 0 && description) {
        return {
          amount,
          description,
          category,
          type,
          confidence: Math.min(confidence, 1.0)
        };
      }

      return null;
    } catch (error) {
      console.error('Error parsing voice text:', error);
      return null;
    }
  }

  /**
   * Auto-categorize transaction based on text content
   */
  private static categorizeFromText(text: string): string {
    const categories = {
      'Food & Dining': ['lunch', 'dinner', 'breakfast', 'coffee', 'restaurant', 'food', 'pizza', 'burger', 'snack', 'meal'],
      'Transportation': ['gas', 'fuel', 'uber', 'taxi', 'bus', 'train', 'parking', 'car', 'transport'],
      'Shopping': ['store', 'mall', 'amazon', 'shopping', 'clothes', 'shirt', 'shoes', 'purchase'],
      'Entertainment': ['movie', 'cinema', 'game', 'concert', 'show', 'entertainment', 'netflix', 'spotify'],
      'Health & Fitness': ['gym', 'doctor', 'medicine', 'pharmacy', 'hospital', 'health', 'fitness'],
      'Bills & Utilities': ['bill', 'electricity', 'water', 'internet', 'phone', 'rent', 'utility'],
      'Groceries': ['grocery', 'groceries', 'supermarket', 'walmart', 'target', 'market'],
    };

    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        return category;
      }
    }

    return 'Other';
  }

  /**
   * Provide voice feedback to user
   */
  static async speakFeedback(message: string): Promise<void> {
    try {
      await Speech.speak(message, {
        language: 'en-US',
        pitch: 1.0,
        rate: 0.9,
      });
    } catch (error) {
      console.error('Error speaking feedback:', error);
    }
  }

  /**
   * Get example voice commands for user guidance
   */
  static getExampleCommands(): string[] {
    return [
      "Spent 12 on lunch",
      "Paid 50 for gas",
      "Bought coffee for 4.50",
      "Received 500 salary",
      "Purchased groceries for 85",
      "Paid 25 for movie tickets",
      "Got 20 refund from store"
    ];
  }
}
