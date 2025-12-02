/**
 * ReceiptScanService
 * 
 * Handles photo receipt scanning and OCR text extraction
 */

import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

export interface ReceiptData {
  amount: number;
  merchant: string;
  date?: Date;
  items?: string[];
  confidence: number;
}

export class ReceiptScanService {
  /**
   * Request camera and media library permissions
   */
  static async requestPermissions(): Promise<boolean> {
    try {
      const cameraResult = await ImagePicker.requestCameraPermissionsAsync();
      const mediaResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      return cameraResult.status === 'granted' && mediaResult.status === 'granted';
    } catch (error) {
      console.error('Error requesting permissions:', error);
      return false;
    }
  }

  /**
   * Take a photo of receipt using camera
   */
  static async takeReceiptPhoto(): Promise<string | null> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        return null;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets[0]) {
        return result.assets[0].uri;
      }

      return null;
    } catch (error) {
      console.error('Error taking photo:', error);
      return null;
    }
  }

  /**
   * Pick receipt image from gallery
   */
  static async pickReceiptImage(): Promise<string | null> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        return null;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets[0]) {
        return result.assets[0].uri;
      }

      return null;
    } catch (error) {
      console.error('Error picking image:', error);
      return null;
    }
  }

  /**
   * Extract receipt data from image using OCR
   * Note: This is a simplified implementation. In production, you'd use services like:
   * - Google Cloud Vision API
   * - AWS Textract
   * - Azure Computer Vision
   * - Tesseract.js for client-side OCR
   */
  static async extractReceiptData(imageUri: string): Promise<ReceiptData | null> {
    try {
      // For now, we'll simulate OCR processing
      // In a real implementation, you would:
      // 1. Convert image to base64
      // 2. Send to OCR service
      // 3. Parse the returned text

      const base64Image = await FileSystem.readAsStringAsync(imageUri, {
        encoding: 'base64',
      });

      try {
        console.log('📸 Processing receipt image...');
        
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 2000));

        // This would be replaced with actual OCR service call
        const mockReceiptData = await this.simulateOCRProcessing(base64Image);
        
        if (mockReceiptData) {
          console.log('✅ Receipt processed successfully:', mockReceiptData);
        } else {
          console.log('❌ Receipt processing failed - could not extract data');
        }
        
        return mockReceiptData;
      } catch (error) {
        console.error('Error extracting receipt data:', error);
        return null;
      }
    } catch (error) {
      console.error('Error extracting receipt data:', error);
      return null;
    }
  }

  /**
   * Simulate OCR processing (replace with actual OCR service)
   */
  private static async simulateOCRProcessing(base64Image: string): Promise<ReceiptData | null> {
    // This is a mock implementation for testing
    // In production, replace with actual OCR service like Google Cloud Vision
    
    const mockReceipts = [
      {
        amount: 12.45,
        merchant: "Joe's Coffee Shop",
        date: new Date(),
        items: ["Latte", "Blueberry Muffin"],
        confidence: 0.85
      },
      {
        amount: 67.89,
        merchant: "SuperMart Grocery",
        date: new Date(),
        items: ["Milk", "Bread", "Eggs", "Apples"],
        confidence: 0.92
      },
      {
        amount: 25.00,
        merchant: "Shell Gas Station",
        date: new Date(),
        items: ["Fuel"],
        confidence: 0.78
      },
      {
        amount: 8.50,
        merchant: "McDonald's",
        date: new Date(),
        items: ["Big Mac", "Fries", "Coke"],
        confidence: 0.88
      },
      {
        amount: 45.30,
        merchant: "Target",
        date: new Date(),
        items: ["Shampoo", "Toothpaste", "Snacks"],
        confidence: 0.91
      }
    ];

    // Always return a valid receipt for testing (90% success rate)
    if (Math.random() < 0.9) {
      return mockReceipts[Math.floor(Math.random() * mockReceipts.length)];
    } else {
      // 10% chance of failure to simulate real-world OCR issues
      return null;
    }
  }

  /**
   * Parse OCR text to extract receipt information
   */
  static parseReceiptText(ocrText: string): ReceiptData | null {
    try {
      const lines = ocrText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      
      let amount = 0;
      let merchant = '';
      let confidence = 0.5;
      const items: string[] = [];

      // Extract total amount
      const totalPatterns = [
        /total[:\s]*\$?(\d+\.?\d*)/i,
        /amount[:\s]*\$?(\d+\.?\d*)/i,
        /\$(\d+\.?\d*)\s*total/i,
        /grand\s*total[:\s]*\$?(\d+\.?\d*)/i,
      ];

      for (const pattern of totalPatterns) {
        for (const line of lines) {
          const match = line.match(pattern);
          if (match) {
            amount = parseFloat(match[1]);
            confidence += 0.2;
            break;
          }
        }
        if (amount > 0) break;
      }

      // Extract merchant name (usually first few lines)
      const merchantPatterns = [
        /^[A-Z][A-Z\s&'.-]{2,30}$/,
        /^[A-Z][a-z\s&'.-]{2,30}$/,
      ];

      for (let i = 0; i < Math.min(5, lines.length); i++) {
        const line = lines[i];
        if (merchantPatterns.some(pattern => pattern.test(line))) {
          merchant = line;
          confidence += 0.1;
          break;
        }
      }

      // Extract items (lines with prices)
      const itemPattern = /^(.+?)\s+\$?(\d+\.?\d*)$/;
      for (const line of lines) {
        const match = line.match(itemPattern);
        if (match && parseFloat(match[2]) > 0 && parseFloat(match[2]) < amount) {
          items.push(match[1].trim());
        }
      }

      if (amount > 0) {
        return {
          amount,
          merchant: merchant || 'Unknown Merchant',
          date: new Date(),
          items: items.length > 0 ? items : undefined,
          confidence: Math.min(confidence, 1.0)
        };
      }

      return null;
    } catch (error) {
      console.error('Error parsing receipt text:', error);
      return null;
    }
  }

  /**
   * Get common merchant categories for auto-categorization
   */
  static getMerchantCategory(merchantName: string): string {
    const merchantCategories = {
      'Food & Dining': ['restaurant', 'cafe', 'coffee', 'pizza', 'burger', 'diner', 'bistro', 'grill'],
      'Groceries': ['market', 'grocery', 'supermarket', 'walmart', 'target', 'costco', 'kroger'],
      'Gas & Fuel': ['shell', 'exxon', 'bp', 'chevron', 'gas', 'fuel', 'station'],
      'Shopping': ['mall', 'store', 'shop', 'amazon', 'ebay', 'retail'],
      'Pharmacy': ['pharmacy', 'cvs', 'walgreens', 'rite aid', 'drug'],
      'Entertainment': ['cinema', 'theater', 'movie', 'amc', 'regal'],
    };

    const lowerMerchant = merchantName.toLowerCase();
    
    for (const [category, keywords] of Object.entries(merchantCategories)) {
      if (keywords.some(keyword => lowerMerchant.includes(keyword))) {
        return category;
      }
    }

    return 'Other';
  }
}
