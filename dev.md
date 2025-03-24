# 日记解析与时间线生成工具开发文档

## 项目结构

```
obs-plugin/
├── src/
│   ├── core/                 # 核心功能模块
│   │   ├── parser.ts        # 日记解析器
│   │   ├── analyzer.ts      # 内容分析器
│   │   └── timeline.ts      # 时间线生成器
│   ├── services/            # 服务模块
│   │   ├── ai/             # AI 服务
│   │   │   ├── openai.ts   # OpenAI 集成
│   │   │   └── ollama.ts   # Ollama 集成
│   │   └── chart.ts        # 图表生成服务
│   ├── types/              # 类型定义
│   │   └── index.ts        # 公共类型定义
│   ├── utils/              # 工具函数
│   │   └── date.ts         # 日期处理工具
│   └── settings/           # 设置相关
│       └── index.ts        # 设置管理器
├── main.ts                 # 插件入口文件
└── manifest.json          # 插件配置文件
```

## 核心功能模块

### 1. 日记解析器 (DiaryParser)
- 功能：扫描和解析 Markdown 格式日记文件
- 主要方法：
  - `scanDiaryFiles()`: 扫描指定目录下的日记文件
  - `parseDiaryContent()`: 解析单个日记文件内容
  - `extractDateInfo()`: 提取日期信息

### 2. 内容分析器 (ContentAnalyzer)
- 功能：分析日记内容，提取关键信息
- 主要方法：
  - `extractKeywords()`: 提取关键词
  - `analyzeMoodScore()`: 分析心情指数
  - `generateSummary()`: 生成内容摘要

### 3. 时间线生成器 (TimelineGenerator)
- 功能：生成时间线数据
- 主要方法：
  - `generateTimelineData()`: 生成时间线 JSON 数据
  - `exportTimeline()`: 导出时间线数据

## AI 服务集成

### OpenAI 集成
- 配置 API 密钥
- 实现摘要生成
- 实现情感分析

### Ollama 集成
- 本地模型配置
- 离线摘要生成
- 离线关键词提取

## 图表生成功能

### 报表类型
1. 心情趋势图
2. 关键词词云
3. 活动统计图
4. 时间分配饼图

### 导出格式
- PDF
- PNG
- SVG

## 设置功能

### 基础设置
- 日记文件夹路径
- 分析日期范围
- 导出格式选择

### AI 设置
- OpenAI API 配置
- Ollama 模型选择
- 摘要生成参数

### 分析设置
- 关键词数量
- 心情指数范围
- 自定义标签

## 开发计划

### 第一阶段：基础功能
1. 项目结构搭建
2. 基础解析器实现
3. 简单时间线生成

### 第二阶段：分析功能
1. 内容分析器实现
2. 关键词提取
3. 心情指数分析

### 第三阶段：AI 集成
1. OpenAI 集成
2. Ollama 集成
3. 智能摘要生成

### 第四阶段：可视化
1. 图表生成
2. 导出功能
3. UI 优化

### 第五阶段：优化和测试
1. 性能优化
2. 错误处理
3. 用户测试反馈

## API 文档

### DiaryParser
```typescript
interface DiaryContent {
  date: Date;
  content: string;
  metadata: {
    title?: string;
    tags?: string[];
  };
}

class DiaryParser {
  scanDiaryFiles(directory: string): Promise<string[]>;
  parseDiaryContent(filePath: string): Promise<DiaryContent>;
  extractDateInfo(content: string): Date;
}
```

### ContentAnalyzer
```typescript
interface AnalysisResult {
  keywords: string[];
  moodScore: number;
  summary: string;
}

class ContentAnalyzer {
  analyze(content: DiaryContent): Promise<AnalysisResult>;
  extractKeywords(text: string): string[];
  analyzeMoodScore(text: string): number;
  generateSummary(text: string): Promise<string>;
}
```

### TimelineGenerator
```typescript
interface TimelineEntry {
  date: Date;
  title: string;
  summary: string;
  keywords: string[];
  moodScore: number;
}

class TimelineGenerator {
  generateTimelineData(entries: AnalysisResult[]): TimelineEntry[];
  exportTimeline(format: 'json' | 'markdown'): string;
}
```

### ChartService
```typescript
interface ChartData {
    type: 'mood' | 'activity' | 'wordcloud' | 'timeline';
    data: any;
    options?: {
        width?: number;
        height?: number;
        padding?: number;
        rotate?: () => number;
        font?: string;
        fontSize?: (d: any) => number;
        responsive?: boolean;
        scales?: any;
    };
}

interface ChartService {
    // 生成心情趋势图
    generateMoodTrendChart(entries: TimelineEntry[]): ChartData;
    
    // 生成词云图数据
    generateWordCloudChart(entries: TimelineEntry[]): ChartData;
    
    // 生成活动统计图
    generateActivityChart(entries: TimelineEntry[]): ChartData;
    
    // 生成心情分布图
    generateMoodDistributionChart(entries: TimelineEntry[]): ChartData;
    
    // 生成月度统计图
    generateMonthlyStatsChart(entries: TimelineEntry[]): ChartData;
}
```

## 注意事项

1. 性能优化
   - 大文件处理
   - 异步操作处理
   - 缓存机制

2. 错误处理
   - 文件读取错误
   - 解析错误
   - API 调用错误

3. 数据安全
   - 本地数据存储
   - API 密钥管理
   - 用户隐私保护

4. 兼容性
   - Obsidian API 版本
   - 不同操作系统
   - 移动端支持 

5. 目前还没有支持日记的模版文字的剔除
   - 需要支持读入模板文件 可在设置中选择
   - 需要纳入模板文字 防止模板文字的干扰（关键词提取（parser）上、 分析（analysis）等等） 


## 目前的工作流程

### 对于单个日记
先parser 解析得到标题、内容、元数据， 然后进行analyse，得到心情、活动、关键词以及总结摘要。
然后利用得到的上述数据（包括content、analysis）进行时间线梳理，能够统一数据格式（TODO:对于单个，可能不需要实现）。 最后利用这里的时间线数据进行chart的生成。

### 对于文件夹下的日记
遍历所有日记文件，进行上述的处理。其中parser、analyser的数据会是数组进行汇总生成后续的时间线和图表数据。