/**
 * Reading Mode Constants
 */

// Number of sentences to load at a time for progressive loading
export const BATCH_SIZE = 20;

// Vocabulary highlighting options
export const HIGHLIGHT_OPTIONS = [
    { label: 'COCA Top 5000', value: 'coca20000', range: [1, 5000] },
    { label: 'COCA 5k-10k', value: 'coca20000', range: [5001, 10000] },
    { label: 'COCA 10k-15k', value: 'coca20000', range: [10001, 15000] },
    { label: 'COCA 15k-20k', value: 'coca20000', range: [15001, 20000] },
    { label: 'CET-4', value: 'cet4' },
    { label: 'CET-6', value: 'cet6' },
    { label: 'QA Vocab', value: 'qa_vocab' }
];
