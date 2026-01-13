import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp, SlideInRight, SlideOutRight, FadeIn, FadeOut, useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useThemeColors } from '../theme/ThemeProvider';
import { AggregatePeriod } from '../types';
import { spacing } from '../theme/colors';
import AIAccountantPanel from '../components/AIAccountantPanel';
import { useAuth } from '../hooks/useAuth';
import { AIChatService, AIConversation } from '../services/AIChatService';

const { width } = Dimensions.get('window');
const SIDE_PAGE_WIDTH = width * 0.8;

export default function AIAccountantScreen() {
  const { user } = useAuth();
  const colors = useThemeColors();
  const [period] = useState<AggregatePeriod>('monthly');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [conversations, setConversations] = useState<AIConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  const loadConversations = useCallback(async () => {
    if (!user?.id) return;
    try {
      const data = await AIChatService.getConversations(user.id);
      setConversations(data);
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  }, [user?.id]);

  useEffect(() => {
    if (isHistoryOpen) {
      loadConversations();
    }
  }, [isHistoryOpen, loadConversations]);

  const selectConversation = (id: string | null) => {
    setActiveConversationId(id);
    setIsHistoryOpen(false);
  };

  const startNewChat = () => {
    setActiveConversationId(null);
    setIsHistoryOpen(false);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header harmonized with Dashboard */}
      <Animated.View style={[styles.header, { backgroundColor: colors.background }]} entering={FadeInUp.springify()}>
        <View style={styles.headerContent}>
          <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
            <Ionicons name="sparkles" size={24} color={colors.primary} />
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>AI Assistant</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>Your personal financial advisor</Text>
          </View>
          <TouchableOpacity
            style={[styles.historyButton, { backgroundColor: colors.surface }]}
            onPress={() => setIsHistoryOpen(true)}
          >
            <Ionicons name="time-outline" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </Animated.View>

      {user?.id ? (
        <AIAccountantPanel
          userId={user.id}
          period={period}
          currentConversationId={activeConversationId}
          onConversationCreated={(id) => setActiveConversationId(id)}
        />
      ) : (
        <View style={styles.signInPrompt}>
          <Text style={[styles.signInText, { color: colors.textSecondary }]}>Sign in to use the AI accountant.</Text>
        </View>
      )}

      {/* History Side Page (Drawer) */}
      {isHistoryOpen && (
        <View style={StyleSheet.absoluteFill}>
          <Pressable
            style={styles.overlay}
            onPress={() => setIsHistoryOpen(false)}
          >
            <Animated.View
              entering={FadeIn}
              exiting={FadeOut}
              style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
            />
          </Pressable>

          <Animated.View
            entering={SlideInRight}
            exiting={SlideOutRight}
            style={[styles.sidePage, { backgroundColor: colors.background }]}
          >
            <View style={[styles.sidePageHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.sidePageTitle, { color: colors.text }]}>Recent Chats</Text>
              <TouchableOpacity onPress={() => setIsHistoryOpen(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.historyList}>
              <TouchableOpacity
                style={[styles.historyItem, styles.newChatItem, { borderColor: colors.primary }]}
                onPress={startNewChat}
              >
                <Ionicons name="add" size={20} color={colors.primary} />
                <Text style={[styles.newChatText, { color: colors.primary }]}>Start New Chat</Text>
              </TouchableOpacity>

              {conversations.map((chat) => (
                <TouchableOpacity
                  key={chat.id}
                  style={[
                    styles.historyItem,
                    { backgroundColor: activeConversationId === chat.id ? colors.primary + '15' : 'transparent' }
                  ]}
                  onPress={() => selectConversation(chat.id)}
                >
                  <Ionicons
                    name="chatbubble-outline"
                    size={20}
                    color={activeConversationId === chat.id ? colors.primary : colors.textSecondary}
                  />
                  <View style={styles.historyItemText}>
                    <Text
                      style={[
                        styles.historyTitle,
                        { color: activeConversationId === chat.id ? colors.primary : colors.text }
                      ]}
                      numberOfLines={1}
                    >
                      {chat.title}
                    </Text>
                    <Text style={[styles.historyDate, { color: colors.textMuted }]}>
                      {new Date(chat.updated_at).toLocaleDateString()}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Animated.View>
        </View>
      )}
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
    zIndex: 10,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  headerText: {
    flex: 1,
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
  historyButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
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
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
  },
  sidePage: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: SIDE_PAGE_WIDTH,
    zIndex: 101,
    elevation: 16,
    shadowColor: '#000',
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  sidePageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
  },
  sidePageTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  historyList: {
    padding: 16,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  newChatItem: {
    borderWidth: 1,
    borderStyle: 'dashed',
    justifyContent: 'center',
    marginBottom: 20,
  },
  newChatText: {
    marginLeft: 8,
    fontWeight: '600',
  },
  historyItemText: {
    marginLeft: 12,
    flex: 1,
  },
  historyTitle: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 2,
  },
  historyDate: {
    fontSize: 12,
  },
});
