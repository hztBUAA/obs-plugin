import { App, PluginSettingTab, Setting } from 'obsidian';
import { OllamaService } from '../services/ai/ollama';
import { DiaryPluginSettings } from '../types';

export class DiarySettingTab extends PluginSettingTab {
    plugin: any;
    settings: DiaryPluginSettings;
    ollamaService?: OllamaService;

    constructor(app: App, plugin: any) {
        super(app, plugin);
        this.plugin = plugin;
        this.settings = plugin.settings;
        if (this.settings.aiSettings.useOllama) {
            this.ollamaService = new OllamaService(this.settings.aiSettings.ollamaModel);
        }
    }

    async display(): Promise<void> {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl('h2', { text: '日记分析插件设置' });

        // 基础设置
        this.addBasicSettings(containerEl);

        // AI设置
        this.addAISettings(containerEl);

        // 分析设置
        this.addAnalysisSettings(containerEl);

        // 导出设置
        this.addExportSettings(containerEl);
    }

    private addBasicSettings(containerEl: HTMLElement): void {
        containerEl.createEl('h3', { text: '基础设置' });

        new Setting(containerEl)
            .setName('日记文件夹')
            .setDesc('指定存放日记文件的文件夹路径')
            .addText(text => text
                .setPlaceholder('diary')
                .setValue(this.settings.diaryFolder)
                .onChange(async (value) => {
                    this.settings.diaryFolder = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('日期格式')
            .setDesc('指定日记文件名中的日期格式')
            .addText(text => text
                .setPlaceholder('YYYY-MM-DD')
                .setValue(this.settings.dateFormat)
                .onChange(async (value) => {
                    this.settings.dateFormat = value;
                    await this.plugin.saveSettings();
                }));

        // 分析日期范围
        new Setting(containerEl)
            .setName('开始日期')
            .setDesc('分析的起始日期（可选）')
            .addText(text => text
                .setPlaceholder('YYYY-MM-DD')
                .setValue(this.settings.analyzeRange.start)
                .onChange(async (value) => {
                    this.settings.analyzeRange.start = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('结束日期')
            .setDesc('分析的结束日期（可选）')
            .addText(text => text
                .setPlaceholder('YYYY-MM-DD')
                .setValue(this.settings.analyzeRange.end)
                .onChange(async (value) => {
                    this.settings.analyzeRange.end = value;
                    await this.plugin.saveSettings();
                }));
    }

    private addAISettings(containerEl: HTMLElement): void {
        containerEl.createEl('h3', { text: 'AI 设置' });

        // OpenAI 设置
        new Setting(containerEl)
            .setName('启用 OpenAI')
            .setDesc('使用 OpenAI 进行更智能的分析')
            .addToggle(toggle => toggle
                .setValue(this.settings.aiSettings.useOpenAI)
                .onChange(async (value) => {
                    this.settings.aiSettings.useOpenAI = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('OpenAI API 密钥')
            .setDesc('输入你的 OpenAI API 密钥')
            .addText(text => text
                .setPlaceholder('sk-...')
                .setValue(this.settings.aiSettings.openAIApiKey)
                .onChange(async (value) => {
                    this.settings.aiSettings.openAIApiKey = value;
                    await this.plugin.saveSettings();
                }));

        // Ollama 设置
        new Setting(containerEl)
            .setName('启用 Ollama')
            .setDesc('使用本地 Ollama 模型进行分析')
            .addToggle(toggle => toggle
                .setValue(this.settings.aiSettings.useOllama)
                .onChange(async (value) => {
                    this.settings.aiSettings.useOllama = value;
                    if (value && !this.ollamaService) {
                        this.ollamaService = new OllamaService();
                    }
                    await this.plugin.saveSettings();
                }));

        if (this.ollamaService) {
            this.addOllamaModelSelector(containerEl);
        }
    }

    private async addOllamaModelSelector(containerEl: HTMLElement): Promise<void> {
        const modelDropdown = new Setting(containerEl)
            .setName('Ollama 模型')
            .setDesc('选择要使用的 Ollama 模型')
            .addDropdown(async (dropdown) => {
                try {
                    const available = await this.ollamaService?.checkAvailability();
                    if (!available) {
                        dropdown.addOption('unavailable', '未检测到 Ollama 服务');
                        return;
                    }

                    const models = await this.ollamaService?.getAvailableModels();
                    models?.forEach(model => {
                        dropdown.addOption(model, model);
                    });

                    dropdown.setValue(this.settings.aiSettings.ollamaModel);
                    dropdown.onChange(async (value) => {
                        this.settings.aiSettings.ollamaModel = value;
                        await this.plugin.saveSettings();
                    });
                } catch (error) {
                    console.error('Failed to load Ollama models:', error);
                    dropdown.addOption('error', '加载模型列表失败');
                }
            });
    }

    private addAnalysisSettings(containerEl: HTMLElement): void {
        containerEl.createEl('h3', { text: '分析设置' });

        new Setting(containerEl)
            .setName('最大关键词数量')
            .setDesc('从每篇日记中提取的最大关键词数量')
            .addSlider(slider => slider
                .setLimits(1, 10, 1)
                .setValue(this.settings.analysisSettings.maxKeywords)
                .setDynamicTooltip()
                .onChange(async (value) => {
                    this.settings.analysisSettings.maxKeywords = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('心情指数范围')
            .setDesc('设置心情指数的最小值和最大值')
            .addText(text => text
                .setPlaceholder('1,5')
                .setValue(`${this.settings.analysisSettings.moodScoreRange[0]},${this.settings.analysisSettings.moodScoreRange[1]}`)
                .onChange(async (value) => {
                    const [min, max] = value.split(',').map(Number);
                    if (!isNaN(min) && !isNaN(max)) {
                        this.settings.analysisSettings.moodScoreRange = [min, max];
                        await this.plugin.saveSettings();
                    }
                }));

        new Setting(containerEl)
            .setName('自定义标签')
            .setDesc('添加自定义标签（用逗号分隔）')
            .addText(text => text
                .setPlaceholder('工作,学习,娱乐')
                .setValue(this.settings.analysisSettings.customTags.join(','))
                .onChange(async (value) => {
                    this.settings.analysisSettings.customTags = value.split(',').map(tag => tag.trim());
                    await this.plugin.saveSettings();
                }));
    }

    private addExportSettings(containerEl: HTMLElement): void {
        containerEl.createEl('h3', { text: '导出设置' });

        new Setting(containerEl)
            .setName('导出格式')
            .setDesc('选择图表导出格式')
            .addDropdown(dropdown => dropdown
                .addOption('pdf', 'PDF')
                .addOption('png', 'PNG')
                .addOption('svg', 'SVG')
                .setValue(this.settings.exportSettings.format)
                .onChange(async (value: any) => {
                    this.settings.exportSettings.format = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('包含图表')
            .setDesc('在导出时包含统计图表')
            .addToggle(toggle => toggle
                .setValue(this.settings.exportSettings.includeCharts)
                .onChange(async (value) => {
                    this.settings.exportSettings.includeCharts = value;
                    await this.plugin.saveSettings();
                }));
    }
} 