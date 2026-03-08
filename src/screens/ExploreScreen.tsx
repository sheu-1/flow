import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Image,
    FlatList,
    Dimensions,
    Modal,
    ActivityIndicator,
    Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp, FadeInDown, FadeInRight } from 'react-native-reanimated';
import { WebView } from 'react-native-webview';
import { useThemeColors } from '../theme/ThemeProvider';
import { spacing, borderRadius, fontSize } from '../theme/colors';
import {
    exploreContent,
    ExploreContent,
    ContentCategory,
    CATEGORIES,
    Platform,
    getThumbnailUrl,
} from '../data/exploreVideos';
import { getRecommendedContent, RecommendedContent } from '../services/VideoRecommendationService';
import { useAuth } from '../hooks/useAuth';
import { useTabScroll } from '../contexts/TabScrollContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_MARGIN = spacing.md;
const CARD_WIDTH = SCREEN_WIDTH - CARD_MARGIN * 2;
const THUMBNAIL_HEIGHT = (CARD_WIDTH * 9) / 16;

// Horizontal recommendation card dimensions
const REC_CARD_WIDTH = SCREEN_WIDTH * 0.7;
const REC_THUMB_HEIGHT = (REC_CARD_WIDTH * 9) / 16;

const CATEGORY_ICONS: Record<ContentCategory, keyof typeof Ionicons.glyphMap> = {
    All: 'apps-outline',
    Investment: 'trending-up-outline',
    'Financial Literacy': 'book-outline',
    'Personal Development': 'rocket-outline',
    'Cash Flow': 'cash-outline',
    Podcasts: 'mic-outline',
};

const PLATFORM_ICONS: Record<Platform, { name: keyof typeof Ionicons.glyphMap; color: string; label: string }> = {
    youtube: { name: 'logo-youtube', color: '#FF0000', label: 'YouTube' },
    spotify: { name: 'musical-notes-outline', color: '#1DB954', label: 'Spotify' },
    books: { name: 'book-outline', color: '#8E44AD', label: 'Books' },
};

export default function ExploreScreen() {
    const colors = useThemeColors();
    const { user } = useAuth();
    const { onScroll } = useTabScroll();
    const [selectedCategory, setSelectedCategory] = useState<ContentCategory>('All');
    const [selectedPlatform, setSelectedPlatform] = useState<Platform>('youtube');
    const [activeItem, setActiveItem] = useState<ExploreContent | null>(null);

    // ── Recommendations state ──────────────────────────
    const [recommended, setRecommended] = useState<RecommendedContent[]>([]);
    const [insight, setInsight] = useState('');
    const [recLoading, setRecLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            if (!user?.id) {
                setRecLoading(false);
                return;
            }
            try {
                const result = await getRecommendedContent(user.id);
                if (!cancelled) {
                    setRecommended(result.content);
                    setInsight(result.insight);
                }
            } catch (e) {
                console.warn('[Explore] Recommendation error:', e);
            } finally {
                if (!cancelled) setRecLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [user?.id]);

    const filteredContent = useMemo(() => {
        let items = exploreContent.filter((v) => v.platform === selectedPlatform);
        if (selectedCategory !== 'All') {
            items = items.filter((v) => v.category === selectedCategory);
        }
        return items;
    }, [selectedCategory, selectedPlatform]);

    // ── Renders ────────────────────────────────────────

    const renderCategoryChip = useCallback(
        (category: ContentCategory) => {
            const isActive = selectedCategory === category;
            return (
                <TouchableOpacity
                    key={category}
                    onPress={() => setSelectedCategory(category)}
                    activeOpacity={0.7}
                    style={[
                        styles.chip,
                        {
                            backgroundColor: isActive ? colors.primary : colors.surface,
                            borderColor: isActive ? colors.primary : colors.border,
                        },
                    ]}
                >
                    <Ionicons
                        name={CATEGORY_ICONS[category]}
                        size={16}
                        color={isActive ? '#FFF' : colors.textSecondary}
                        style={{ marginRight: 6 }}
                    />
                    <Text
                        style={[
                            styles.chipText,
                            { color: isActive ? '#FFF' : colors.textSecondary },
                        ]}
                    >
                        {category}
                    </Text>
                </TouchableOpacity>
            );
        },
        [selectedCategory, colors],
    );

    const renderContentCard = useCallback(
        ({ item, index }: { item: ExploreContent; index: number }) => (
            <Animated.View entering={FadeInUp.delay(index * 60).springify()}>
                <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => setActiveItem(item)}
                    style={[
                        styles.card,
                        {
                            backgroundColor: colors.surface,
                            borderColor: colors.border,
                        },
                    ]}
                >
                    <View style={styles.thumbnailWrapper}>
                        <Image
                            source={{ uri: getThumbnailUrl(item) }}
                            style={styles.thumbnail}
                            resizeMode="cover"
                        />
                        {item.platform !== 'books' && (
                            <View style={styles.playOverlay}>
                                <View style={styles.playButton}>
                                    <Ionicons name={item.type === 'video' ? 'play' : 'mic'} size={28} color="#FFF" />
                                </View>
                            </View>
                        )}
                        <View
                            style={[styles.categoryBadge, { backgroundColor: colors.primary + 'DD' }]}
                        >
                            <Text style={styles.categoryBadgeText}>{item.category}</Text>
                        </View>
                    </View>
                    <View style={styles.cardInfo}>
                        <Text
                            style={[styles.cardTitle, { color: colors.text }]}
                            numberOfLines={2}
                        >
                            {item.title}
                        </Text>
                        <View style={styles.channelRow}>
                            <Ionicons
                                name={PLATFORM_ICONS[item.platform].name}
                                size={14}
                                color={PLATFORM_ICONS[item.platform].color}
                                style={{ marginRight: 6 }}
                            />
                            <Text
                                style={[styles.channelName, { color: colors.textSecondary }]}
                                numberOfLines={1}
                            >
                                {item.channelName}
                            </Text>
                        </View>
                    </View>
                </TouchableOpacity>
            </Animated.View>
        ),
        [colors],
    );

    // ── Recommended For You header rendered inside FlatList ──

    const ListHeader = useMemo(() => {
        // Only show Recommendations on YouTube tab
        if (selectedPlatform !== 'youtube') return null;
        // Don't show if still loading, no user, or no results
        if (recLoading || recommended.length === 0) return null;

        return (
            <Animated.View entering={FadeInDown.delay(80).springify()}>
                {/* Section Header */}
                <View style={styles.recHeader}>
                    <View style={styles.recHeaderLeft}>
                        <Ionicons name="sparkles" size={20} color="#F59E0B" />
                        <Text style={[styles.recTitle, { color: colors.text }]}>
                            Recommended For You
                        </Text>
                    </View>
                </View>

                {/* Insight line */}
                {insight ? (
                    <Text style={[styles.recInsight, { color: colors.textSecondary }]}>
                        {insight}
                    </Text>
                ) : null}

                {/* Horizontal card row */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.recList}
                    decelerationRate="fast"
                    snapToInterval={REC_CARD_WIDTH + spacing.sm}
                >
                    {recommended.map((item, index) => (
                        <Animated.View
                            key={item.id}
                            entering={FadeInRight.delay(index * 80).springify()}
                        >
                            <TouchableOpacity
                                activeOpacity={0.85}
                                onPress={() => setActiveItem(item)}
                                style={[
                                    styles.recCard,
                                    {
                                        backgroundColor: colors.surface,
                                        borderColor: colors.primary + '40',
                                    },
                                ]}
                            >
                                <View style={styles.recThumbWrapper}>
                                    <Image
                                        source={{ uri: getThumbnailUrl(item) }}
                                        style={styles.recThumb}
                                        resizeMode="cover"
                                    />
                                    <View style={styles.playOverlay}>
                                        <View style={styles.recPlayBtn}>
                                            <Ionicons name={item.type === 'video' ? 'play' : 'mic'} size={22} color="#FFF" />
                                        </View>
                                    </View>
                                    {/* Relevance sparkle badge */}
                                    <View style={[styles.recBadge, { backgroundColor: '#F59E0B' }]}>
                                        <Ionicons name="sparkles" size={10} color="#FFF" style={{ marginRight: 3 }} />
                                        <Text style={styles.recBadgeText}>For You</Text>
                                    </View>
                                </View>
                                <View style={styles.recInfo}>
                                    <Text
                                        style={[styles.recCardTitle, { color: colors.text }]}
                                        numberOfLines={2}
                                    >
                                        {item.title}
                                    </Text>
                                    <View style={styles.channelRow}>
                                        <Ionicons
                                            name={PLATFORM_ICONS[item.platform].name}
                                            size={10}
                                            color={PLATFORM_ICONS[item.platform].color}
                                            style={{ marginRight: 4 }}
                                        />
                                        <Text
                                            style={[styles.recChannel, { color: colors.textMuted }]}
                                            numberOfLines={1}
                                        >
                                            {item.channelName}
                                        </Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        </Animated.View>
                    ))}
                </ScrollView>

                {/* Divider */}
                <View style={[styles.recDivider, { backgroundColor: colors.border }]} />
            </Animated.View>
        );
    }, [recLoading, recommended, insight, colors, selectedPlatform]);

    const getEmbedUrl = (item: ExploreContent) => {
        switch (item.platform) {
            case 'youtube':
                return `https://www.youtube.com/watch?v=${item.contentId}`;
            case 'spotify':
                return `https://open.spotify.com/embed/episode/${item.contentId}`;
            case 'books':
                return `https://books.google.com/books?id=${item.contentId}`;
            default:
                return '';
        }
    };

    const getPlatformUrl = (item: ExploreContent) => {
        switch (item.platform) {
            case 'youtube':
                return `https://www.youtube.com/watch?v=${item.contentId}`;
            case 'spotify':
                return `https://open.spotify.com/episode/${item.contentId}`;
            case 'books':
                return `https://books.google.com/books?id=${item.contentId}`;
            default:
                return '';
        }
    };

    return (
        <SafeAreaView
            style={[styles.container, { backgroundColor: colors.background }]}
            edges={['top']}
        >
            {/* ── Header ────────────────────────────────────── */}
            <Animated.View
                style={[styles.header, { backgroundColor: colors.background }]}
                entering={FadeInUp.springify()}
            >
                <View style={styles.headerContent}>
                    <Ionicons name="compass" size={28} color={colors.primary} />
                    <View style={styles.headerTextContainer}>
                        <Text style={[styles.headerTitle, { color: colors.text }]}>
                            Explore
                        </Text>
                        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                            Learn · Grow · Prosper
                        </Text>
                    </View>
                </View>
            </Animated.View>

            {/* ── Platform Tabs ────────────────────────────── */}
            <View style={[styles.platformTabsContainer, { borderBottomColor: colors.border }]}>
                {(['youtube', 'spotify', 'books'] as Platform[]).map(platform => {
                    const isActive = selectedPlatform === platform;
                    const config = PLATFORM_ICONS[platform];
                    return (
                        <TouchableOpacity
                            key={platform}
                            activeOpacity={0.7}
                            onPress={() => {
                                setSelectedPlatform(platform);
                                setSelectedCategory('All'); // Reset category when switching platforms
                            }}
                            style={[
                                styles.platformTab,
                                isActive && { borderBottomColor: config.color }
                            ]}
                        >
                            <Ionicons
                                name={config.name}
                                size={20}
                                color={isActive ? config.color : colors.textMuted}
                                style={{ marginBottom: 4 }}
                            />
                            <Text style={[
                                styles.platformTabText,
                                { color: isActive ? colors.text : colors.textMuted },
                                isActive && { fontWeight: '600' }
                            ]}>
                                {config.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* ── Category Chips ────────────────────────────── */}
            <Animated.View entering={FadeInDown.delay(50).springify()}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.chipContainer}
                >
                    {CATEGORIES.map(renderCategoryChip)}
                </ScrollView>
            </Animated.View>

            {/* ── Content List (with Rec header) ──────────────── */}
            <Animated.FlatList
                data={filteredContent}
                keyExtractor={(item) => item.id}
                renderItem={renderContentCard}
                ListHeaderComponent={ListHeader}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                onScroll={onScroll}
                scrollEventThrottle={16}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="videocam-off-outline" size={48} color={colors.textMuted} />
                        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                            No content in this category
                        </Text>
                    </View>
                }
            />

            {/* ── Player Modal ────────────────────────── */}
            <Modal
                visible={!!activeItem}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setActiveItem(null)}
            >
                <SafeAreaView
                    style={[styles.modalContainer, { backgroundColor: colors.background }]}
                    edges={['top']}
                >
                    <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                        <TouchableOpacity
                            onPress={() => setActiveItem(null)}
                            style={styles.modalClose}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <Ionicons name="close" size={28} color={colors.text} />
                        </TouchableOpacity>
                        <Text
                            style={[styles.modalTitle, { color: colors.text }]}
                            numberOfLines={1}
                        >
                            {activeItem?.title}
                        </Text>
                        <View style={{ width: 28 }} />
                    </View>

                    {activeItem && (
                        <View style={{ flex: 1 }}>
                            {activeItem.platform === 'books' ? (
                                <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
                                    <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: spacing.md }}>
                                        Book Summary
                                    </Text>
                                    <Text style={{ fontSize: 16, lineHeight: 26, color: colors.textSecondary }}>
                                        {activeItem.description || "No summary available for this book."}
                                    </Text>
                                </ScrollView>
                            ) : (
                                <>
                                    <WebView
                                        source={{
                                            uri: getEmbedUrl(activeItem),
                                        }}
                                        style={styles.webview}
                                        allowsFullscreenVideo
                                        javaScriptEnabled
                                        domStorageEnabled
                                        mediaPlaybackRequiresUserAction={false}
                                        userAgent="Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
                                    />
                                    {/* External platform link button */}
                                    <TouchableOpacity
                                        style={[styles.openYoutubeBtn, { backgroundColor: PLATFORM_ICONS[activeItem.platform].color }]}
                                        onPress={() => Linking.openURL(getPlatformUrl(activeItem))}
                                        activeOpacity={0.8}
                                    >
                                        <Ionicons name={PLATFORM_ICONS[activeItem.platform].name} size={20} color="#FFF" style={{ marginRight: 8 }} />
                                        <Text style={styles.openYoutubeBtnText}>
                                            Open in {activeItem.platform.charAt(0).toUpperCase() + activeItem.platform.slice(1)}
                                        </Text>
                                    </TouchableOpacity>
                                </>
                            )}
                        </View>
                    )}
                </SafeAreaView>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    platformTabsContainer: {
        flexDirection: 'row',
        paddingHorizontal: spacing.md,
        borderBottomWidth: 1,
        marginBottom: spacing.sm,
    },
    platformTab: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: spacing.md,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    platformTabText: {
        fontSize: 13,
        marginTop: 2,
    },

    // ── Header ──────────────────────────────────────────
    header: {
        paddingHorizontal: spacing.md,
        paddingTop: spacing.md,
        paddingBottom: spacing.xs,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerTextContainer: {
        marginLeft: 12,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '700',
    },
    headerSubtitle: {
        fontSize: 13,
        marginTop: 2,
    },

    // ── Chips ───────────────────────────────────────────
    chipContainer: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        gap: 8,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        marginRight: 4,
    },
    chipText: {
        fontSize: 13,
        fontWeight: '600',
    },

    // ── Recommended For You ─────────────────────────────
    recHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: spacing.sm,
        marginBottom: 4,
    },
    recHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    recTitle: {
        fontSize: 17,
        fontWeight: '700',
    },
    recInsight: {
        fontSize: 12,
        marginBottom: spacing.sm,
        lineHeight: 18,
    },
    recList: {
        paddingBottom: spacing.sm,
        gap: spacing.sm,
    },
    recCard: {
        width: REC_CARD_WIDTH,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        overflow: 'hidden',
    },
    recThumbWrapper: {
        width: '100%',
        height: REC_THUMB_HEIGHT,
        position: 'relative',
    },
    recThumb: {
        width: '100%',
        height: '100%',
    },
    recPlayBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(0,0,0,0.55)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingLeft: 3,
    },
    recBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    recBadgeText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: '700',
    },
    recInfo: {
        padding: spacing.sm,
    },
    recCardTitle: {
        fontSize: 14,
        fontWeight: '600',
        lineHeight: 20,
        marginBottom: 4,
    },
    recChannel: {
        fontSize: 11,
        fontWeight: '500',
    },
    recDivider: {
        height: 1,
        marginVertical: spacing.sm,
    },

    // ── Video Cards ─────────────────────────────────────
    listContent: {
        paddingHorizontal: CARD_MARGIN,
        paddingBottom: 100,
        paddingTop: 4,
    },
    card: {
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        overflow: 'hidden',
        marginBottom: spacing.md,
    },
    thumbnailWrapper: {
        width: '100%',
        height: THUMBNAIL_HEIGHT,
        position: 'relative',
    },
    thumbnail: {
        width: '100%',
        height: '100%',
    },
    playOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.25)',
    },
    playButton: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingLeft: 4,
    },
    categoryBadge: {
        position: 'absolute',
        top: 10,
        left: 10,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    categoryBadgeText: {
        color: '#FFF',
        fontSize: 11,
        fontWeight: '700',
    },

    cardInfo: {
        padding: spacing.sm + 4,
    },
    cardTitle: {
        fontSize: fontSize.md,
        fontWeight: '600',
        lineHeight: 22,
        marginBottom: 6,
    },
    channelRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    channelName: {
        fontSize: fontSize.xs,
        fontWeight: '500',
    },

    // ── Empty State ─────────────────────────────────────
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 80,
    },
    emptyText: {
        fontSize: fontSize.sm,
        marginTop: 12,
    },

    // ── Modal ───────────────────────────────────────────
    modalContainer: {
        flex: 1,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    modalClose: {
        padding: 4,
    },
    modalTitle: {
        flex: 1,
        textAlign: 'center',
        fontSize: fontSize.md,
        fontWeight: '600',
        marginHorizontal: 8,
    },
    webview: {
        flex: 1,
    },
    openYoutubeBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        paddingHorizontal: 24,
        marginHorizontal: spacing.md,
        marginVertical: spacing.sm,
        borderRadius: borderRadius.md,
    },
    openYoutubeBtnText: {
        color: '#FFF',
        fontSize: 15,
        fontWeight: '700',
    },
});
