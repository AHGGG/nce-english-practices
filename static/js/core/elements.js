// DOM Element References
// Initialized lazily to ensure DOM is ready

let _elements = null;

export function getElements() {
    if (_elements) return _elements;
    
    _elements = {
        // Navigation & Layout
        navItems: document.querySelectorAll('.nav-item'),
        viewPanels: document.querySelectorAll('.view-panel'),
        views: {
            learn: document.getElementById('viewLearn'),
            drill: document.getElementById('viewDrill'),
            apply: document.getElementById('viewApply')
        },

        // Global Inputs
        topicInput: document.getElementById('topicInput'),
        loadBtn: document.getElementById('loadBtn'),
        loadingOverlay: document.getElementById('loadingOverlay'),
        toast: document.getElementById('toast'),
        
        // View 1: Learn
        vocabSection: document.getElementById('vocabSection'),
        vocabGrid: document.getElementById('vocabGrid'),
        storyContainer: document.getElementById('storyContainer'),
        storyTitle: document.getElementById('storyTitle'),
        storyContent: document.getElementById('storyContent'),
        storyNotes: document.getElementById('storyNotes'),
        shuffleBtn: document.getElementById('shuffleBtn'),

        // View 2: Drill
        matrixSection: document.getElementById('matrixSection'),
        matrixRows: document.getElementById('matrixRows'),
        tabs: document.querySelectorAll('.tab-btn'),
        
        // Quiz Modal
        quizModal: document.getElementById('quizModal'),
        closeQuizBtn: document.getElementById('closeQuizBtn'),
        quizTitle: document.getElementById('quizTitle'),
        quizQuestion: document.getElementById('quizQuestion'),
        quizOptions: document.getElementById('quizOptions'),
        quizFeedback: document.getElementById('quizFeedback'),

        // View 3: Apply
        scenarioCard: document.getElementById('scenarioCard'),
        scenarioSituation: document.getElementById('scenarioSituation'),
        scenarioGoal: document.getElementById('scenarioGoal'),
        scenarioInput: document.getElementById('scenarioInput'),
        scenarioSubmitBtn: document.getElementById('scenarioSubmitBtn'),
        scenarioFeedback: document.getElementById('scenarioFeedback'),
        
        // Chat
        chatCard: document.getElementById('chatCard'),
        missionTitle: document.getElementById('missionTitle'),
        missionDesc: document.getElementById('missionDesc'),
        missionGoals: document.getElementById('missionGoals'),
        chatWindow: document.getElementById('chatWindow'),
        chatInput: document.getElementById('chatInput'),
        chatSendBtn: document.getElementById('chatSendBtn'),

        // Stats Modal
        statsBtn: document.getElementById('statsNavBtn'),
        statsModal: document.getElementById('statsModal'),
        closeStatsBtn: document.getElementById('closeStatsBtn'),
        totalXp: document.getElementById('totalXp'),
        activityStats: document.getElementById('activityStats'),
        recentHistory: document.getElementById('recentHistory'),

        // Dictionary Modal
        dictModal: document.getElementById('dictModal'),
        closeDictBtn: document.getElementById('closeDictBtn'),
        dictWord: document.getElementById('dictWord'),
        dictDefinition: document.getElementById('dictDefinition'),
        dictContext: document.getElementById('dictContext'),
        askAiBtn: document.getElementById('askAiBtn'),
        aiExplanation: document.getElementById('aiExplanation')
    };
    
    return _elements;
}

// Shorthand for common use
export const elements = new Proxy({}, {
    get(target, prop) {
        return getElements()[prop];
    }
});
