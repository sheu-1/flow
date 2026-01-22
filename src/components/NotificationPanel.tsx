import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../theme/ThemeProvider';
import { notificationService, SpendingNotification } from '../services/NotificationService';
import { spacing, fontSize, borderRadius } from '../theme/colors';

interface NotificationPanelProps {
  visible: boolean;
  onClose: () => void;
}

export default function NotificationPanel({ visible, onClose }: NotificationPanelProps) {
  const colors = useThemeColors();
  const [notifications, setNotifications] = useState<SpendingNotification[]>([]);

  useEffect(() => {
    const unsubscribe = notificationService.addListener(setNotifications);
    setNotifications(notificationService.getNotifications());
    return unsubscribe;
  }, []);

  const handleMarkAsRead = (id: string) => {
    notificationService.markAsRead(id);
  };

  const handleMarkAllAsRead = () => {
    notificationService.markAllAsRead();
  };

  const handleClearAll = () => {
    notificationService.clearAll();
  };

  const getNotificationIcon = (type: SpendingNotification['type']) => {
    switch (type) {
      case 'spending_increase':
        return 'trending-up';
      case 'spending_decrease':
        return 'trending-down';
      case 'income_change':
        return 'cash';
      case 'daily_summary':
        return 'stats-chart';
      default:
        return 'notifications';
    }
  };

  const getNotificationColor = (type: SpendingNotification['type']) => {
    switch (type) {
      case 'spending_increase':
        return colors.danger;
      case 'spending_decrease':
        return colors.success;
      case 'income_change':
        return colors.primary;
      case 'daily_summary':
        return colors.primary; // Or a specific color like deep blue
      default:
        return colors.textSecondary;
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Notifications</Text>
          <View style={styles.headerActions}>
            {notifications.length > 0 && (
              <>
                <TouchableOpacity onPress={handleMarkAllAsRead} style={styles.headerButton}>
                  <Text style={[styles.headerButtonText, { color: colors.primary }]}>Mark All Read</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleClearAll} style={styles.headerButton}>
                  <Text style={[styles.headerButtonText, { color: colors.danger }]}>Clear All</Text>
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Notifications List */}
        <ScrollView style={styles.notificationsList} showsVerticalScrollIndicator={false}>
          {notifications.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="notifications-off" size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
                No notifications yet
              </Text>
              <Text style={[styles.emptyStateSubtext, { color: colors.textMuted }]}>
                We'll notify you about spending changes and financial insights
              </Text>
            </View>
          ) : (
            notifications.map((notification) => (
              <TouchableOpacity
                key={notification.id}
                style={[
                  styles.notificationItem,
                  {
                    backgroundColor: notification.isRead ? colors.background : colors.surface,
                    borderColor: colors.border
                  }
                ]}
                onPress={() => handleMarkAsRead(notification.id)}
              >
                <View style={styles.notificationContent}>
                  <View style={styles.notificationHeader}>
                    <View style={styles.notificationTitleRow}>
                      <Ionicons
                        name={getNotificationIcon(notification.type)}
                        size={20}
                        color={getNotificationColor(notification.type)}
                        style={styles.notificationIcon}
                      />
                      <Text style={[
                        styles.notificationTitle,
                        {
                          color: colors.text,
                          fontWeight: notification.isRead ? '500' : '700'
                        }
                      ]}>
                        {notification.title}
                      </Text>
                      {!notification.isRead && (
                        <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
                      )}
                    </View>
                    <Text style={[styles.notificationTime, { color: colors.textSecondary }]}>
                      {formatTime(notification.timestamp)}
                    </Text>
                  </View>
                  <Text style={[
                    styles.notificationMessage,
                    {
                      color: notification.isRead ? colors.textSecondary : colors.text
                    }
                  ]}>
                    {notification.message}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  headerButtonText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  closeButton: {
    padding: spacing.xs,
  },
  notificationsList: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyStateText: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptyStateSubtext: {
    fontSize: fontSize.sm,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
  notificationItem: {
    borderRadius: borderRadius.md,
    marginVertical: spacing.xs,
    borderWidth: 1,
    overflow: 'hidden',
  },
  notificationContent: {
    padding: spacing.md,
  },
  notificationHeader: {
    marginBottom: spacing.xs,
  },
  notificationTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs / 2,
  },
  notificationIcon: {
    marginRight: spacing.xs,
  },
  notificationTitle: {
    fontSize: fontSize.md,
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: spacing.xs,
  },
  notificationTime: {
    fontSize: fontSize.xs,
    fontWeight: '500',
  },
  notificationMessage: {
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
});
