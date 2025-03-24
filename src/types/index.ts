export interface DiaryPluginSettings {
    diaryFolder: string;
    dateFormat: string;
    analyzeRange: {
        start: string;
        end: string;
    };
    aiSettings: {
        useOpenAI: boolean;
        openAIApiKey: string;
        useOllama: boolean;
        ollamaModel: string;
    };
    analysisSettings: {
        maxKeywords: number;
        moodScoreRange: [number, number];
        customTags: string[];
    };
    exportSettings: {
        format: 'pdf' | 'png' | 'svg';
        includeCharts: boolean;
    };
}

export interface DiaryContent {
    date: Date;
    content: string;
    metadata: {
        title?: string;
        tags?: string[];
        mood?: number;
    };
}

export interface AnalysisResult {
    keywords: string[];
    moodScore: number;
    summary: string;
    activities: string[];
}

export interface TimelineEntry {
    id: string;
    date: Date;
    title: string;
    summary: string;
    keywords: string[];
    moodScore: number;
    activities: string[];
}

export interface ChartData {
    type: 'mood' | 'activity' | 'wordcloud' | 'timeline';
    data: any;
    options?: any;
}

export const DEFAULT_SETTINGS: DiaryPluginSettings = {
    diaryFolder: 'diary',
    dateFormat: 'YYYY-MM-DD',
    analyzeRange: {
        start: '',
        end: '',
    },
    aiSettings: {
        useOpenAI: false,
        openAIApiKey: '',
        useOllama: false,
        ollamaModel: 'llama2',
    },
    analysisSettings: {
        maxKeywords: 5,
        moodScoreRange: [1, 5],
        customTags: [],
    },
    exportSettings: {
        format: 'pdf',
        includeCharts: true,
    },
}; 