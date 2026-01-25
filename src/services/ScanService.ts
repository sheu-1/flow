import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

export interface ScannedItem {
    name: string;
    price: number;
}

export interface ScannedTransaction {
    date: Date;
    description: string;
    amount: number;
    type: 'income' | 'expense';
    items?: ScannedItem[];
}

const MOCK_RECEIPT_ITEMS: ScannedItem[] = [
    { name: 'Milk 1L', price: 120 },
    { name: 'Broad', price: 65 },
    { name: 'Eggs (Tray)', price: 450 },
    { name: 'Yogurt', price: 150 },
];

const MOCK_STATEMENT_TRANSACTIONS: ScannedTransaction[] = [
    { date: new Date('2025-01-10'), description: 'Salary Deposit', amount: 50000, type: 'income' },
    { date: new Date('2025-01-12'), description: 'Netflix Subscription', amount: 1200, type: 'expense' },
    { date: new Date('2025-01-15'), description: 'Supermarket Purchase', amount: 4500, type: 'expense' },
];

export const ScanService = {
    requestPermissions: async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission needed', 'Sorry, we need camera roll permissions to make this work!');
            return false;
        }
        return true;
    },

    pickImage: async (): Promise<string | null> => {
        const hasPermission = await ScanService.requestPermissions();
        if (!hasPermission) return null;

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true, // Simple cropping
            quality: 1,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            return result.assets[0].uri;
        }
        return null;
    },

    takePhoto: async (): Promise<string | null> => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission needed', 'Camera permission is required to scan receipts.');
            return null;
        }

        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            quality: 1,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            return result.assets[0].uri;
        }
        return null;
    },

    // Mock extraction logic
    parseReceipt: async (imageUri: string): Promise<ScannedTransaction> => {
        // Simulate processing delay
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Return mock data
        const total = MOCK_RECEIPT_ITEMS.reduce((sum, item) => sum + item.price, 0);
        return {
            date: new Date(),
            description: 'Shopping List Scan',
            amount: total,
            type: 'expense',
            items: MOCK_RECEIPT_ITEMS,
        };
    },

    parseStatement: async (fileUri: string): Promise<ScannedTransaction[]> => {
        // Simulate processing delay
        await new Promise(resolve => setTimeout(resolve, 2500));

        return MOCK_STATEMENT_TRANSACTIONS;
    }
};
