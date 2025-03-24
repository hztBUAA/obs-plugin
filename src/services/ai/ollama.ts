export class OllamaService {
    private baseUrl: string;

    constructor(
        private modelName: string,
        baseUrl: string = 'http://localhost:11434'
    ) {
        this.baseUrl = baseUrl;
    }

    /**
     * 检查 Ollama 服务是否可用
     */
    async checkAvailability(): Promise<boolean> {
        try {
            const response = await fetch(`${this.baseUrl}/api/tags`);
            return response.ok;
        } catch (error) {
            console.error('Ollama service check failed:', error);
            return false;
        }
    }

    /**
     * 获取可用的模型列表
     */
    async getAvailableModels(): Promise<string[]> {
        try {
            const response = await fetch(`${this.baseUrl}/api/tags`);
            if (!response.ok) {
                throw new Error('Failed to fetch models');
            }
            const data = await response.json();
            return data.models.map((model: any) => model.name);
        } catch (error) {
            console.error('Failed to get Ollama models:', error);
            return [];
        }
    }

    /**
     * 使用Ollama生成文本补全
     */
    async complete(prompt: string): Promise<string> {
        try {
            const response = await fetch(`${this.baseUrl}/api/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: this.modelName,
                    prompt: prompt,
                    stream: false
                }),
            });

            if (!response.ok) {
                throw new Error('Ollama API request failed');
            }

            const data = await response.json();
            return data.response;
        } catch (error) {
            console.error('Ollama API error:', error);
            throw new Error('Failed to generate completion with Ollama');
        }
    }

    /**
     * 分析文本情感
     */
    async analyzeSentiment(text: string): Promise<number> {
        const prompt = `请分析以下文本的情感倾向，只返回1-5的分数（1最消极，5最积极）：\n\n${text}`;
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
        const prompt = `请从以下文本中提取${maxKeywords}个最重要的关键词，只返回关键词，以逗号分隔：\n\n${text}`;
        const response = await this.complete(prompt);
        return response.split(',').map(k => k.trim()).slice(0, maxKeywords);
    }

    /**
     * 提取活动
     */
    async extractActivities(text: string): Promise<string[]> {
        const prompt = `请从以下日记文本中提取主要活动，只返回活动列表，以逗号分隔：\n\n${text}`;
        const response = await this.complete(prompt);
        return response.split(',').map(a => a.trim());
    }
} 