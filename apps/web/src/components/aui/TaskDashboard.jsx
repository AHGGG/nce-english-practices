import React from 'react';
import { Activity, Cpu, Database, Server } from 'lucide-react';

const TaskDashboard = ({ title, status, progress, logs = [], metrics = {}, tasks = [] }) => {
    return (
        <div className="bg-bg-elevated border border-border rounded-xl overflow-hidden font-mono text-xs md:text-sm">
            {/* Header */}
            <div className="bg-bg-elevated p-4 border-b border-border flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <Server className={`w-5 h-5 ${status === 'running' ? 'text-accent-info animate-pulse' :
                        status === 'completed' ? 'text-accent-primary' : 'text-text-muted'}`} />
                    <h3 className="font-bold text-text-primary tracking-wider">{title}</h3>
                </div>
                <div className={`px-2 py-1 rounded text-[10px] uppercase tracking-widest border ${status === 'running' ? 'bg-accent-info/10 border-accent-info text-accent-info' :
                    status === 'completed' ? 'bg-accent-primary/10 border-accent-primary text-accent-primary' :
                        'bg-bg-surface border-border text-text-secondary'
                    }`}>
                    {status}
                </div>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Left Column: Progress & Metrics */}
                <div className="space-y-6">
                    {/* Progress Bar */}
                    <div>
                        <div className="flex justify-between mb-2 text-text-secondary">
                            <span>System Progress</span>
                            <span>{progress}%</span>
                        </div>
                        <div className="h-2 bg-bg-surface rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-accent-info to-neon-purple transition-all duration-300 ease-out"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>

                    {/* Metrics Cards */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-bg-surface p-3 rounded border border-border">
                            <div className="flex items-center gap-2 text-text-secondary mb-2">
                                <Cpu className="w-4 h-4" />
                                <span>CPU Load</span>
                            </div>
                            <div className="text-xl text-text-primary font-bold">{metrics.cpu || 0}%</div>
                        </div>
                        <div className="bg-bg-surface p-3 rounded border border-border">
                            <div className="flex items-center gap-2 text-text-secondary mb-2">
                                <Activity className="w-4 h-4" />
                                <span className="text-text-secondary">Memory</span>
                            </div>
                            <div className="text-xl text-text-primary font-bold">{metrics.memory || 0}MB</div>
                        </div>
                    </div>

                    {/* Task List */}
                    <div className="bg-bg-surface rounded border border-border overflow-hidden">
                        <div className="px-3 py-2 border-b border-border text-text-muted text-[10px] uppercase">
                            Sub-Tasks
                        </div>
                        {tasks.map(task => (
                            <div key={task.id} className="flex items-center justify-between px-3 py-2 border-b border-border last:border-0">
                                <span className={`flex items-center gap-2 ${task.status === 'completed' ? 'text-text-muted line-through' :
                                    task.status === 'running' ? 'text-text-primary' : 'text-text-muted'
                                    }`}>
                                    {task.status === 'completed' ? '✓' :
                                        task.status === 'running' ? '▸' : '•'}
                                    {task.name}
                                </span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded ${task.status === 'completed' ? 'bg-accent-primary/10 text-accent-primary' :
                                    task.status === 'running' ? 'bg-accent-warning/10 text-accent-warning' :
                                        'text-border'
                                    }`}>
                                    {task.status}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Column: Terminal Logs */}
                <div className="bg-bg-base rounded border border-border p-3 flex flex-col h-64">
                    <div className="flex items-center gap-2 text-text-muted text-[10px] mb-2 font-mono border-b border-border pb-2">
                        <div className="w-2 h-2 rounded-full bg-border" />
                        <div className="w-2 h-2 rounded-full bg-border" />
                        <span>TERMINAL OUTPUT</span>
                    </div>
                    <div className="flex-1 overflow-y-auto font-mono text-[10px] space-y-1 scrollbar-thin scrollbar-thumb-border">
                        {logs.map((log, i) => (
                            <div key={i} className="text-accent-info/80">
                                <span className="text-text-muted mr-2">$</span>
                                {log}
                            </div>
                        ))}
                        {status === 'running' && (
                            <div className="animate-pulse text-accent-info">_</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TaskDashboard;
