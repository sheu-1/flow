import { supabase } from './SupabaseClient';

export type ChargeEntry = {
    id: string;
    amount: number;
    charge_type: 'transaction_cost' | 'access_fee';
    date: string;
    reference_number?: string;
    description?: string;
};

export type ChargeSummary = {
    totalTransactionCosts: number;
    totalAccessFees: number;
    grandTotal: number;
    count: number;
    charges: ChargeEntry[];
};

/**
 * Compute date range boundaries for common timeframes.
 */
export function getTimeframeDates(timeframe: 'today' | 'week' | 'month' | 'year'): { from: string; to: string } {
    const now = new Date();
    const to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();
    let from: Date;

    switch (timeframe) {
        case 'today':
            from = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
            break;
        case 'week': {
            const day = now.getDay(); // 0=Sun
            from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day, 0, 0, 0, 0);
            break;
        }
        case 'month':
            from = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
            break;
        case 'year':
            from = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
            break;
    }

    return { from: from.toISOString(), to };
}

/**
 * Fetch all charge entries (transaction_cost + access_fee) for a user within a date range.
 * Fetches directly from the new `charges` table.
 */
export async function getCharges(
    userId: string,
    from: string,
    to: string
): Promise<ChargeEntry[]> {
    const { data: chargesData, error } = await supabase
        .from('charges')
        .select('id, amount, charge_type, date, reference_number, description')
        .eq('user_id', userId)
        .gte('date', from)
        .lte('date', to);

    if (error) console.warn('[ChargesService] Error fetching charges:', error);

    const mapRow = (row: any): ChargeEntry => ({
        id: row.id,
        amount: row.amount,
        charge_type: row.charge_type,
        date: row.date,
        reference_number: row.reference_number,
        description: row.description,
    });

    return (chargesData || [])
        .map(mapRow)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

/**
 * Get aggregated summary of charges for a user within a date range.
 */
export async function getChargeSummary(
    userId: string,
    from: string,
    to: string
): Promise<ChargeSummary> {
    const charges = await getCharges(userId, from, to);

    const totalTransactionCosts = charges
        .filter(c => c.charge_type === 'transaction_cost')
        .reduce((sum, c) => sum + c.amount, 0);

    const totalAccessFees = charges
        .filter(c => c.charge_type === 'access_fee')
        .reduce((sum, c) => sum + c.amount, 0);

    return {
        totalTransactionCosts,
        totalAccessFees,
        grandTotal: totalTransactionCosts + totalAccessFees,
        count: charges.length,
        charges,
    };
}
