export type VideoCategory = 'All' | 'Investment' | 'Financial Literacy' | 'Personal Development' | 'Cash Flow';

export interface ExploreVideo {
    id: string;
    title: string;
    channelName: string;
    videoId: string;
    category: Exclude<VideoCategory, 'All'>;
    tags: string[];
}

// YouTube thumbnail helper
export function getThumbnailUrl(videoId: string): string {
    return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
}

export const CATEGORIES: VideoCategory[] = [
    'All',
    'Investment',
    'Financial Literacy',
    'Personal Development',
    'Cash Flow',
];

export const exploreVideos: ExploreVideo[] = [
    // ── Investment ──────────────────────────────────────────
    {
        id: '1',
        title: 'How The Stock Market Works',
        channelName: 'The Plain Bagel',
        videoId: 'p7HKvqRI_Bo',
        category: 'Investment',
        tags: ['investing-basics', 'wealth-building', 'compound-interest'],
    },
    {
        id: '2',
        title: 'Warren Buffett: How to Invest for Beginners',
        channelName: 'New Money',
        videoId: 'gFQNPmLKj1k',
        category: 'Investment',
        tags: ['investing-basics', 'wealth-building', 'long-term-growth'],
    },
    {
        id: '3',
        title: 'How to Build Wealth With Real Estate',
        channelName: 'Graham Stephan',
        videoId: 'WEDIj9JBTC8',
        category: 'Investment',
        tags: ['wealth-building', 'passive-income', 'real-estate'],
    },
    {
        id: '4',
        title: 'Index Funds vs ETFs - What You Need to Know',
        channelName: 'Nate O\'Brien',
        videoId: '3aYQFmMK_ZQ',
        category: 'Investment',
        tags: ['investing-basics', 'wealth-building', 'long-term-growth'],
    },
    {
        id: '5',
        title: 'Compound Interest Explained in One Minute',
        channelName: 'Concerning Reality',
        videoId: 'Rm6UdfRs3gw',
        category: 'Investment',
        tags: ['compound-interest', 'saving', 'investing-basics'],
    },

    // ── Financial Literacy ──────────────────────────────────
    {
        id: '6',
        title: 'The Psychology of Money - Morgan Housel',
        channelName: 'Swedish Investor',
        videoId: 'TJDcGv5MOaY',
        category: 'Financial Literacy',
        tags: ['financial-literacy', 'mindset', 'spending-awareness'],
    },
    {
        id: '7',
        title: 'How to Budget Your Money - 50/30/20 Rule',
        channelName: 'Nischa',
        videoId: 'HQzoZfc3GwQ',
        category: 'Financial Literacy',
        tags: ['budgeting', 'saving', 'financial-discipline'],
    },
    {
        id: '8',
        title: 'How to Get Out of Debt Fast',
        channelName: 'Dave Ramsey',
        videoId: '7pHqJ-zeQL4',
        category: 'Financial Literacy',
        tags: ['debt-freedom', 'financial-discipline', 'budgeting'],
    },
    {
        id: '9',
        title: 'Credit Scores Explained - Everything You Need to Know',
        channelName: 'Two Cents',
        videoId: 'tONKuyMfB14',
        category: 'Financial Literacy',
        tags: ['financial-literacy', 'debt-freedom', 'credit'],
    },
    {
        id: '10',
        title: 'Money Management Tips for Beginners',
        channelName: 'Ali Abdaal',
        videoId: 'idbooHdCxFc',
        category: 'Financial Literacy',
        tags: ['budgeting', 'saving', 'financial-literacy', 'spending-awareness'],
    },

    // ── Personal Development ────────────────────────────────
    {
        id: '11',
        title: 'Atomic Habits - Tiny Changes, Remarkable Results',
        channelName: 'Escaping Ordinary',
        videoId: 'PZ7lDrwYdZc',
        category: 'Personal Development',
        tags: ['mindset', 'financial-discipline', 'habits'],
    },
    {
        id: '12',
        title: 'How to Be More Disciplined',
        channelName: 'Better Ideas',
        videoId: '75d_29QWELk',
        category: 'Personal Development',
        tags: ['financial-discipline', 'mindset', 'habits'],
    },
    {
        id: '13',
        title: 'The 5 AM Club - Robin Sharma',
        channelName: 'FightMediocrity',
        videoId: '5lcms1O4ME0',
        category: 'Personal Development',
        tags: ['mindset', 'habits', 'productivity'],
    },
    {
        id: '14',
        title: 'Think and Grow Rich - Napoleon Hill',
        channelName: 'Practical Wisdom',
        videoId: 'jpY4m_ZtoLA',
        category: 'Personal Development',
        tags: ['wealth-building', 'mindset', 'financial-literacy'],
    },
    {
        id: '15',
        title: 'How to Set Goals That Actually Work',
        channelName: 'Thomas Frank',
        videoId: 'L4N1q4RNi9I',
        category: 'Personal Development',
        tags: ['mindset', 'productivity', 'habits'],
    },

    // ── Cash Flow ───────────────────────────────────────────
    {
        id: '16',
        title: 'Rich Dad Poor Dad - Robert Kiyosaki',
        channelName: 'The Swedish Investor',
        videoId: 'TcNpoc-lF0M',
        category: 'Cash Flow',
        tags: ['financial-literacy', 'wealth-building', 'passive-income'],
    },
    {
        id: '17',
        title: '7 Passive Income Ideas That Actually Work',
        channelName: 'Ali Abdaal',
        videoId: 'M5y7w_cFiiE',
        category: 'Cash Flow',
        tags: ['passive-income', 'side-hustle', 'wealth-building'],
    },
    {
        id: '18',
        title: 'How to Start a Side Hustle in 2024',
        channelName: 'Matt D\'Avella',
        videoId: '3PCx-F3Gnxg',
        category: 'Cash Flow',
        tags: ['side-hustle', 'income-growth', 'passive-income'],
    },
    {
        id: '19',
        title: 'The Cashflow Quadrant Explained',
        channelName: 'Practical Wisdom',
        videoId: 'bC6I_FpfDAO',
        category: 'Cash Flow',
        tags: ['financial-literacy', 'wealth-building', 'passive-income'],
    },
    {
        id: '20',
        title: 'How to Manage Your Money Like the 1%',
        channelName: 'Mark Tilbury',
        videoId: 'kJG3lAfl5yM',
        category: 'Cash Flow',
        tags: ['budgeting', 'wealth-building', 'saving', 'spending-awareness'],
    },
];
