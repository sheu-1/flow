import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, SafeAreaView, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInUp, FadeIn, SlideInRight, SlideOutLeft } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../theme/ThemeProvider';
import { AggregatePeriod } from '../types';
import { chat as llmChat, ChatMessage } from '../services/LLM';
import { buildFinancialContext } from '../services/RAG';

interface Props {
  userId: string;
  period: AggregatePeriod;
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

export const AIAccountantPanel: React.FC<Props> = ({ userId, period }) => {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: 'Hi! I\'m your AI accountant. Ask me about your spending trends, budgeting ideas, or how to reach your savings goals. 💰\n\nTry asking:\n• "How did I spend this month?"\n• "What are my biggest expenses?"\n• "Give me budgeting tips"' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [contextCache, setContextCache] = useState<string | null>(null);
  const [lastContextTime, setLastContextTime] = useState<number>(0);
  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

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
    // scroll to bottom when messages change
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages]);

  const send = useCallback(async () => {
    if (!input.trim() || loading) return;
    
    const userMsg: ChatMessage = { role: 'user', content: input.trim() };
    const currentInput = input.trim();
    setMessages((m) => [...m, userMsg]);
    setInput('');
    setLoading(true);
    
    try {
      const context = await contextPromise;
      // Limit conversation history to last 10 messages for better performance
      const recentMessages = messages.slice(-10);
      const reply = await llmChat([...recentMessages, userMsg], context);
      setMessages((m) => [...m, { role: 'assistant', content: reply }]);
    } catch (e: any) {
      console.error('AI Chat Error:', e);
      const rawMessage = String(e?.message || '');
      const errorMsg = rawMessage.includes('API key')
        ? 'Please configure your AI API key in Settings to use this feature.'
        : rawMessage.includes('(402)') || rawMessage.includes('"code":402')
        ? 'AI request failed due to insufficient OpenRouter credits (or token budget). Reduce usage or add credits in OpenRouter settings.'
        : rawMessage.toLowerCase().includes('rate limit')
        ? 'Too many requests. Please wait a moment and try again.'
        : `Sorry, I couldn\'t process that request. Please try again.`;
      
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
  }, [input, loading, messages, contextPromise]);

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
  inputContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 34, // Extra padding for safe area
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
});

export default AIAccountantPanel;
