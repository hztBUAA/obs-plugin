import OpenAI from 'openai';

export class OpenAIService {
    private openai: OpenAI;

    constructor(apiKey: string) {
        this.openai = new OpenAI({
            apiKey: apiKey
        });
    }

    /**
     * 使用OpenAI生成文本补全
     */
    async complete(prompt: string): Promise<string> {
        try {
            const response = await this.openai.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: [
                    {
                        role: 'system',
                        content: '你是一个专业的日记分析助手，擅长提取文本中的关键信息、分析情感倾向，并生成简洁的摘要。'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 150
            });

            return response.choices[0]?.message?.content || '';
        } catch (error) {
            console.error('OpenAI API error:', error);
            throw new Error('Failed to generate completion with OpenAI');
        }
    }

    /**
     * 分析文本情感
     */
    async analyzeSentiment(text: string): Promise<number> {
        const prompt = `请分析以下文本的情感倾向，给出1-5的分数（1最消极，5最积极）：\n\n${text}`;
        const response = await this.complete(prompt);
        const score = parseInt(response);
        return score >= 1 && score <= 5 ? score : 3;
    }

    /**
     * 生成文本摘要
     */
    async generateSummary(text: string): Promise<string> {
        const prompt = `请用一到两句话总结以下文本的主要内容：\n\n${text}`;
        return await this.complete(prompt);
    }

    /**
     * 提取关键词
     */
    async extractKeywords(text: string, maxKeywords: number = 5): Promise<string[]> {
        const prompt = `请从以下文本中提取${maxKeywords}个最重要的关键词，以逗号分隔：\n\n${text}`;
        const response = await this.complete(prompt);
        return response.split(',').map(k => k.trim()).slice(0, maxKeywords);
    }

    /**
     * 提取活动
     */
    async extractActivities(text: string): Promise<string[]> {
        const prompt = `请从以下日记文本中提取主要活动，以逗号分隔：\n\n${text}`;
        const response = await this.complete(prompt);
        return response.split(',').map(a => a.trim());
    }
} 