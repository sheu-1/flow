import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useThemeColors } from '../theme/ThemeProvider';
import { AggregatePeriod } from '../types';
import { spacing } from '../theme/colors';
import AIAccountantPanel from '../components/AIAccountantPanel';
import ChatHistoryPanel from '../components/ChatHistoryPanel';
import { useAuth } from '../hooks/useAuth';

export default function AIAccountantScreen() {
  const { user } = useAuth();
  const colors = useThemeColors();
  const [period] = useState<AggregatePeriod>('monthly');
  const [historyVisible, setHistoryVisible] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header harmonized with Dashboard */}
      <Animated.View style={[styles.header, { backgroundColor: colors.background }]} entering={FadeInUp.springify()}> 
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => setHistoryVisible(true)} style={styles.menuButton}>
            <Ionicons name="menu" size={28} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>AI Assistant</Text>
          </View>
        </View>
      </Animated.View>

      {user?.id ? (
        <AIAccountantPanel 
          userId={user.id} 
          period={period} 
          conversationId={conversationId}
          onNewConversation={setConversationId}
        />
      ) : (
        <View style={styles.signInPrompt}>
          <Text style={[styles.signInText, { color: colors.textSecondary }]}>Sign in to use the AI accountant.</Text>
        </View>
      )}
      <Modal
        visible={historyVisible}
        animationType="slide"
        onRequestClose={() => setHistoryVisible(false)}
      >
        <ChatHistoryPanel 
          onSelectConversation={(id) => {
            setConversationId(id);
            setHistoryVisible(false);
          }}
          onClose={() => setHistoryVisible(false)}
        />
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuButton: {
    padding: 8,
  },
  headerTextContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    lineHeight: 18,
  },
  signInPrompt: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  signInText: {
    fontSize: 16,
    textAlign: 'center',
  },
});
