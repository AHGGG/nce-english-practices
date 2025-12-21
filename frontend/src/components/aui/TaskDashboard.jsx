import React from 'react';
import { Activity, Cpu, Database, Server } from 'lucide-react';

const TaskDashboard = ({ title, status, progress, logs = [], metrics = {}, tasks = [] }) => {
    return (
        <div className="bg-[#111] border border-[#333] rounded-xl overflow-hidden font-mono text-xs md:text-sm">
            {/* Header */}
            <div className="bg-[#1A1A1A] p-4 border-b border-[#333] flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <Server className={`w-5 h-5 ${status === 'running' ? 'text-neon-cyan animate-pulse' :
                        status === 'completed' ? 'text-neon-green' : 'text-[#666]'}`} />
                    <h3 className="font-bold text-white tracking-wider">{title}</h3>
                </div>
                <div className={`px-2 py-1 rounded text-[10px] uppercase tracking-widest border ${status === 'running' ? 'bg-neon-cyan/10 border-neon-cyan text-neon-cyan' :
                        status === 'completed' ? 'bg-neon-green/10 border-neon-green text-neon-green' :
                            'bg-[#222] border-[#444] text-[#888]'
                    }`}>
                    {status}
                </div>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Left Column: Progress & Metrics */}
                <div className="space-y-6">
                    {/* Progress Bar */}
                    <div>
                        <div className="flex justify-between mb-2 text-[#888]">
                            <span>System Progress</span>
                            <span>{progress}%</span>
                        </div>
                        <div className="h-2 bg-[#222] rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-neon-cyan to-neon-purple transition-all duration-300 ease-out"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>

                    {/* Metrics Cards */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-[#0A0A0A] p-3 rounded border border-[#222]">
                            <div className="flex items-center gap-2 text-[#888] mb-2">
                                <Cpu className="w-4 h-4" />
                                <span>CPU Load</span>
                            </div>
                            <div className="text-xl text-white font-bold">{metrics.cpu || 0}%</div>
                        </div>
                        <div className="bg-[#0A0A0A] p-3 rounded border border-[#222]">
                            <div className="flex items-center gap-2 text-[#888] mb-2">
                                <Activity className="w-4 h-4" />
                                <span>Memory</span>
                            </div>
                            <div className="text-xl text-white font-bold">{metrics.memory || 0}MB</div>
                        </div>
                    </div>

                    {/* Task List */}
                    <div className="bg-[#0A0A0A] rounded border border-[#222] overflow-hidden">
                        <div className="px-3 py-2 border-b border-[#222] text-[#666] text-[10px] uppercase">
                            Sub-Tasks
                        </div>
                        {tasks.map(task => (
                            <div key={task.id} className="flex items-center justify-between px-3 py-2 border-b border-[#222] last:border-0">
                                <span className={`flex items-center gap-2 ${task.status === 'completed' ? 'text-[#666] line-through' :
                                        task.status === 'running' ? 'text-white' : 'text-[#444]'
                                    }`}>
                                    {task.status === 'completed' ? '✓' :
                                        task.status === 'running' ? '▸' : '•'}
                                    {task.name}
                                </span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded ${task.status === 'completed' ? 'bg-neon-green/10 text-neon-green' :
                                        task.status === 'running' ? 'bg-neon-yellow/10 text-neon-yellow' :
                                            'text-[#333]'
                                    }`}>
                                    {task.status}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Column: Terminal Logs */}
                <div className="bg-[#050505] rounded border border-[#222] p-3 flex flex-col h-64">
                    <div className="flex items-center gap-2 text-[#444] text-[10px] mb-2 font-mono border-b border-[#222] pb-2">
                        <div className="w-2 h-2 rounded-full bg-[#333]" />
                        <div className="w-2 h-2 rounded-full bg-[#333]" />
                        <span>TERMINAL OUTPUT</span>
                    </div>
                    <div className="flex-1 overflow-y-auto font-mono text-[10px] space-y-1 scrollbar-thin scrollbar-thumb-[#333]">
                        {logs.map((log, i) => (
                            <div key={i} className="text-neon-cyan/80">
                                <span className="text-[#444] mr-2">$</span>
                                {log}
                            </div>
                        ))}
                        {status === 'running' && (
                            <div className="animate-pulse text-neon-cyan">_</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TaskDashboard;
