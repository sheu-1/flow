import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, SafeAreaView, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInUp, FadeIn, SlideInRight, SlideOutLeft } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../theme/ThemeProvider';
import { AggregatePeriod } from '../types';
import { chat as llmChat, ChatMessage } from '../services/LLM';
import { buildFinancialContext } from '../services/RAG';
import { saveChatHistory, loadChatHistory, createNewConversation, ChatMessage as AIChatMessage } from '../services/AIChatService';

import { AIChatService } from '../services/AIChatService';

interface Props {
  userId: string;
  period: AggregatePeriod;
  currentConversationId: string | null;
  onConversationCreated: (id: string) => void;
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

<<<<<<< HEAD
export const AIAccountantPanel: React.FC<Props> = ({ userId, period, conversationId, onNewConversation }) => {
=======
export const AIAccountantPanel: React.FC<Props> = ({ userId, period, currentConversationId, onConversationCreated }) => {
>>>>>>> acc11e40da81d4652908f0b8b3680d7ac0e0d5b7
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [promptStatus, setPromptStatus] = useState<{ count: number; isPremium: boolean }>({ count: 0, isPremium: false });
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
    // Load chat history when conversationId changes
    async function loadHistory() {
      if (conversationId) {
        const history = await loadChatHistory(conversationId);
        setMessages(history.length > 0 ? history : [getInitialMessage()]);
      } else {
        setMessages([getInitialMessage()]);
      }
    }
    loadHistory();
  }, [conversationId]);

  useEffect(() => {
    // scroll to bottom when messages change
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages]);

  const getInitialMessage = () => ({
    role: 'assistant' as const,
    content: 'Hi! I\'m your AI accountant. Ask me about your spending trends, budgeting ideas, or how to reach your savings goals. 💰\n\nTry asking:\n• "How did I spend this month?"\n• "What are my biggest expenses?"\n• "Give me budgeting tips"',
  });

  const handleNewChat = () => {
    onNewConversation(null);
    setMessages([getInitialMessage()]);
  };

  const send = useCallback(async () => {
    if (!input.trim() || loading) return;

    // Check prompt limit
    if (!promptStatus.isPremium && promptStatus.count >= 10) {
      Alert.alert(
        'Limit Reached',
        'You have reached the limit of 10 free AI prompts. Upgrade to Premium for unlimited access!',
        [{ text: 'OK' }]
      );
      return;
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
<<<<<<< HEAD
      const newMessages: AIChatMessage[] = [...messages, userMsg, { role: 'assistant', content: reply }];
      setMessages(newMessages);

      if (conversationId) {
        saveChatHistory(conversationId, newMessages);
      } else {
        const newConversation = await createNewConversation(userId, currentInput);
        if (newConversation) {
          onNewConversation(newConversation.id);
          saveChatHistory(newConversation.id, newMessages);
        }
      }
=======

      const assistantMsg: ChatMessage = { role: 'assistant', content: reply };
      setMessages((m) => [...m, assistantMsg]);

      // Save assistant message
      await AIChatService.saveMessage(activeId, assistantMsg);

      // Increment prompt count
      const newCount = await AIChatService.incrementPromptCount(userId);
      setPromptStatus(prev => ({ ...prev, count: newCount }));

>>>>>>> acc11e40da81d4652908f0b8b3680d7ac0e0d5b7
    } catch (e: any) {
      console.error('AI Chat Error:', e);
      const rawMessage = String(e?.message || '');
      const errorMsg = rawMessage.includes('API key')
        ? 'Please configure your AI API key in Settings.'
        : `Sorry, I couldn\'t process that request.`;

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

          {!promptStatus.isPremium && promptStatus.count >= 10 && (
            <Animated.View entering={FadeIn} style={styles.limitReachedWrapper}>
              <View style={[styles.limitReachedBubble, { backgroundColor: colors.primary + '15', borderColor: colors.primary }]}>
                <Ionicons name="lock-closed" size={20} color={colors.primary} />
                <Text style={[styles.limitReachedText, { color: colors.text }]}>
                  Free prompt limit reached (10/10). Upgrade to Premium for unlimited chats!
                </Text>
                <TouchableOpacity style={[styles.upgradeButton, { backgroundColor: colors.primary }]}>
                  <Text style={styles.upgradeButtonText}>Upgrade Now</Text>
                </TouchableOpacity>
              </View>
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
          <TouchableOpacity style={[styles.newChatButton, { borderColor: colors.primary }]} onPress={handleNewChat}>
            <Ionicons name="add" size={20} color={colors.primary} />
            <Text style={[styles.newChatText, { color: colors.primary }]}>New Chat</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 24,
    marginRight: 40,
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
    fontSize: 16,
    marginLeft: 8,
    fontStyle: 'italic',
  },
  limitReachedWrapper: {
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  limitReachedBubble: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    width: '100%',
  },
  limitReachedText: {
    fontSize: 15,
    textAlign: 'center',
    marginVertical: 12,
    fontWeight: '500',
    lineHeight: 22,
  },
  upgradeButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 8,
  },
  upgradeButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  inputContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16, 
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 28,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  iconButton: {
    padding: 8,
    marginHorizontal: 4,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    lineHeight: 20,
    maxHeight: 60, // Reduced from 100 to 60
    marginHorizontal: 8,
    fontFamily: 'System',
  },
  sendButton: {
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    shadowColor: '#10B981',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.4,
    shadowRadius: 8,
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

export default AIAccountantPanel;
