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
    exploreVideos,
    ExploreVideo,
    VideoCategory,
    CATEGORIES,
    getThumbnailUrl,
} from '../data/exploreVideos';
import { getRecommendedVideos, RecommendedVideo } from '../services/VideoRecommendationService';
import { useAuth } from '../hooks/useAuth';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_MARGIN = spacing.md;
const CARD_WIDTH = SCREEN_WIDTH - CARD_MARGIN * 2;
const THUMBNAIL_HEIGHT = (CARD_WIDTH * 9) / 16;

// Horizontal recommendation card dimensions
const REC_CARD_WIDTH = SCREEN_WIDTH * 0.7;
const REC_THUMB_HEIGHT = (REC_CARD_WIDTH * 9) / 16;

const CATEGORY_ICONS: Record<VideoCategory, keyof typeof Ionicons.glyphMap> = {
    All: 'apps-outline',
    Investment: 'trending-up-outline',
    'Financial Literacy': 'book-outline',
    'Personal Development': 'rocket-outline',
    'Cash Flow': 'cash-outline',
};

export default function ExploreScreen() {
    const colors = useThemeColors();
    const { user } = useAuth();
    const [selectedCategory, setSelectedCategory] = useState<VideoCategory>('All');
    const [activeVideo, setActiveVideo] = useState<ExploreVideo | null>(null);

    // ── Recommendations state ──────────────────────────
    const [recommended, setRecommended] = useState<RecommendedVideo[]>([]);
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
                const result = await getRecommendedVideos(user.id);
                if (!cancelled) {
                    setRecommended(result.videos);
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

    const filteredVideos = useMemo(() => {
        if (selectedCategory === 'All') return exploreVideos;
        return exploreVideos.filter((v) => v.category === selectedCategory);
    }, [selectedCategory]);

    // ── Renders ────────────────────────────────────────

    const renderCategoryChip = useCallback(
        (category: VideoCategory) => {
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

    const renderVideoCard = useCallback(
        ({ item, index }: { item: ExploreVideo; index: number }) => (
            <Animated.View entering={FadeInUp.delay(index * 60).springify()}>
                <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => setActiveVideo(item)}
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
                            source={{ uri: getThumbnailUrl(item.videoId) }}
                            style={styles.thumbnail}
                            resizeMode="cover"
                        />
                        <View style={styles.playOverlay}>
                            <View style={styles.playButton}>
                                <Ionicons name="play" size={28} color="#FFF" />
                            </View>
                        </View>
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
                                name="logo-youtube"
                                size={14}
                                color="#FF0000"
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
                                onPress={() => setActiveVideo(item)}
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
                                        source={{ uri: getThumbnailUrl(item.videoId) }}
                                        style={styles.recThumb}
                                        resizeMode="cover"
                                    />
                                    <View style={styles.playOverlay}>
                                        <View style={styles.recPlayBtn}>
                                            <Ionicons name="play" size={22} color="#FFF" />
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
                                    <Text
                                        style={[styles.recChannel, { color: colors.textMuted }]}
                                        numberOfLines={1}
                                    >
                                        {item.channelName}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        </Animated.View>
                    ))}
                </ScrollView>

                {/* Divider */}
                <View style={[styles.recDivider, { backgroundColor: colors.border }]} />
            </Animated.View>
        );
    }, [recLoading, recommended, insight, colors]);

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

            {/* ── Category Chips ────────────────────────────── */}
            <Animated.View entering={FadeInDown.delay(100).springify()}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.chipContainer}
                >
                    {CATEGORIES.map(renderCategoryChip)}
                </ScrollView>
            </Animated.View>

            {/* ── Video List (with Rec header) ──────────────── */}
            <FlatList
                data={filteredVideos}
                keyExtractor={(item) => item.id}
                renderItem={renderVideoCard}
                ListHeaderComponent={ListHeader}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="videocam-off-outline" size={48} color={colors.textMuted} />
                        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                            No videos in this category
                        </Text>
                    </View>
                }
            />

            {/* ── Video Player Modal ────────────────────────── */}
            <Modal
                visible={!!activeVideo}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setActiveVideo(null)}
            >
                <SafeAreaView
                    style={[styles.modalContainer, { backgroundColor: colors.background }]}
                    edges={['top']}
                >
                    <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                        <TouchableOpacity
                            onPress={() => setActiveVideo(null)}
                            style={styles.modalClose}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <Ionicons name="close" size={28} color={colors.text} />
                        </TouchableOpacity>
                        <Text
                            style={[styles.modalTitle, { color: colors.text }]}
                            numberOfLines={1}
                        >
                            {activeVideo?.title}
                        </Text>
                        <View style={{ width: 28 }} />
                    </View>

                    {activeVideo && (
                        <View style={{ flex: 1 }}>
                            <WebView
                                source={{
                                    uri: `https://www.youtube.com/watch?v=${activeVideo.videoId}`,
                                }}
                                style={styles.webview}
                                allowsFullscreenVideo
                                javaScriptEnabled
                                domStorageEnabled
                                mediaPlaybackRequiresUserAction={false}
                                userAgent="Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
                            />
                            {/* Open in YouTube fallback button */}
                            <TouchableOpacity
                                style={[styles.openYoutubeBtn, { backgroundColor: '#FF0000' }]}
                                onPress={() => Linking.openURL(`https://www.youtube.com/watch?v=${activeVideo.videoId}`)}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="logo-youtube" size={20} color="#FFF" style={{ marginRight: 8 }} />
                                <Text style={styles.openYoutubeBtnText}>Open in YouTube</Text>
                            </TouchableOpacity>
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
