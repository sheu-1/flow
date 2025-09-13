import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
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
  const [debugOpen, setDebugOpen] = useState(false);
  const [resolvedContext, setResolvedContext] = useState<string>('');

  const contextPromise = useMemo(() => buildFinancialContext(userId, period), [userId, period]);

  useEffect(() => {
    // scroll to bottom when messages change
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const ctx = await contextPromise;
        if (!cancelled) setResolvedContext(ctx);
      } catch (e) {
        if (!cancelled) setResolvedContext(`(Failed to build context: ${String(e)})`);
      }
    })();
    return () => { cancelled = true; };
  }, [contextPromise]);

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
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>AI Accountant</Text>
        <ScrollView
          ref={scrollRef}
          style={styles.messages}
          contentContainerStyle={{ paddingVertical: 8 }}
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map((m, idx) => (
            <View key={idx} style={[styles.bubble, m.role === 'user' ? styles.userBubble : styles.assistantBubble, { backgroundColor: m.role === 'user' ? colors.primary : colors.surface }]}>
              <Text style={{ color: m.role === 'user' ? '#fff' : colors.text }}>{m.content}</Text>
            </View>
          ))}
          {loading && (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={colors.primary} />
              <Text style={{ color: colors.textSecondary, marginLeft: 8 }}>Thinking…</Text>
            </View>
          )}
        </ScrollView>
        <TouchableOpacity onPress={() => setDebugOpen(!debugOpen)} style={[styles.debugToggle, { borderTopColor: colors.border }]}> 
          <Text style={{ color: colors.textSecondary }}>{debugOpen ? 'Hide context' : 'Show context'}</Text>
        </TouchableOpacity>
        {debugOpen && (
          <View style={[styles.contextBox, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
            <ScrollView style={{ maxHeight: 160 }} nestedScrollEnabled>
              <Text style={{ color: colors.textSecondary, fontSize: 12, lineHeight: 16 }}>{resolvedContext}</Text>
            </ScrollView>
          </View>
        )}
        <View style={[styles.inputRow, { borderTopColor: colors.border }]}> 
          <TextInput
            placeholder="Ask about your spending, savings, or budget…"
            placeholderTextColor={colors.textSecondary}
            style={[styles.input, { color: colors.text }]}
            value={input}
            onChangeText={setInput}
            multiline
          />
          <TouchableOpacity onPress={send} style={[styles.sendBtn, { backgroundColor: colors.primary }]} disabled={loading}>
            <Text style={styles.sendText}>Send</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  messages: {
    height: 260,
    paddingHorizontal: 12,
  },
  bubble: {
    borderRadius: 12,
    padding: 10,
    marginVertical: 4,
    maxWidth: '85%',
  },
  userBubble: {
    alignSelf: 'flex-end',
  },
  assistantBubble: {
    alignSelf: 'flex-start',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    padding: 8,
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    padding: 8,
  },
  sendBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  sendText: {
    color: '#fff',
    fontWeight: '700',
  },
  debugToggle: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  contextBox: {
    borderWidth: 1,
    borderRadius: 8,
    marginHorizontal: 12,
    marginBottom: 8,
    padding: 8,
  },
});

export default AIAccountantPanel;
