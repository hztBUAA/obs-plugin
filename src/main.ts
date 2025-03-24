import Chart from 'chart.js/auto';
import * as d3 from 'd3';
import cloud from 'd3-cloud';
import { App, Editor, MarkdownView, Modal, Notice, Plugin, TFile } from 'obsidian';
import { ContentAnalyzer } from './core/analyzer';
import { DiaryParser } from './core/parser';
import { TimelineGenerator } from './core/timeline';
import { OllamaService } from './services/ai/ollama';
import { OpenAIService } from './services/ai/openai';
import { ChartService } from './services/chart';
import { DiarySettingTab } from './settings';
import { DEFAULT_SETTINGS, DiaryPluginSettings } from './types';

export default class DiaryAnalyzerPlugin extends Plugin {
	settings: DiaryPluginSettings;
	parser: DiaryParser;
	analyzer: ContentAnalyzer;
	timeline: TimelineGenerator;
	chartService: ChartService;

	async onload() {
		await this.loadSettings();

		// 初始化核心服务
		this.initializeServices();

		// 添加功能按钮到左侧栏
		this.addRibbonIcon('calendar-with-checkmark', '分析日记', () => {
			this.analyzeDiaries();
		});

		// 添加命令
		this.addCommands();

		// 添加设置标签页
		this.addSettingTab(new DiarySettingTab(this.app, this));
	}

	private initializeServices() {
		this.parser = new DiaryParser(
			this.app,
			this.settings.diaryFolder,
			this.settings.dateFormat
		);

		let openAI: OpenAIService | undefined;
		let ollama: OllamaService | undefined;

		if (this.settings.aiSettings.useOpenAI && this.settings.aiSettings.openAIApiKey) {
			openAI = new OpenAIService(this.settings.aiSettings.openAIApiKey);
		}

		if (this.settings.aiSettings.useOllama) {
			ollama = new OllamaService(this.settings.aiSettings.ollamaModel);
		}

		this.analyzer = new ContentAnalyzer(
			openAI,
			ollama,
			this.settings.analysisSettings.maxKeywords
		);

		this.timeline = new TimelineGenerator(this.settings.dateFormat);
		this.chartService = new ChartService();
	}

	private addCommands() {
		// 分析当前文件
		this.addCommand({
			id: 'analyze-current-diary',
			name: '分析当前日记',
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				const file = view.file;
				if (!file) return;
				await this.analyzeCurrentDiary(file);
			}
		});

		// 分析指定时间范围的日记
		this.addCommand({
			id: 'analyze-diary-range',
			name: '分析指定时间范围的日记',
			callback: () => {
				new DateRangeModal(this.app, async (startDate, endDate) => {
					await this.analyzeDiaryRange(startDate, endDate);
				}).open();
			}
		});

		// 生成时间线
		this.addCommand({
			id: 'generate-timeline',
			name: '生成时间线',
			callback: async () => {
				await this.generateTimeline();
			}
		});

		// 导出分析报告
		this.addCommand({
			id: 'export-analysis-report',
			name: '导出分析报告',
			callback: async () => {
				await this.exportAnalysisReport();
			}
		});
	}

	async analyzeCurrentDiary(file: TFile) {
		try {
			const content = await this.parser.parseDiaryContent(file);
			const analysis = await this.analyzer.analyze(content);

			// 创建分析结果预览
			new AnalysisResultModal(this.app, content, analysis).open();
		} catch (error) {
			new Notice('分析日记时出错：' + error.message);
		}
	}

	async analyzeDiaryRange(startDate: string, endDate: string) {
		try {
			const files = await this.parser.scanDiaryFiles();
			const diaryContents = await this.parser.parseMultipleDiaries(files);
			
			// 根据日期范围筛选
			const filteredDiaries = diaryContents.filter(diary => {
				const diaryDate = diary.date.toISOString().split('T')[0];
				return diaryDate >= startDate && diaryDate <= endDate;
			});

			// 分析所有日记
			const analyses = await Promise.all(
				filteredDiaries.map(diary => this.analyzer.analyze(diary))
			);

			// 生成时间线数据
			const timelineEntries = this.timeline.generateTimelineData(filteredDiaries, analyses);

			// 生成统计图表
			const charts = {
				moodTrend: this.chartService.generateMoodTrendChart(timelineEntries),
				wordCloud: this.chartService.generateWordCloudChart(timelineEntries),
				activityStats: this.chartService.generateActivityChart(timelineEntries),
				moodDistribution: this.chartService.generateMoodDistributionChart(timelineEntries)
			};

			// 显示分析结果
			new AnalysisReportModal(this.app, timelineEntries, charts).open();
		} catch (error) {
			new Notice('分析日记时出错：' + error.message);
		}
	}

	async generateTimeline() {
		try {
			const files = await this.parser.scanDiaryFiles();
			const diaryContents = await this.parser.parseMultipleDiaries(files);
			const analyses = await Promise.all(
				diaryContents.map(diary => this.analyzer.analyze(diary))
			);

			const timelineEntries = this.timeline.generateTimelineData(diaryContents, analyses);
			const timelineMarkdown = this.timeline.exportTimelineMarkdown(timelineEntries);

			// 创建时间线文件
			const timelinePath = `${this.settings.diaryFolder}/时间线.md`;
			await this.app.vault.create(timelinePath, timelineMarkdown);
			new Notice('时间线已生成');
		} catch (error) {
			new Notice('生成时间线时出错：' + error.message);
		}
	}

	async exportAnalysisReport() {
		try {
			const files = await this.parser.scanDiaryFiles();
			const diaryContents = await this.parser.parseMultipleDiaries(files);
			const analyses = await Promise.all(
				diaryContents.map(diary => this.analyzer.analyze(diary))
			);

			const timelineEntries = this.timeline.generateTimelineData(diaryContents, analyses);
			const stats = this.timeline.generateTimelineStats(timelineEntries);

			// 生成报告内容
			let report = '# 日记分析报告\n\n';
			report += `## 基本统计\n\n`;
			report += `- 总日记数：${stats.totalEntries}\n`;
			report += `- 平均心情指数：${stats.averageMood}\n\n`;

			report += `## 心情分布\n\n`;
			Object.entries(stats.moodDistribution).forEach(([score, count]) => {
				report += `- ${score}分：${count}篇\n`;
			});

			report += `\n## 热门关键词\n\n`;
			stats.topKeywords.forEach(([keyword, count]) => {
				report += `- ${keyword}：${count}次\n`;
			});

			report += `\n## 常见活动\n\n`;
			stats.topActivities.forEach(([activity, count]) => {
				report += `- ${activity}：${count}次\n`;
			});

			// 如果需要包含图表
			if (this.settings.exportSettings.includeCharts) {
				const charts = {
					moodTrend: this.chartService.generateMoodTrendChart(timelineEntries),
					wordCloud: this.chartService.generateWordCloudChart(timelineEntries),
					activityStats: this.chartService.generateActivityChart(timelineEntries),
					moodDistribution: this.chartService.generateMoodDistributionChart(timelineEntries)
				};

				report += '\n## 统计图表\n\n';
				
				// 导出并嵌入图表
				for (const [name, chart] of Object.entries(charts)) {
					const imageData = await this.chartService.exportChart(chart);
					report += `### ${name}\n\n`;
					report += `![${name}](${imageData})\n\n`;
				}
			}

			// 保存报告 增加当前操作日期
			
			const reportPath = `${this.settings.diaryFolder}/分析报告.md`;
			await this.app.vault.create(reportPath, report);
			new Notice('分析报告已导出');
		} catch (error) {
			new Notice('导出分析报告时出错：' + error.message);
		}
	}

	/**
	 * 分析所有日记
	 */
	async analyzeDiaries() {
		try {
			const files = await this.parser.scanDiaryFiles();
			if (files.length === 0) {
				new Notice('未找到日记文件');
				return;
			}

			const diaryContents = await this.parser.parseMultipleDiaries(files);
			const analyses = await Promise.all(
				diaryContents.map(diary => this.analyzer.analyze(diary))
			);

			// 生成时间线数据
			const timelineEntries = this.timeline.generateTimelineData(diaryContents, analyses);

			// 生成统计图表
			const charts = {
				moodTrend: this.chartService.generateMoodTrendChart(timelineEntries),
				wordCloud: this.chartService.generateWordCloudChart(timelineEntries),
				activityStats: this.chartService.generateActivityChart(timelineEntries),
				moodDistribution: this.chartService.generateMoodDistributionChart(timelineEntries)
			};

			// 显示分析结果
			new AnalysisReportModal(this.app, timelineEntries, charts).open();
		} catch (error) {
			new Notice('分析日记时出错：' + error.message);
		}
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
		this.initializeServices();
	}
}

class DateRangeModal extends Modal {
	private startDate: string;
	private endDate: string;
	private onSubmit: (startDate: string, endDate: string) => void;

	constructor(app: App, onSubmit: (startDate: string, endDate: string) => void) {
		super(app);
		this.onSubmit = onSubmit;
	}

	onOpen() {
		const { contentEl } = this;

		contentEl.createEl('h2', { text: '选择日期范围' });

		// 开始日期
		contentEl.createEl('div', { text: '开始日期：' });
		const startDateInput = contentEl.createEl('input', {
			type: 'date',
			value: this.startDate
		});

		// 结束日期
		contentEl.createEl('div', { text: '结束日期：' });
		const endDateInput = contentEl.createEl('input', {
			type: 'date',
			value: this.endDate
		});

		// 确认按钮
		const submitButton = contentEl.createEl('button', {
			text: '确认'
		});
		submitButton.addEventListener('click', () => {
			this.onSubmit(startDateInput.value, endDateInput.value);
			this.close();
		});
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

class AnalysisResultModal extends Modal {
	constructor(
		app: App,
		private content: any,
		private analysis: any
	) {
		super(app);
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.createEl('h2', { text: '分析结果' });

		// 显示分析结果
		const resultContainer = contentEl.createDiv();
		resultContainer.createEl('h3', { text: '摘要' });
		resultContainer.createEl('p', { text: this.analysis.summary });

		resultContainer.createEl('h3', { text: '关键词' });
		resultContainer.createEl('p', { text: this.analysis.keywords.join('、') });

		resultContainer.createEl('h3', { text: '心情指数' });
		resultContainer.createEl('p', { text: `${this.analysis.moodScore}分` });

		resultContainer.createEl('h3', { text: '活动' });
		resultContainer.createEl('p', { text: this.analysis.activities.join('、') });
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

class AnalysisReportModal extends Modal {
	constructor(
		app: App,
		private timelineEntries: any[],
		private charts: any
	) {
		super(app);
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.createEl('h2', { text: '分析报告' });

		// 显示基本统计信息
		const stats = {
			totalEntries: this.timelineEntries.length,
			averageMood: this.calculateAverageMood()
		};

		const statsContainer = contentEl.createDiv();
		statsContainer.createEl('h3', { text: '基本统计' });
		statsContainer.createEl('p', { text: `总日记数：${stats.totalEntries}` });
		statsContainer.createEl('p', { text: `平均心情指数：${stats.averageMood}` });

		// 显示图表
		const chartsContainer = contentEl.createDiv();
		chartsContainer.createEl('h3', { text: '统计图表' });

		// 创建图表容器
		const moodTrendContainer = chartsContainer.createDiv();
		const wordCloudContainer = chartsContainer.createDiv();
		const activityStatsContainer = chartsContainer.createDiv();
		const moodDistContainer = chartsContainer.createDiv();

		// 设置容器样式
		moodTrendContainer.style.height = '300px';
		wordCloudContainer.style.height = '300px';
		activityStatsContainer.style.height = '300px';
		moodDistContainer.style.height = '300px';

		// 渲染心情趋势图
		const moodTrendCanvas = moodTrendContainer.createEl('canvas');
		new Chart(moodTrendCanvas, {
			type: 'line',
			data: this.charts.moodTrend.data,
			options: this.charts.moodTrend.options
		});

		// 渲染词云图
		const wordCloudCanvas = wordCloudContainer.createEl('canvas');
		this.renderWordCloud(wordCloudCanvas, this.charts.wordCloud.data);

		// 渲染活动统计图
		const activityStatsCanvas = activityStatsContainer.createEl('canvas');
		new Chart(activityStatsCanvas, {
			type: 'bar',
			data: this.charts.activityStats.data,
			options: this.charts.activityStats.options
		});

		// 渲染心情分布图
		const moodDistCanvas = moodDistContainer.createEl('canvas');
		new Chart(moodDistCanvas, {
			type: 'doughnut',
			data: this.charts.moodDistribution.data,
			options: this.charts.moodDistribution.options
		});
	}

	private renderWordCloud(canvas: HTMLCanvasElement, words: Array<{text: string; value: number; color: string}>) {
		const width = canvas.parentElement?.clientWidth || 800;
		const height = canvas.parentElement?.clientHeight || 400;

		interface CloudWord {
			text: string;
			size: number;
			color: string;
			x?: number;
			y?: number;
			rotate?: number;
		}

		const layout = cloud<CloudWord>()
			.size([width, height])
			.words(words.map(d => ({
				text: d.text,
				size: Math.sqrt(d.value) * 10,
				color: d.color
			})))
			.padding(5)
			.rotate(() => (~~(Math.random() * 6) - 3) * 30)
			.font("Impact")
			.fontSize(d => d.size || 0)
			.on("end", draw);

		layout.start();

		function draw(words: CloudWord[]) {
			d3.select(canvas.parentElement)
				.append("svg")
				.attr("width", layout.size()[0])
				.attr("height", layout.size()[1])
				.append("g")
				.attr("transform", `translate(${layout.size()[0] / 2},${layout.size()[1] / 2})`)
				.selectAll("text")
				.data(words)
				.enter()
				.append("text")
				.style("font-size", d => `${d.size}px`)
				.style("font-family", "Impact")
				.style("fill", d => d.color)
				.attr("text-anchor", "middle")
				.attr("transform", d => `translate(${d.x || 0},${d.y || 0})rotate(${d.rotate || 0})`)
				.text(d => d.text);
		}
	}

	private calculateAverageMood(): number {
		if (this.timelineEntries.length === 0) return 0;
		const sum = this.timelineEntries.reduce((acc, entry) => acc + entry.moodScore, 0);
		return Math.round((sum / this.timelineEntries.length) * 10) / 10;
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
