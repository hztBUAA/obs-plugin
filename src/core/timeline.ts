import { v4 as uuidv4 } from 'uuid';
import { AnalysisResult, DiaryContent, TimelineEntry } from '../types';

export class TimelineGenerator {
    constructor(
        private dateFormat: string = 'YYYY-MM-DD'
    ) {}

    /**
     * 生成时间线数据
     */
    generateTimelineData(diaries: DiaryContent[], analyses: AnalysisResult[]): TimelineEntry[] {
        if (diaries.length !== analyses.length) {
            throw new Error('Diaries and analyses arrays must have the same length');
        }

        return diaries.map((diary, index) => ({
            id: uuidv4(),
            date: diary.date,
            title: diary.metadata.title || this.generateTitle(diary.date),
            summary: analyses[index].summary,
            keywords: analyses[index].keywords,
            moodScore: analyses[index].moodScore,
            activities: analyses[index].activities
        }));
    }

    /**
     * 生成默认标题
     */
    private generateTitle(date: Date): string {
        return date.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }) + ' 的日记';
    }

    /**
     * 导出时间线数据为JSON格式
     */
    exportTimelineJSON(entries: TimelineEntry[]): string {
        return JSON.stringify(entries, null, 2);
    }

    /**
     * 导出时间线数据为Markdown格式
     */
    exportTimelineMarkdown(entries: TimelineEntry[]): string {
        return entries.map(entry => {
            const date = entry.date.toLocaleDateString('zh-CN');
            const moodEmoji = this.getMoodEmoji(entry.moodScore);
            
            return `## ${date} ${entry.title} ${moodEmoji}\n\n` +
                   `${entry.summary}\n\n` +
                   `**关键词**：${entry.keywords.join('、')}\n\n` +
                   `**活动**：${entry.activities.join('、')}\n\n` +
                   `---\n`;
        }).join('\n');
    }

    /**
     * 根据心情指数获取对应的表情符号
     */
    private getMoodEmoji(score: number): string {
        const emojis = ['😢', '😔', '😐', '😊', '😄'];
        return emojis[Math.min(Math.max(Math.floor(score) - 1, 0), 4)];
    }

    /**
     * 按时间范围筛选时间线条目
     */
    filterEntriesByDateRange(entries: TimelineEntry[], startDate?: Date, endDate?: Date): TimelineEntry[] {
        return entries.filter(entry => {
            if (startDate && entry.date < startDate) return false;
            if (endDate && entry.date > endDate) return false;
            return true;
        });
    }

    /**
     * 按关键词搜索时间线条目
     */
    searchEntriesByKeyword(entries: TimelineEntry[], keyword: string): TimelineEntry[] {
        const lowercaseKeyword = keyword.toLowerCase();
        return entries.filter(entry => 
            entry.keywords.some(k => k.toLowerCase().includes(lowercaseKeyword)) ||
            entry.summary.toLowerCase().includes(lowercaseKeyword) ||
            entry.activities.some(a => a.toLowerCase().includes(lowercaseKeyword))
        );
    }

    /**
     * 按心情指数范围筛选时间线条目
     */
    filterEntriesByMoodRange(entries: TimelineEntry[], minScore: number, maxScore: number): TimelineEntry[] {
        return entries.filter(entry => 
            entry.moodScore >= minScore && entry.moodScore <= maxScore
        );
    }

    /**
     * 生成时间线统计数据
     */
    generateTimelineStats(entries: TimelineEntry[]) {
        return {
            totalEntries: entries.length,
            averageMood: this.calculateAverageMood(entries),
            moodDistribution: this.calculateMoodDistribution(entries),
            topKeywords: this.findTopKeywords(entries),
            topActivities: this.findTopActivities(entries),
            entriesPerMonth: this.calculateEntriesPerMonth(entries)
        };
    }

    /**
     * 计算平均心情指数
     */
    private calculateAverageMood(entries: TimelineEntry[]): number {
        if (entries.length === 0) return 0;
        const sum = entries.reduce((acc, entry) => acc + entry.moodScore, 0);
        return Math.round((sum / entries.length) * 10) / 10;
    }

    /**
     * 计算心情分布
     */
    private calculateMoodDistribution(entries: TimelineEntry[]): Record<number, number> {
        const distribution: Record<number, number> = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0};
        entries.forEach(entry => {
            const score = Math.round(entry.moodScore);
            distribution[score] = (distribution[score] || 0) + 1;
        });
        return distribution;
    }

    /**
     * 查找最常见的关键词
     */
    private findTopKeywords(entries: TimelineEntry[], limit: number = 10): Array<[string, number]> {
        const keywordCount = new Map<string, number>();
        entries.forEach(entry => {
            entry.keywords.forEach(keyword => {
                keywordCount.set(keyword, (keywordCount.get(keyword) || 0) + 1);
            });
        });
        
        return Array.from(keywordCount.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit);
    }

    /**
     * 查找最常见的活动
     */
    private findTopActivities(entries: TimelineEntry[], limit: number = 10): Array<[string, number]> {
        const activityCount = new Map<string, number>();
        entries.forEach(entry => {
            entry.activities.forEach(activity => {
                activityCount.set(activity, (activityCount.get(activity) || 0) + 1);
            });
        });
        
        return Array.from(activityCount.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit);
    }

    /**
     * 计算每月日记数量
     */
    private calculateEntriesPerMonth(entries: TimelineEntry[]): Record<string, number> {
        const monthlyCount: Record<string, number> = {};
        entries.forEach(entry => {
            const monthKey = entry.date.toISOString().substring(0, 7); // YYYY-MM
            monthlyCount[monthKey] = (monthlyCount[monthKey] || 0) + 1;
        });
        return monthlyCount;
    }
} 