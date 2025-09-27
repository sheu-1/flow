import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, SafeAreaView } from 'react-native';
import Animated, { FadeInUp, FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../theme/ThemeProvider';
import { AggregatePeriod } from '../types';
import { chat as llmChat, ChatMessage } from '../services/LLM';
import { buildFinancialContext } from '../services/RAG';

interface Props {
  userId: string;
  period: AggregatePeriod;
}

export const AIAccountantPanel: React.FC<Props> = ({ userId, period }) => {
  const colors = useThemeColors();
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: 'Hi! I\'m your AI accountant. Ask me about your spending trends, budgeting ideas, or how to reach your savings goals.' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const contextPromise = useMemo(() => buildFinancialContext(userId, period), [userId, period]);

  useEffect(() => {
    // scroll to bottom when messages change
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg: ChatMessage = { role: 'user', content: input.trim() };
    setMessages((m) => [...m, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const context = await contextPromise;
      const reply = await llmChat([...messages, userMsg], context);
      setMessages((m) => [...m, { role: 'assistant', content: reply }]);
    } catch (e: any) {
      setMessages((m) => [...m, { role: 'assistant', content: `Sorry, I couldn\'t complete that request: ${e?.message || e}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={styles.keyboardView}
      >
        {/* Chat Messages */}
        <ScrollView
          ref={scrollRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map((message, index) => (
            <Animated.View
              key={index}
              entering={FadeInUp.delay(index * 100).springify()}
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
                    [styles.userText, { color: colors.background }] : 
                    [styles.assistantText, { color: colors.text }]
                ]}>
                  {message.content}
                </Text>
              </View>
            </Animated.View>
          ))}
          
          {loading && (
            <Animated.View 
              entering={FadeIn}
              style={styles.loadingWrapper}
            >
              <View style={[styles.loadingBubble, { backgroundColor: colors.surface }]}>
                <ActivityIndicator color={colors.primary} size="small" />
                <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Thinking…</Text>
              </View>
            </Animated.View>
          )}
        </ScrollView>

        {/* Input Bar */}
        <View style={styles.inputContainer}>
          <View style={[styles.inputBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TouchableOpacity style={styles.iconButton}>
              <Ionicons name="mic" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            
            <TextInput
              placeholder="Ask your accountant anything…"
              placeholderTextColor={colors.textMuted}
              style={[styles.textInput, { color: colors.text }]}
              value={input}
              onChangeText={setInput}
              multiline
              maxLength={500}
            />
            
            <TouchableOpacity style={styles.iconButton}>
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
    maxHeight: 100,
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
