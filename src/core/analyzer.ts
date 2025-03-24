import { OllamaService } from '../services/ai/ollama';
import { OpenAIService } from '../services/ai/openai';
import { AnalysisResult, DiaryContent } from '../types';

export class ContentAnalyzer {
    constructor(
        private openAI?: OpenAIService,
        private ollama?: OllamaService,
        private maxKeywords: number = 5
    ) {}

    /**
     * 分析日记内容
     */
    async analyze(content: DiaryContent): Promise<AnalysisResult> {
        const [keywords, moodScore, activities] = await Promise.all([
            this.extractKeywords(content.content),
            this.analyzeMoodScore(content.content),
            this.extractActivities(content.content)
        ]);

        const summary = await this.generateSummary(content.content);

        return {
            keywords,
            moodScore,
            summary,
            activities
        };
    }

    /**
     * 提取关键词
     */
    private async extractKeywords(text: string): Promise<string[]> {
        if (this.openAI) {
            return this.extractKeywordsWithAI(text, 'openai');
        } else if (this.ollama) {
            return this.extractKeywordsWithAI(text, 'ollama');
        }

        // 如果没有AI服务，使用简单的词频分析
        return this.extractKeywordsWithFrequency(text);
    }

    /**
     * 使用AI服务提取关键词
     */
    private async extractKeywordsWithAI(text: string, service: 'openai' | 'ollama'): Promise<string[]> {
        const prompt = `请从以下文本中提取${this.maxKeywords}个最重要的关键词，以逗号分隔：\n\n${text}`;
        
        let response: string;
        if (service === 'openai' && this.openAI) {
            response = await this.openAI.complete(prompt);
        } else if (service === 'ollama' && this.ollama) {
            response = await this.ollama.complete(prompt);
        } else {
            throw new Error('No AI service available');
        }

        return response.split(',').map(k => k.trim()).slice(0, this.maxKeywords);
    }

    /**
     * 使用词频分析提取关键词
     */
    private extractKeywordsWithFrequency(text: string): string[] {
        // 移除标点符号和特殊字符
        const cleanText = text.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, ' ');
        const words = cleanText.split(/\s+/);
        
        // 统计词频
        const wordFreq = new Map<string, number>();
        words.forEach(word => {
            if (word.length > 1) { // 忽略单字词
                wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
            }
        });

        // 排序并返回前N个关键词
        return Array.from(wordFreq.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, this.maxKeywords)
            .map(([word]) => word);
    }

    /**
     * 分析心情指数
     */
    private async analyzeMoodScore(text: string): Promise<number> {
        // 首先检查是否已经在元数据中标注了心情值
        const moodMatch = text.match(/心情[：:]\s*(\d+)/);
        if (moodMatch) {
            const mood = parseInt(moodMatch[1]);
            if (mood >= 1 && mood <= 5) {
                return mood;
            }
        }

        // 使用AI服务分析心情
        if (this.openAI || this.ollama) {
            return this.analyzeMoodWithAI(text);
        }

        // 简单的情感词典分析
        return this.analyzeMoodWithDictionary(text);
    }

    /**
     * 使用AI分析心情指数
     */
    private async analyzeMoodWithAI(text: string): Promise<number> {
        const prompt = `请分析以下日记文本的情感倾向，给出1-5的分数（1最消极，5最积极）：\n\n${text}`;
        
        let response: string;
        if (this.openAI) {
            response = await this.openAI.complete(prompt);
        } else if (this.ollama) {
            response = await this.ollama.complete(prompt);
        } else {
            throw new Error('No AI service available');
        }

        const score = parseInt(response);
        return score >= 1 && score <= 5 ? score : 3;
    }

    /**
     * 使用情感词典分析心情指数
     */
    private analyzeMoodWithDictionary(text: string): number {
        const positiveWords = ['开心', '快乐', '高兴', '幸福', '满意', '成功', '喜欢'];
        const negativeWords = ['难过', '伤心', '失望', '焦虑', '痛苦', '生气', '讨厌'];

        let score = 3; // 默认中性分数
        
        // 计算正面和负面词的出现次数
        const positiveCount = positiveWords.reduce((count, word) => 
            count + (text.match(new RegExp(word, 'g')) || []).length, 0);
        const negativeCount = negativeWords.reduce((count, word) => 
            count + (text.match(new RegExp(word, 'g')) || []).length, 0);

        // 根据正负面词的比例调整分数
        if (positiveCount > negativeCount) {
            score += Math.min(2, positiveCount - negativeCount);
        } else if (negativeCount > positiveCount) {
            score -= Math.min(2, negativeCount - positiveCount);
        }

        return score;
    }

    /**
     * 提取活动
     */
    private async extractActivities(text: string): Promise<string[]> {
        if (this.openAI || this.ollama) {
            return this.extractActivitiesWithAI(text);
        }

        // 使用简单的规则提取活动
        return this.extractActivitiesWithRules(text);
    }

    /**
     * 使用AI提取活动
     */
    private async extractActivitiesWithAI(text: string): Promise<string[]> {
        const prompt = `请从以下日记文本中提取主要活动，以逗号分隔：\n\n${text}`;
        
        let response: string;
        if (this.openAI) {
            response = await this.openAI.complete(prompt);
        } else if (this.ollama) {
            response = await this.ollama.complete(prompt);
        } else {
            throw new Error('No AI service available');
        }

        return response.split(',').map(a => a.trim());
    }

    /**
     * 使用规则提取活动
     */
    private extractActivitiesWithRules(text: string): string[] {
        const activities: string[] = [];
        
        // 常见的活动标记词
        const activityMarkers = ['去', '做', '完成', '参加', '开始', '结束'];
        
        // 按句子分割文本
        const sentences = text.split(/[。！？]/);
        
        for (const sentence of sentences) {
            for (const marker of activityMarkers) {
                if (sentence.includes(marker)) {
                    // 提取包含标记词的短语
                    const match = sentence.match(new RegExp(`${marker}([^，。！？]+)`));
                    if (match && match[1]) {
                        activities.push(match[1].trim());
                    }
                }
            }
        }

        return [...new Set(activities)]; // 去重
    }

    /**
     * 生成摘要
     */
    private async generateSummary(text: string): Promise<string> {
        if (this.openAI || this.ollama) {
            return this.generateSummaryWithAI(text);
        }

        // 使用简单的摘要生成方法
        return this.generateSimpleSummary(text);
    }

    /**
     * 使用AI生成摘要
     */
    private async generateSummaryWithAI(text: string): Promise<string> {
        const prompt = `请用一到两句话总结以下日记内容：\n\n${text}`;
        
        if (this.openAI) {
            return await this.openAI.complete(prompt);
        } else if (this.ollama) {
            return await this.ollama.complete(prompt);
        }
        
        throw new Error('No AI service available');
    }

    /**
     * 生成简单摘要
     */
    private generateSimpleSummary(text: string): string {
        // 获取第一段作为摘要
        const firstParagraph = text.split('\n\n')[0];
        if (firstParagraph.length <= 100) {
            return firstParagraph;
        }
        return firstParagraph.substring(0, 100) + '...';
    }
} 