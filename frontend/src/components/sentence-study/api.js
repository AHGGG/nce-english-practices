/**
 * Sentence Study API Client
 * Unified API calls for the SentenceStudy module
 */
import { HIGHLIGHT_OPTIONS } from '../reading/constants';
import { authFetch } from '../../api/auth';

const BASE_URL = '';

export const sentenceStudyApi = {
    async getProgress(sourceId) {
        const res = await authFetch(`${BASE_URL}/api/sentence-study/${encodeURIComponent(sourceId)}/progress`);
        if (!res.ok) throw new Error(`Failed to get progress: ${res.statusText}`);
        return res.json();
    },

    async recordLearning(data) {
        const res = await authFetch(`${BASE_URL}/api/sentence-study/record`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error(`Failed to record learning: ${res.statusText}`);
        return res.json();
    },

    async simplify(data) {
        const res = await authFetch(`${BASE_URL}/api/sentence-study/simplify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error(`Failed to simplify: ${res.statusText}`);
        return res.json();
    },

    async getBooks() {
        const res = await authFetch(`${BASE_URL}/api/reading/epub/books`);
        if (!res.ok) throw new Error(`Failed to get books: ${res.statusText}`);
        return res.json();
    },

    async getArticles(filename) {
        const url = new URL('/api/reading/epub/list', window.location.origin);
        if (filename) {
            url.searchParams.append('filename', filename);
        }
        const res = await authFetch(url.toString());
        if (!res.ok) throw new Error(`Failed to get articles: ${res.statusText}`);
        return res.json();
    },

    async getArticle(sourceId, optionIndex) {
        const opt = HIGHLIGHT_OPTIONS[optionIndex] || HIGHLIGHT_OPTIONS[0];
        const params = new URLSearchParams({
            source_id: sourceId,
            book_code: opt.bookCode || '',
            min_sequence: opt.minSeq || 0,
            max_sequence: opt.maxSeq || 99999
        });
        const res = await authFetch(`${BASE_URL}/api/reading/article?${params}`);
        if (!res.ok) throw new Error(`Failed to get article: ${res.statusText}`);
        return res.json();
    },

    async getCalibration() {
        const res = await authFetch(`${BASE_URL}/api/proficiency/calibration/level`);
        if (!res.ok) return null;
        return res.json();
    },

    async getOverview(title, fullText, totalSentences) {
        const res = await authFetch(`${BASE_URL}/api/sentence-study/overview`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, full_text: fullText, total_sentences: totalSentences })
        });
        return res;  // Return raw response for streaming support
    },

    async getLastSession() {
        const res = await authFetch(`${BASE_URL}/api/sentence-study/last-session`);
        if (!res.ok) return null;
        return res.json();
    },

    // Prefetch collocations for upcoming sentences (fire-and-forget)
    prefetchCollocations(sentences) {
        if (!sentences || sentences.length === 0) return;
        authFetch(`${BASE_URL}/api/sentence-study/prefetch-collocations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sentences: sentences.slice(0, 5) })
        }).catch(() => { }); // Ignore errors, this is best-effort
    },

    // Get all words/phrases looked up during study (for COMPLETED view)
    async getStudyHighlights(sourceId, totalSentences) {
        const res = await authFetch(`${BASE_URL}/api/sentence-study/${encodeURIComponent(sourceId)}/study-highlights?total_sentences=${totalSentences}`);
        if (!res.ok) return { word_clicks: [], phrase_clicks: [], is_complete: false };
        return res.json();
    },

    // Fetch collocations for a sentence
    async detectCollocations(sentence) {
        const res = await authFetch(`${BASE_URL}/api/sentence-study/detect-collocations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sentence })
        });
        if (!res.ok) return { collocations: [] };
        return res.json();
    },

    // Stream word explanation
    async streamExplainWord(data) {
        const res = await authFetch(`${BASE_URL}/api/sentence-study/explain-word`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return res;  // Return raw response for streaming
    },

    // Fetch dictionary entry
    async getDictionary(word) {
        const res = await authFetch(`${BASE_URL}/api/dictionary/ldoce/${encodeURIComponent(word)}`);
        if (!res.ok) return null;
        return res.json();
    }
};

export default sentenceStudyApi;
