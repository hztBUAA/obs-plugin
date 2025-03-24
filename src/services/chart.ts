import { Chart } from 'chart.js/auto';
import * as d3 from 'd3';
import { ChartData, TimelineEntry } from '../types';

export class ChartService {
    /**
     * 生成心情趋势图
     */
    generateMoodTrendChart(entries: TimelineEntry[]): ChartData {
        const sortedEntries = [...entries].sort((a, b) => a.date.getTime() - b.date.getTime());
        
        return {
            type: 'mood',
            data: {
                labels: sortedEntries.map(entry => 
                    entry.date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
                ),
                datasets: [{
                    label: '心情指数',
                    data: sortedEntries.map(entry => entry.moodScore),
                    borderColor: 'rgb(75, 192, 192)',
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 5,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        };
    }
    /**
     * 生成活动统计图
     */
    generateActivityChart(entries: TimelineEntry[]): ChartData {
        const activityCount = new Map<string, number>();
        entries.forEach(entry => {
            entry.activities.forEach(activity => {
                activityCount.set(activity, (activityCount.get(activity) || 0) + 1);
            });
        });

        const sortedActivities = Array.from(activityCount.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);

        return {
            type: 'activity',
            data: {
                labels: sortedActivities.map(([activity]) => activity),
                datasets: [{
                    label: '活动次数',
                    data: sortedActivities.map(([, count]) => count),
                    backgroundColor: this.generateColorPalette(sortedActivities.length)
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        };
    }

    /**
     * 生成心情分布图
     */
    generateMoodDistributionChart(entries: TimelineEntry[]): ChartData {
        const distribution = [0, 0, 0, 0, 0]; // 对应1-5分
        entries.forEach(entry => {
            const index = Math.floor(entry.moodScore) - 1;
            if (index >= 0 && index < 5) {
                distribution[index]++;
            }
        });

        const emojis = ['😢', '😔', '😐', '😊', '😄'];

        return {
            type: 'mood',
            data: {
                labels: emojis,
                datasets: [{
                    label: '心情分布',
                    data: distribution,
                    backgroundColor: [
                        '#FF6B6B',
                        '#FFA07A',
                        '#FFD93D',
                        '#95D5B2',
                        '#74C0FC'
                    ]
                }]
            },
            options: {
                responsive: true
            }
        };
    }

    /**
     * 生成月度统计图数据
     */
    generateMonthlyStatsChart(entries: TimelineEntry[]): ChartData {
        const monthlyStats = new Map<string, {count: number, avgMood: number}>();
        
        entries.forEach(entry => {
            const monthKey = entry.date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' });
            const stats = monthlyStats.get(monthKey) || { count: 0, avgMood: 0 };
            stats.count++;
            stats.avgMood = (stats.avgMood * (stats.count - 1) + entry.moodScore) / stats.count;
            monthlyStats.set(monthKey, stats);
        });

        const months = Array.from(monthlyStats.keys());
        const counts = months.map(month => monthlyStats.get(month)!.count);
        const avgMoods = months.map(month => monthlyStats.get(month)!.avgMood);

        return {
            type: 'timeline',
            data: {
                labels: months,
                datasets: [
                    {
                        label: '日记数量',
                        data: counts,
                        backgroundColor: 'rgba(75, 192, 192, 0.2)',
                        borderColor: 'rgb(75, 192, 192)',
                        yAxisID: 'y'
                    },
                    {
                        label: '平均心情',
                        data: avgMoods,
                        backgroundColor: 'rgba(255, 99, 132, 0.2)',
                        borderColor: 'rgb(255, 99, 132)',
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        type: 'linear',
                        position: 'left',
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    },
                    y1: {
                        type: 'linear',
                        position: 'right',
                        beginAtZero: true,
                        max: 5,
                        grid: {
                            drawOnChartArea: false
                        }
                    }
                }
            }
        };
    }

    /**
     * 生成词云图数据
     */
    generateWordCloudChart(entries: TimelineEntry[]): ChartData {
        const wordFreq = new Map<string, number>();
        entries.forEach(entry => {
            entry.keywords.forEach(keyword => {
                wordFreq.set(keyword, (wordFreq.get(keyword) || 0) + 1);
            });
        });

        const words = Array.from(wordFreq.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 50)  // 限制最多50个关键词
            .map(([text, value]) => ({
                text,
                value,
                color: this.getRandomColor()
            }));

        return {
            type: 'wordcloud',
            data: words,
            options: {
                width: 800,
                height: 400,
                padding: 5,
                rotate: () => (~~(Math.random() * 6) - 3) * 30,
                font: "Impact",
                fontSize: (d: {value: number}) => Math.sqrt(d.value) * 10
            }
        };
    }

    /**
     * 生成随机颜色
     */
    private getRandomColor(): string {
        const letters = '0123456789ABCDEF';
        let color = '#';
        for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    }

    /**
     * 生成颜色调色板
     */
    private generateColorPalette(count: number): string[] {
        return d3.quantize(d3.interpolateRainbow, count);
    }

    /**
     * 导出图表为图片
     */
    async exportChart(chart: Chart): Promise<string> {
        return chart.toBase64Image('png');
    }
} 