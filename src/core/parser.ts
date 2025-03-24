import moment from 'moment';
import { App, TFile } from 'obsidian';
import { DiaryContent } from '../types';

export class DiaryParser {
    constructor(
        private app: App,
        private diaryFolder: string,
        private dateFormat: string
    ) {}

    /**
     * 扫描指定目录下的所有日记文件
     */
    async scanDiaryFiles(): Promise<TFile[]> {
        const files = this.app.vault.getFiles();
        return files.filter(file => {
            // 检查文件是否在日记文件夹中
            return file.path.startsWith(this.diaryFolder) && file.extension === 'md';
        });
    }

    /**
     * 解析单个日记文件的内容
     */
    async parseDiaryContent(file: TFile): Promise<DiaryContent> {
        const content = await this.app.vault.read(file);
        const date = this.extractDateInfo(file.name, content);
        const metadata = this.extractMetadata(content);

        return {
            date,
            content,
            metadata
        };
    }

    /**
     * 从文件名或内容中提取日期信息
     */
    private extractDateInfo(fileName: string, content: string): Date {
        // 首先尝试从文件名中提取日期
        const fileNameDate = moment(fileName.split('.')[0], this.dateFormat);
        if (fileNameDate.isValid()) {
            return fileNameDate.toDate();
        }

        // 如果文件名中没有有效日期，尝试从内容中提取
        const dateRegex = /(\d{4}[-/]\d{2}[-/]\d{2})/;
        const match = content.match(dateRegex);
        if (match) {
            const contentDate = moment(match[1], 'YYYY-MM-DD');
            if (contentDate.isValid()) {
                return contentDate.toDate();
            }
        }

        // 如果都没有找到有效日期，返回当前时间
        return new Date();
    }

    /**
     * 从内容中提取元数据（标题、标签等）
     */
    private extractMetadata(content: string): DiaryContent['metadata'] {
        const metadata: DiaryContent['metadata'] = {};
        
        // 提取标题
        const titleMatch = content.match(/^#\s+(.+)$/m);
        if (titleMatch) {
            metadata.title = titleMatch[1].trim();
        }

        // 提取标签
        const tags = content.match(/(?:^|\s)#([^\s#]+)/g);
        if (tags) {
            metadata.tags = tags.map(tag => tag.trim().replace('#', ''));
        }

        // 提取心情值（如果有）
        const moodMatch = content.match(/心情[：:]\s*(\d+)/);
        if (moodMatch) {
            metadata.mood = parseInt(moodMatch[1]);
        }

        return metadata;
    }

    /**
     * 批量解析多个日记文件
     */
    async parseMultipleDiaries(files: TFile[]): Promise<DiaryContent[]> {
        const results: DiaryContent[] = [];
        for (const file of files) {
            try {
                const content = await this.parseDiaryContent(file);
                results.push(content);
            } catch (error) {
                console.error(`Error parsing file ${file.path}:`, error);
            }
        }
        return results;
    }
} 