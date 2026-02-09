import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, SafeAreaView, Alert, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInUp, FadeIn, SlideInRight, SlideOutLeft } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../theme/ThemeProvider';
import { AggregatePeriod } from '../types';
import { chat as llmChat, ChatMessage } from '../services/LLM';
import { buildFinancialContext } from '../services/RAG';
import { saveChatHistory, loadChatHistory, createNewConversation } from '../services/AIChatService';
import { AIChatService } from '../services/AIChatService';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  messagesContent: {
    paddingTop: 20,
    paddingBottom: 20,
  },
  messageWrapper: {
    marginVertical: 12,
  },
  userMessageWrapper: {
    alignItems: 'flex-end',
  },
  assistantMessageWrapper: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '85%',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  userBubble: {
    marginLeft: 40,
  },
  assistantBubble: {
    marginRight: 40,
  },
  messageText: {
    lineHeight: 20,
    fontFamily: 'System',
  },
  userText: {
    fontSize: 15,
    fontWeight: '500',
  },
  assistantText: {
    fontSize: 16,
    fontWeight: '400',
  },
  loadingWrapper: {
    alignItems: 'flex-start',
    marginVertical: 12,
  },
  loadingBubble: {
    maxWidth: '85%',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  loadingText: {
    fontSize: 14,
    marginLeft: 8,
    color: '#666',
  },
  limitReachedWrapper: {
    alignItems: 'center',
    marginVertical: 16,
    width: '100%',
  },
  limitReachedBubble: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    width: '90%',
  },
  limitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  limitReachedText: {
    fontSize: 15,
    marginLeft: 10,
    fontWeight: '500',
  },
  limitButtonsRow: {
    flexDirection: 'row',
  },
  upgradeButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  upgradeButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    borderRadius: 32,
    padding: 24,
    alignItems: 'center',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginTop: 12,
  },
  modalDescription: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
    paddingHorizontal: 10,
  },
  modalButtons: {
    width: '100%',
    gap: 12,
  },
  modalButton: {
    flexDirection: 'row',
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  secondaryButton: {
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 10,
  },
  cancelButton: {
    marginTop: 8,
    height: 48,
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '500',
  },
  inputContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 25,
    borderWidth: 1,
    height: 75,
    paddingHorizontal: 12,
  },
  iconButton: {
    padding: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    paddingHorizontal: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    elevation: 6,
  },
  newChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 20,
    alignSelf: 'flex-end',
    marginTop: 8,
  },
  newChatText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
  },
});

interface Props {
  userId: string;
  period: AggregatePeriod;
  currentConversationId: string | null;
  onConversationCreated: (id: string | null) => void;
}

// Remove common Markdown tokens from AI responses for plain text display
function sanitizeMarkdown(text: string): string {
  if (!text) return '';
  // Normalize line endings
  let t = text.replace(/\r\n/g, '\n');
  // Remove triple backtick code fences
  t = t.replace(/```[\s\S]*?```/g, (m) => m.replace(/```/g, ''));
  // Remove leading markdown list/heading/blockquote markers per line
  t = t
    .split('\n')
    .map((line) =>
      line
        .replace(/^\s{0,3}(#{1,6})\s+/g, '') // #, ##, ### headings
        .replace(/^\s{0,3}[-*+]\s+/g, '') // bullet lists - * +
        .replace(/^\s{0,3}>\s+/g, '') // blockquote
        .replace(/^\s{0,3}[0-9]+\.\s+/g, '') // ordered lists
    )
    .join('\n');
  // Emphasis/bold/inline code
  t = t.replace(/\*\*([^*]+)\*\*/g, '$1');
  t = t.replace(/\*([^*]+)\*/g, '$1');
  t = t.replace(/__([^_]+)__/g, '$1');
  t = t.replace(/_([^_]+)_/g, '$1');
  t = t.replace(/`([^`]+)`/g, '$1');
  // Links: [text](url) -> text
  t = t.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1');
  // Residual stray hashes/asterisks surrounded by spaces
  t = t.replace(/\s[#*]+\s/g, ' ');
  return t.trim();
}

export const AIAccountantPanel: React.FC<Props> = ({ userId, period, currentConversationId, onConversationCreated }) => {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [promptStatus, setPromptStatus] = useState<{ count: number; isPremium: boolean }>({ count: 0, isPremium: false });
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [limitStatus, setLimitStatus] = useState<{ allowed: boolean; remaining: number }>({ allowed: true, remaining: 3 });
  const [contextCache, setContextCache] = useState<string | null>(null);
  const [lastContextTime, setLastContextTime] = useState<number>(0);
  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

  // Load existing conversation or prompt status
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const status = await AIChatService.getPromptStatus(userId);
        setPromptStatus(status);

        if (currentConversationId) {
          const history = await AIChatService.getMessages(currentConversationId);
          if (history.length > 0) {
            setMessages(history);
          }
        } else {
          // Reset to default greeting for new chat
          setMessages([
            { role: 'assistant', content: 'Hi! I\'m your AI accountant. Ask me about your spending trends, budgeting ideas, or how to reach your savings goals. 💰\n\nTry asking:\n• "How did I spend this month?"\n• "What are my biggest expenses?"\n• "Give me budgeting tips"' },
          ]);
        }
      } catch (error) {
        console.error('Error initializing chat:', error);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [userId, currentConversationId]);

  // Cache context for 5 minutes to improve performance
  const contextPromise = useMemo(() => {
    const now = Date.now();
    if (contextCache && (now - lastContextTime) < 300000) { // 5 minutes
      return Promise.resolve(contextCache);
    }
    return buildFinancialContext(userId, period).then(context => {
      setContextCache(context);
      setLastContextTime(now);
      return context;
    });
  }, [userId, period, contextCache, lastContextTime]);

  useEffect(() => {
    // Load chat history when currentConversationId changes
    async function loadHistory() {
      if (currentConversationId) {
        const history = await loadChatHistory(currentConversationId);
        setMessages(history.length > 0 ? history : [getInitialMessage()]);
      } else {
        setMessages([getInitialMessage()]);
      }
    }
    loadHistory();
  }, [currentConversationId]);

  useEffect(() => {
    // scroll to bottom when messages change
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages]);

  const getInitialMessage = () => ({
    role: 'assistant' as const,
    content: 'Hi! I\'m your AI accountant. Ask me about your spending trends, budgeting ideas, or how to reach your savings goals. 💰\n\nTry asking:\n• "How did I spend this month?"\n• "What are my biggest expenses?"\n• "Give me budgeting tips"',
  });

  const handleNewChat = () => {
    onConversationCreated(null);
    setMessages([getInitialMessage()]);
  };

  const send = useCallback(async () => {
    if (!input.trim() || loading) return;

    // Check prompt limit
    try {
      const status = await AIChatService.checkDailyLimit(userId);
      setLimitStatus(status);
      if (!status.allowed) {
        setShowLimitModal(true);
        return;
      }
    } catch (e) {
      console.warn('Limit check failed', e);
    }

    const currentInput = input.trim();
    const userMsg: ChatMessage = { role: 'user', content: currentInput };

    setMessages((m) => [...m, userMsg]);
    setInput('');
    setLoading(true);

    try {
      let activeId = currentConversationId;

      // Create conversation if it doesn't exist
      if (!activeId) {
        const newConv = await AIChatService.createConversation(userId, currentInput.slice(0, 30) + (currentInput.length > 30 ? '...' : ''));
        activeId = newConv.id;
        onConversationCreated(activeId);
      } else if (messages.length === 1) {
        // Update title if it's the first user message in an existing empty-ish conversation
        await AIChatService.updateTitle(activeId, currentInput.slice(0, 30) + (currentInput.length > 30 ? '...' : ''));
      }

      // Save user message
      await AIChatService.saveMessage(activeId, userMsg);

      const context = await contextPromise;
      // Limit conversation history to last 10 messages for better performance
      const recentMessages = messages.slice(-10);
      const reply = await llmChat([...recentMessages, userMsg], context);
      const assistantMsg: ChatMessage = { role: 'assistant', content: reply };
      setMessages((m) => [...m, assistantMsg]);

      // Save to conversation
      if (activeId) {
        await saveChatHistory(activeId, [...messages, userMsg, assistantMsg]);
        // Ensure state is synced if it wasn't already (though we called onConversationCreated earlier)
        if (activeId !== currentConversationId) {
          onConversationCreated(activeId);
        }
      }

      // Update prompt count
      await AIChatService.incrementDailyCount(userId);
      const newStatus = await AIChatService.getPromptStatus(userId);
      setPromptStatus(newStatus);
    } catch (e: any) {
      console.error('AI Chat Error:', e);
      const rawMessage = String(e?.message || '');
      const errorMsg = rawMessage.includes('API key')
        ? 'Please configure your AI API key in Settings.'
        : `Sorry, I couldn't process that request.`;

      setMessages((m) => [...m, { role: 'assistant', content: errorMsg }]);

      // Show alert for critical errors
      if (e?.message?.includes('API key')) {
        Alert.alert('AI Setup Required', 'Configure your OpenRouter API key in Settings to enable AI features.');
      }

      if (rawMessage.includes('(402)') || rawMessage.includes('"code":402')) {
        Alert.alert(
          'OpenRouter Credits Required',
          'Your OpenRouter account does not have enough credits for this request. Add credits on OpenRouter, or use a cheaper model / smaller responses.'
        );
      }
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, contextPromise, userId, currentConversationId, promptStatus, onConversationCreated]);

  const handleUnlock = async () => {
    // Logic to show rewarded ad
    try {
      // Web guard
      if (Platform.OS === 'web') {
        Alert.alert('Not Supported', 'Ad rewards are only available on the mobile app.');
        return;
      }

      const { AdMobConfig } = require('../services/AdMobService');
      const { RewardedAd, RewardedAdEventType, AdEventType } = require('react-native-google-mobile-ads');

      setLoading(true);
      setShowLimitModal(false); // Close modal while loading ad

      const ad = RewardedAd.createForAdRequest(AdMobConfig.rewardedId, {
        requestNonPersonalizedAdsOnly: true,
      });

      // Handle ad loaded
      const unsubLoaded = ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
        console.log('[RewardedAd] Ad loaded, showing...');
        ad.show();
      });

      // Handle reward earned
      const unsubReward = ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, async () => {
        console.log('[RewardedAd] Reward earned!');
        try {
          await AIChatService.grantExtraChats(userId);
          // Refresh limits
          const newStatus = await AIChatService.checkDailyLimit(userId);
          setLimitStatus(newStatus);
          Alert.alert('Success', 'You have been granted 5 extra chats!');
        } catch (e) {
          console.error('[RewardedAd] Error granting chats:', e);
        }
        setLoading(false);
      });

      // Handle errors using AdEventType.ERROR
      const unsubError = ad.addAdEventListener(AdEventType.ERROR, (error: any) => {
        console.error('[RewardedAd] Error:', error);
        setLoading(false);
        Alert.alert('Ad Failed', 'Could not load ad. Please try again later.');
      });

      // Handle ad closed without reward
      const unsubClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
        console.log('[RewardedAd] Ad closed');
        setLoading(false);
        // Cleanup listeners
        unsubLoaded();
        unsubReward();
        unsubError();
        unsubClosed();
      });

      console.log('[RewardedAd] Loading ad...');
      ad.load();
    } catch (e) {
      console.error('[RewardedAd] Setup error:', e);
      setLoading(false);
      Alert.alert('Error', 'Could not initialize ad. Please try again.');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: 'padding', android: 'height' })}
        keyboardVerticalOffset={Platform.select({ ios: 90, android: 50 })}
        style={styles.keyboardView}
      >
        {/* Chat Messages */}
        <ScrollView
          ref={scrollRef}
          style={styles.messagesContainer}
          contentContainerStyle={[styles.messagesContent, { paddingBottom: Math.max(20, insets.bottom + 20) }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map((message, index) => (
            <Animated.View
              key={`${index}-${message.content.slice(0, 20)}`}
              entering={message.role === 'user' ? SlideInRight.springify() : FadeInUp.delay(100).springify()}
              style={[
                styles.messageWrapper,
                message.role === 'user' ? styles.userMessageWrapper : styles.assistantMessageWrapper
              ]}
            >
              <View style={[
                styles.messageBubble,
                message.role === 'user' ?
                  [styles.userBubble, { backgroundColor: colors.primary }] :
                  [styles.assistantBubble, { backgroundColor: colors.surface }]
              ]}>
                <Text style={[
                  styles.messageText,
                  message.role === 'user' ?
                    [styles.userText, { color: '#FFFFFF' }] :
                    [styles.assistantText, { color: colors.text }]
                ]}>
                  {message.role === 'assistant' ? sanitizeMarkdown(message.content) : message.content}
                </Text>
              </View>
            </Animated.View>
          ))}

          {!promptStatus.isPremium && !limitStatus.allowed && (
            <Animated.View entering={FadeIn} style={styles.limitReachedWrapper}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setShowLimitModal(true)}
                style={[styles.limitReachedBubble, { backgroundColor: colors.primary + '15', borderColor: colors.primary }]}
              >
                <View style={styles.limitHeader}>
                  <Ionicons name="lock-closed" size={20} color={colors.primary} />
                  <Text style={[styles.limitReachedText, { color: colors.text }]}>
                    Daily limit reached. Tap for options.
                  </Text>
                </View>
                <View style={styles.limitButtonsRow}>
                  <View style={[styles.upgradeButton, { backgroundColor: colors.primary }]}>
                    <Text style={styles.upgradeButtonText}>Upgrade Premium</Text>
                  </View>
                </View>
              </TouchableOpacity>
            </Animated.View>
          )}

          {loading && (
            <Animated.View entering={FadeIn} style={styles.loadingWrapper}>
              <View style={[styles.loadingBubble, { backgroundColor: colors.surface }]}>
                <ActivityIndicator color={colors.primary} size="small" />
                <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Thinking…</Text>
              </View>
            </Animated.View>
          )}
        </ScrollView>

        {/* Input Bar */}
        <View style={[styles.inputContainer, { paddingBottom: Math.max(34, insets.bottom + 10) }]}>
          <View style={[styles.inputBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => Alert.alert('Voice Input', 'Voice input coming soon!')}
            >
              <Ionicons name="mic" size={20} color={colors.textSecondary} />
            </TouchableOpacity>

            <TextInput
              ref={inputRef}
              placeholder="Ask your accountant anything…"
              placeholderTextColor={colors.textMuted}
              style={[styles.textInput, { color: colors.text }]}
              value={input}
              onChangeText={setInput}
              onSubmitEditing={send}
              returnKeyType="send"
              multiline
              maxLength={500}
              blurOnSubmit={false}
              autoFocus={false}
              onFocus={() => {
                // Scroll to bottom when input is focused for better visibility
                setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
              }}
            />

            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => Alert.alert('Attachments', 'File attachments coming soon!')}
            >
              <Ionicons name="attach" size={20} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={send}
              style={[
                styles.sendButton,
                { backgroundColor: colors.primary, opacity: input.trim() ? 1 : 0.5 }
              ]}
              disabled={loading || !input.trim()}
            >
              <Ionicons name="send" size={18} color={colors.background} />
            </TouchableOpacity>
          </View>
        </View>
        {/* Modal for Limit Reached */}
        <Modal
          visible={showLimitModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowLimitModal(false)}
        >
          <View style={styles.modalOverlay}>
            <Animated.View entering={FadeInUp} style={[styles.modalContent, { backgroundColor: colors.surface }]}>
              <View style={styles.modalHeader}>
                <Ionicons name="flash-outline" size={32} color={colors.primary} />
                <Text style={[styles.modalTitle, { color: colors.text }]}>Daily Limit Reached</Text>
              </View>

              <Text style={[styles.modalDescription, { color: colors.textSecondary }]}>
                Rate limit has been reached but you can watch an ad to get 5 extra chats or wait for your rate limit to reset at midnight.
              </Text>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: colors.primary }]}
                  onPress={handleUnlock}
                >
                  <Ionicons name="play-circle-outline" size={22} color="#FFF" />
                  <Text style={styles.modalButtonText}>Watch Ad for 5 Chats</Text>
                </TouchableOpacity>

                {/* SUBSCRIPTION BUTTON - COMMENTED OUT FOR NOW
                <TouchableOpacity
                  style={[styles.modalButton, styles.secondaryButton, { borderColor: colors.primary }]}
                  onPress={() => {
                    setShowLimitModal(false);
                    Alert.alert('Subscription', 'Redirecting to Premium Subscriptions...');
                  }}
                >
                  <Ionicons name="star-outline" size={22} color={colors.primary} />
                  <Text style={[styles.modalButtonText, { color: colors.primary }]}>Go Premium (Unlimited)</Text>
                </TouchableOpacity>
                */}

                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setShowLimitModal(false)}
                >
                  <Text style={[styles.cancelButtonText, { color: colors.textMuted }]}>Maybe Later</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};



export default AIAccountantPanel;
