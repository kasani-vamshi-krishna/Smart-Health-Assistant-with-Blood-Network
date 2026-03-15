import React, { useState } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Label, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { FaFilePdf, FaRedo, FaBrain, FaCheckCircle } from 'react-icons/fa';

// Enhanced PlanDisplay Component with proper table rendering
const PlanDisplay = ({ plan }) => {
    return (
        <div>
            <h3 className="text-2xl font-bold text-gray-800 mb-4">Your Personalized AI Plan</h3>
            <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-md">
                <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                        // Style for ### Headings
                        h3: ({node, ...props}) => (
                            <h3 className="text-xl font-bold text-gray-800 mt-6 mb-3 border-b border-gray-300 pb-2" {...props} />
                        ),
                        
                        // Style for ## Headings
                        h2: ({node, ...props}) => (
                            <h2 className="text-2xl font-bold text-gray-800 mt-8 mb-4 border-b-2 border-indigo-200 pb-3" {...props} />
                        ),
                        
                        // Style for bullet points
                        ul: ({node, ...props}) => (
                            <ul className="space-y-2 my-4" {...props} />
                        ),
                        li: ({node, ...props}) => (
                            <li className="flex items-start">
                                <FaCheckCircle className="text-green-500 mr-3 mt-1 flex-shrink-0 text-sm" />
                                <span className="text-gray-700 leading-relaxed">{props.children}</span>
                            </li>
                        ),

                        // Enhanced Table Styling - THIS IS THE MAIN FIX
                        table: ({node, ...props}) => (
                            <div className="overflow-x-auto my-6 shadow-lg rounded-lg border border-gray-200">
                                <table className="min-w-full bg-white" {...props} />
                            </div>
                        ),
                        thead: ({node, ...props}) => (
                            <thead className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white" {...props} />
                        ),
                        tbody: ({node, ...props}) => (
                            <tbody className="divide-y divide-gray-200" {...props} />
                        ),
                        tr: ({node, ...props}) => (
                            <tr className="hover:bg-gray-50 transition-colors duration-150" {...props} />
                        ),
                        th: ({node, ...props}) => (
                            <th 
                                scope="col" 
                                className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider text-white"
                                {...props} 
                            />
                        ),
                        td: ({node, ...props}) => (
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-b border-gray-100" {...props} />
                        ),

                        // Style for **highlighted** text
                        strong: ({node, ...props}) => (
                            <strong className="font-bold text-indigo-600" {...props} />
                        ),
                        
                        // Style for paragraphs
                        p: ({node, ...props}) => (
                            <p className="text-gray-700 leading-relaxed mb-4" {...props} />
                        ),

                        // Style for ordered lists
                        ol: ({node, ...props}) => (
                            <ol className="space-y-2 my-4 list-decimal list-inside pl-4" {...props} />
                        ),

                        // Style for blockquotes
                        blockquote: ({node, ...props}) => (
                            <blockquote className="border-l-4 border-indigo-500 pl-4 py-2 my-4 bg-indigo-50 text-gray-700 italic" {...props} />
                        ),

                        // Style for code blocks
                        code: ({node, inline, ...props}) => 
                            inline ? (
                                <code className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm font-mono" {...props} />
                            ) : (
                                <code className="block bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm font-mono my-4" {...props} />
                            ),
                    }}
                >
                    {plan}
                </ReactMarkdown>
            </div>
        </div>
    );
};

// New Component for a single parameter's detailed chart
const ParameterDetailChart = ({ item }) => {
    const { name, value, range, avg } = item;
    const [min, max] = range;

    const chartData = [{ name, value }];
    const domainMax = Math.max(max, value) * 1.2;

    let statusColor = '#22c55e'; // Green for normal
    if (value < min || value > max) {
        statusColor = '#ef4444'; // Red for outside range
    }

    return (
        <div className="p-4 bg-white rounded-lg shadow-md transition-all hover:shadow-xl">
            <div className="flex justify-between items-baseline mb-2">
                <p className="text-sm font-bold text-gray-700">{name}</p>
                <p className="text-xl font-extrabold" style={{ color: statusColor }}>{value}</p>
            </div>
            <ResponsiveContainer width="100%" height={60}>
                <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <XAxis type="number" hide domain={[0, domainMax]} />
                    <YAxis type="category" dataKey="name" hide />
                    <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ background: 'white', border: '1px solid #ddd', borderRadius: '8px' }}/>
                    {/* Background bar for range */}
                    <Bar dataKey={() => max} barSize={12} stackId="a" fill="#e2e8f0" radius={[6, 6, 6, 6]} />
                    {/* User value bar */}
                    <Bar dataKey="value" barSize={12} stackId="a" fill={statusColor} radius={[6, 6, 6, 6]} />
                </BarChart>
            </ResponsiveContainer>
            <div className="flex justify-between text-xs text-gray-500 mt-1 px-2">
                <span>Low ({min})</span>
                <span>Avg ({avg})</span>
                <span>High ({max})</span>
            </div>
        </div>
    );
};

const PredictionResult = ({ result, title, inputs, onReset, diseaseType }) => {
    const [plan, setPlan] = useState(null);
    const [isPlanLoading, setIsPlanLoading] = useState(false);
    const { diagnosis, risk_score, risk_category, prediction, normal_ranges } = result;
    
    const riskColor = risk_category === 'Low Risk' ? '#22c55e' : risk_category === 'Moderate Risk' ? '#f59e0b' : '#ef4444';
    const chartData = [{ name: 'Risk Score', score: risk_score }];

    // Prepare data for Radar Chart
    const radarChartData = Object.keys(inputs).map(key => {
        const value = parseFloat(inputs[key]);
        const range = normal_ranges[key] || { min: 0, max: 1, avg: 0.5 };
        // Normalize the value: 100 is average, deviation shows difference
        const normalizedValue = range.avg > 0 ? (value / range.avg) * 100 : 0;
        return {
            subject: key.replace(/([A-Z])/g, ' $1').trim(),
            userValue: normalizedValue,
            fullMark: 200 // Represents 2x the average
        };
    });

    // Prepare data for detailed parameter charts
    const parameterDetails = Object.keys(inputs).map(key => {
        const range = normal_ranges[key] || { min: 0, max: 0, avg: 0 };
        return {
            name: key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim(),
            value: parseFloat(inputs[key]),
            range: [range.min, range.max],
            avg: range.avg
        };
    });

    const handleGeneratePlan = async () => {
        setIsPlanLoading(true);
        try {
            const response = await axios.post('http://127.0.0.1:5000/generate-plan', {
                disease_type: diseaseType,
                inputs,
                prediction
            });
            setPlan(response.data.plan);
        } catch (error) {
            console.error("Error generating plan:", error);
            setPlan("Failed to generate a personalized plan. Please try again.");
        } finally {
            setIsPlanLoading(false);
        }
    };

    const handleDownloadPdf = () => {
        axios.post('http://127.0.0.1:5000/generate-pdf', {
            title, diagnosis, risk_score, risk_category, plan, inputs
        }, { responseType: 'blob' })
        .then((response) => {
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'Health_AI_Report.pdf');
            document.body.appendChild(link);
            link.click();
            link.remove();
        }).catch(error => {
            console.error("Error downloading PDF:", error);
            alert("Failed to download PDF report.");
        });
    };

    return (
        <div className="bg-gray-50/50 p-4 md:p-6 lg:p-8 rounded-xl shadow-2xl animate-fade-in space-y-8 lg:space-y-10">
            {/* Section 1: Top Summary */}
            <div className="bg-white p-4 md:p-6 rounded-lg shadow-md">
                <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-4 md:mb-6 border-b pb-4">Prediction Summary</h2>
                <div className="grid lg:grid-cols-2 gap-6 lg:gap-8">
                    <div>
                        <h3 className="text-base md:text-lg font-semibold text-gray-600">Diagnosis Result</h3>
                        <p className={`text-2xl md:text-3xl font-bold my-2`} style={{ color: prediction === 1 ? '#ef4444' : '#22c55e' }}>{diagnosis}</p>
                        <h3 className="text-base md:text-lg font-semibold text-gray-600 mt-4 md:mt-6">Overall Risk Analysis</h3>
                        <p className="text-sm md:text-base my-2 text-gray-700">
                            Your calculated risk score is <span className="font-extrabold text-xl md:text-2xl" style={{ color: riskColor }}>{risk_score}</span> out of 100, placing you in the <span className="font-bold" style={{ color: riskColor }}>{risk_category}</span> category.
                        </p>
                    </div>
                    <div className="flex flex-col items-center justify-center bg-gray-50/70 p-4 rounded-lg">
                         <ResponsiveContainer width="100%" height={120}>
                            <BarChart layout="vertical" data={chartData} margin={{ top: 20, right: 50, left: 20, bottom: 20 }}>
                                <XAxis type="number" domain={[0, 100]} stroke="#a0aec0" tick={{ fill: '#4a5568' }} />
                                <YAxis type="category" dataKey="name" hide />
                                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ background: 'white', border: '1px solid #ddd', borderRadius: '8px' }}/>
                                <Bar dataKey="score" barSize={40} radius={[20, 20, 20, 20]}>
                                    <Cell fill={riskColor} />
                                    <Label value={`${risk_score}/100`} position="right" offset={10} style={{ fill: riskColor, fontWeight: 'bold', fontSize: '16px' }} />
                                 </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Section 2: Parameter Analysis */}
            <div className="bg-white p-4 md:p-6 rounded-lg shadow-md">
                <h3 className="text-xl md:text-2xl font-bold text-gray-800 mb-4 md:mb-6">In-Depth Parameter Analysis</h3>
                <div className="grid xl:grid-cols-3 gap-6 lg:gap-8">
                    <div className="xl:col-span-1 flex items-center justify-center bg-gray-50/70 p-4 rounded-lg min-h-[250px] md:min-h-[300px]">
                        <ResponsiveContainer width="100%" height={300}>
                            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarChartData}>
                                <PolarGrid />
                                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: '#4A5568' }} />
                                <PolarRadiusAxis angle={30} domain={[0, 200]} />
                                <Radar name="Your Value" dataKey="userValue" stroke="#6366F1" fill="#818CF8" fillOpacity={0.6} />
                                <Tooltip />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="xl:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                        {parameterDetails.map(item => <ParameterDetailChart key={item.name} item={item} />)}
                    </div>
                </div>
            </div>

            {/* Section 3: AI Plan */}
            <div className="bg-white p-4 md:p-6 rounded-lg shadow-md">
                {!plan && !isPlanLoading && (
                     <div className="text-center p-4 md:p-6 bg-indigo-50 rounded-lg border-2 border-dashed border-indigo-200">
                        <h3 className="text-lg md:text-xl font-bold text-gray-800 mb-2">Ready for the Next Step?</h3>
                        <p className="text-sm md:text-base text-gray-600 mb-4">Get a personalized wellness plan based on your results, generated by Gemini AI.</p>
                        <button 
                            onClick={handleGeneratePlan} 
                            className="inline-flex items-center px-6 md:px-8 py-3 bg-indigo-600 text-white font-bold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-75 transition-transform transform hover:scale-105 text-sm md:text-base"
                        >
                           <FaBrain className="mr-2 md:mr-3 h-4 w-4 md:h-5 md:w-5" />
                           Generate My AI Plan
                        </button>
                     </div>
                )}
                {isPlanLoading && (
                    <div className="flex justify-center items-center flex-col p-6 md:p-8 text-center bg-gray-50/70 rounded-lg">
                        <div className="animate-spin rounded-full h-10 w-10 md:h-12 md:w-12 border-b-2 border-indigo-600"></div>
                        <p className="mt-4 text-gray-600 font-semibold text-sm md:text-base">Gemini AI is crafting your personalized plan...</p>
                    </div>
                )}
                {plan && <PlanDisplay plan={plan} />}
            </div>

            {/* Section 4: Action Buttons */}
            <div className="mt-6 flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4 pt-4">
                <button 
                    onClick={onReset} 
                    className="inline-flex items-center justify-center px-4 md:px-6 py-2.5 bg-gray-600 text-white font-semibold rounded-lg shadow-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-75 transition-colors text-sm md:text-base"
                >
                    <FaRedo className="mr-2 h-4 w-4" /> New Prediction
                </button>
                <button 
                    onClick={handleDownloadPdf} 
                    disabled={!plan} 
                    className="inline-flex items-center justify-center px-4 md:px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75 transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed text-sm md:text-base"
                >
                    <FaFilePdf className="mr-2 h-4 w-4" /> Download Report (PDF)
                </button>
            </div>
        </div>
    );
};

export default PredictionResult;