export type ContentCategory = 'All' | 'Investment' | 'Financial Literacy' | 'Personal Development' | 'Cash Flow' | 'Podcasts';
export type MediaType = 'video' | 'audio';
export type Platform = 'youtube' | 'spotify' | 'books';

export interface ExploreContent {
    id: string;
    title: string;
    channelName: string;
    contentId: string; // videoId or episodeId
    category: Exclude<ContentCategory, 'All'>;
    type: MediaType;
    platform: Platform;
    tags: string[];
    description?: string;
}

// Helper to get thumbnail/image URLs
export function getThumbnailUrl(item: ExploreContent): string {
    if (item.platform === 'youtube') {
        return `https://img.youtube.com/vi/${item.contentId}/mqdefault.jpg`;
    }
    // For Spotify/Books, we'll use placeholder images or specific cover art if we had them.
    // To ensure no copyright issues, let's use a safe gradient placeholder service (ui-avatars) or simple colored boxes
    const placeholders: Record<string, string> = {
        'Investment': 'https://ui-avatars.com/api/?name=Investment&background=0D8ABC&color=fff&size=400&font-size=0.33',
        'Financial Literacy': 'https://ui-avatars.com/api/?name=Financial+Literacy&background=8E44AD&color=fff&size=400&font-size=0.25',
        'Personal Development': 'https://ui-avatars.com/api/?name=Personal+Development&background=F39C12&color=fff&size=400&font-size=0.25',
        'Cash Flow': 'https://ui-avatars.com/api/?name=Cash+Flow&background=27AE60&color=fff&size=400&font-size=0.33',
        'Podcasts': 'https://ui-avatars.com/api/?name=Podcasts&background=D35400&color=fff&size=400&font-size=0.33',
    };
    return placeholders[item.category] || placeholders['Podcasts'];
}

export const CATEGORIES: ContentCategory[] = [
    'All',
    'Investment',
    'Financial Literacy',
    'Personal Development',
    'Cash Flow',
    'Podcasts',
];

export const exploreContent: ExploreContent[] = [
    // ── Investment ──────────────────────────────────────────
    {
        id: '1',
        title: 'How The Stock Market Works',
        channelName: 'The Plain Bagel',
        contentId: 'p7HKvqRI_Bo',
        category: 'Investment',
        type: 'video',
        platform: 'youtube',
        tags: ['investing-basics', 'wealth-building', 'compound-interest'],
    },
    {
        id: '2',
        title: 'Warren Buffett: How to Invest for Beginners',
        channelName: 'New Money',
        contentId: 'gFQNPmLKj1k',
        category: 'Investment',
        type: 'video',
        platform: 'youtube',
        tags: ['investing-basics', 'wealth-building', 'long-term-growth'],
    },
    {
        id: '3',
        title: 'How to Build Wealth With Real Estate',
        channelName: 'Graham Stephan',
        contentId: 'WEDIj9JBTC8',
        category: 'Investment',
        type: 'video',
        platform: 'youtube',
        tags: ['wealth-building', 'passive-income', 'real-estate'],
    },

    // ── Financial Literacy ──────────────────────────────────
    {
        id: '6',
        title: 'The Psychology of Money - Morgan Housel',
        channelName: 'Swedish Investor',
        contentId: 'TJDcGv5MOaY',
        category: 'Financial Literacy',
        type: 'video',
        platform: 'youtube',
        tags: ['financial-literacy', 'mindset', 'spending-awareness'],
    },
    {
        id: '7',
        title: 'How to Budget Your Money - 50/30/20 Rule',
        channelName: 'Nischa',
        contentId: 'HQzoZfc3GwQ',
        category: 'Financial Literacy',
        type: 'video',
        platform: 'youtube',
        tags: ['budgeting', 'saving', 'financial-discipline'],
    },

    // ── Podcasts (New) ──────────────────────────────────────
    {
        id: 'p1',
        title: 'The Psychology of Money',
        channelName: 'The Diary Of A CEO with Steven Bartlett',
        contentId: '3uY38LpXh1uD3fXn5W6Z6V', // Spotify episode ID
        category: 'Podcasts',
        type: 'audio',
        platform: 'spotify',
        tags: ['mindset', 'financial-literacy', 'wealth-building'],
    },
    {
        id: 'p2',
        title: 'How to master your cashflow',
        channelName: 'The Money Show',
        contentId: '4y8L0O4G9P7S3k2m1n0o8p', // Spotify ID (placeholder)
        category: 'Podcasts',
        type: 'audio',
        platform: 'spotify',
        tags: ['spending-awareness', 'cash-flow', 'budgeting'],
    },
    // ── Books (New) ─────────────────────────────────────────
    {
        id: 'b1',
        title: 'The Psychology of Money',
        channelName: 'Morgan Housel',
        contentId: 'psychology-of-money',
        category: 'Financial Literacy',
        type: 'audio',
        platform: 'books',
        tags: ['mindset', 'wealth-building', 'financial-literacy'],
        description: "Doing well with money isn't necessarily about what you know. It's about how you behave. And behavior is hard to teach, even to really smart people.\n\nMoney—investing, personal finance, and business decisions—is typically taught as a math-based field, where data and formulas tell us exactly what to do. But in the real world people don't make financial decisions on a spreadsheet. They make them at the dinner table, or in a meeting room, where personal history, your own unique view of the world, ego, pride, marketing, and odd incentives are scrambled together.\n\nIn The Psychology of Money, award-winning author Morgan Housel shares 19 short stories exploring the strange ways people think about money and teaches you how to make better sense of one of life's most important topics.",
    },
    {
        id: 'b2',
        title: 'Rich Dad Poor Dad',
        channelName: 'Robert T. Kiyosaki',
        contentId: 'rich-dad-poor-dad',
        category: 'Cash Flow',
        type: 'audio',
        platform: 'books',
        tags: ['cash-flow', 'wealth-building', 'financial-literacy'],
        description: "Rich Dad Poor Dad is Robert's story of growing up with two dads — his real father and the father of his best friend, his rich dad — and the ways in which both men shaped his thoughts about money and investing.\n\nThe book explodes the myth that you need to earn a high income to be rich and explains the difference between working for money and having your money work for you. It covers the crucial differences between building assets vs accumulating liabilities.",
    },
    {
        id: 'b3',
        title: 'Atomic Habits',
        channelName: 'James Clear',
        contentId: 'atomic-habits',
        category: 'Personal Development',
        type: 'audio',
        platform: 'books',
        tags: ['mindset', 'habits', 'discipline'],
        description: "No matter your goals, Atomic Habits offers a proven framework for improving--every day. James Clear, one of the world's leading experts on habit formation, reveals practical strategies that will teach you exactly how to form good habits, break bad ones, and master the tiny behaviors that lead to remarkable results.\n\nIf you're having trouble changing your habits, the problem isn't you. The problem is your system. Bad habits repeat themselves again and again not because you don't want to change, but because you have the wrong system for change.",
    },
    {
        id: 'b4',
        title: 'The Intelligent Investor',
        channelName: 'Benjamin Graham',
        contentId: 'intelligent-investor',
        category: 'Investment',
        type: 'audio',
        platform: 'books',
        tags: ['investing', 'stocks', 'long-term-growth'],
        description: "The greatest investment advisor of the twentieth century, Benjamin Graham, taught and inspired people worldwide. Graham's philosophy of \"value investing\"—which shields investors from substantial error and teaches them to develop long-term strategies—has made The Intelligent Investor the stock market bible ever since its original publication in 1949.\n\nVital and indispensable, this book is arguably the most important book you will ever read on how to reach your financial goals.",
    },
    {
        id: 'b5',
        title: 'The Total Money Makeover',
        channelName: 'Dave Ramsey',
        contentId: 'total-money-makeover',
        category: 'Cash Flow',
        type: 'audio',
        platform: 'books',
        tags: ['budgeting', 'debt-free', 'financial-discipline'],
        description: "A comprehensive plan for getting out of debt and achieving financial health. Dave Ramsey explodes the many myths of money (exposing the dangers of cash advances, rent-to-own, debt consolidation) and attacks the illusions and downright deceptions of the American dream, which encourages nothing but overspending and massive amounts of debt.\n\n\"Don't even consider keeping up with the Joneses,\" Ramsey declares in his typically candid style. \"They're broke!\"",
    },

    // ── Personal Development ────────────────────────────────
    {
        id: '11',
        title: 'Atomic Habits - Tiny Changes, Remarkable Results',
        channelName: 'Escaping Ordinary',
        contentId: 'PZ7lDrwYdZc',
        category: 'Personal Development',
        type: 'video',
        platform: 'youtube',
        tags: ['mindset', 'financial-discipline', 'habits'],
    },
    {
        id: '12',
        title: 'How to Be More Disciplined',
        channelName: 'Better Ideas',
        contentId: '75d_29QWELk',
        category: 'Personal Development',
        type: 'video',
        platform: 'youtube',
        tags: ['financial-discipline', 'mindset', 'habits'],
    },

    // ── Cash Flow ───────────────────────────────────────────
    {
        id: '16',
        title: 'Rich Dad Poor Dad - Robert Kiyosaki',
        channelName: 'The Swedish Investor',
        contentId: 'TcNpoc-lF0M',
        category: 'Cash Flow',
        type: 'video',
        platform: 'youtube',
        tags: ['financial-literacy', 'wealth-building', 'passive-income'],
    },
    {
        id: '17',
        title: '7 Passive Income Ideas That Actually Work',
        channelName: 'Ali Abdaal',
        contentId: 'M5y7w_cFiiE',
        category: 'Cash Flow',
        type: 'video',
        platform: 'youtube',
        tags: ['passive-income', 'side-hustle', 'wealth-building'],
    },
];
