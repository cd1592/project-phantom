import React from 'react';
import { LineChart, AreaChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { PlusCircle, Trash2, Download, AlertCircle, ArrowLeft, ArrowRight, Target, CheckCircle, Zap, BarChart2, SlidersHorizontal, TrendingUp, TrendingDown, Sigma, Calendar, Settings, BrainCircuit, Sparkles } from 'lucide-react';

// --- Mock ShadCN UI Components ---
const Card = ({ children, className }) => <div className={`bg-white border border-gray-200 rounded-xl shadow-sm ${className}`}>{children}</div>;
const CardHeader = ({ children, className }) => <div className={`p-6 border-b border-gray-200 ${className}`}>{children}</div>;
const CardContent = ({ children, className }) => <div className={`p-6 ${className}`}>{children}</div>;
const CardFooter = ({ children, className }) => <div className={`p-6 border-t border-gray-200 flex items-center ${className}`}>{children}</div>;
const CardTitle = ({ children, className }) => <h2 className={`text-xl font-semibold text-gray-800 ${className}`}>{children}</h2>;
const CardDescription = ({ children, className }) => <p className={`text-sm text-gray-500 ${className}`}>{children}</p>;
const Input = (props) => <input {...props} className={`w-full px-3 py-2 text-sm text-gray-700 bg-gray-50 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-150 ease-in-out ${props.className}`} />;
const Textarea = (props) => <textarea {...props} className={`w-full px-3 py-2 text-sm text-gray-700 bg-gray-50 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-150 ease-in-out ${props.className}`} />;
const Button = ({ children, variant = 'default', ...props }) => {
  const baseClasses = "inline-flex items-center justify-center px-4 py-2 text-sm font-semibold border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors";
  const variants = {
    default: "text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 border-transparent disabled:bg-gray-400 disabled:cursor-not-allowed",
    outline: "text-gray-700 bg-white hover:bg-gray-50 focus:ring-blue-500 border-gray-300",
    ghost: "text-gray-700 hover:bg-gray-100 hover:text-gray-900 focus:ring-gray-500 border-transparent",
  };
  return <button {...props} className={`${baseClasses} ${variants[variant]} ${props.className}`}>{children}</button>;
};
const Select = ({ children, ...props }) => <select {...props} className={`w-full px-3 py-2 text-sm text-gray-700 bg-gray-50 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${props.className}`}>{children}</select>;

// --- Helper & Calculation Functions ---
const interpolate = (year, points) => {
    const sortedYears = Object.keys(points).map(Number).sort((a, b) => a - b);
    const getNumericValue = (val) => parseFloat(val) || 0;
    if (year <= sortedYears[0]) return getNumericValue(points[sortedYears[0]]);
    if (year >= sortedYears[sortedYears.length - 1]) return getNumericValue(points[sortedYears[sortedYears.length - 1]]);
    let startYear, endYear;
    for (let i = 0; i < sortedYears.length - 1; i++) {
        if (year >= sortedYears[i] && year <= sortedYears[i + 1]) {
            startYear = sortedYears[i]; endYear = sortedYears[i + 1]; break;
        }
    }
    if (startYear === undefined || endYear === undefined) return 0;
    const startValue = getNumericValue(points[startYear]);
    const endValue = getNumericValue(points[endYear]);
    const yearDiff = endYear - startYear;
    if (yearDiff === 0) return startValue;
    const valueDiff = endValue - startValue;
    const annualIncrement = valueDiff / yearDiff;
    return startValue + (year - startYear) * annualIncrement;
};

const calculateBassCurve = (m, p, q, startYear, forecastEndYear) => {
    if (!(m > 0) || !(p >= 0 && p <= 0.1) || !(q >= 0.1 && q <= 1.0)) return [];
    const results = [];
    let cumulativeAdopters = 0;
    for (let t = 0; t <= (forecastEndYear - startYear); t++) {
        const year = startYear + t;
        let annualAdopters = 0;
        if (cumulativeAdopters < m) {
            annualAdopters = (p + q * (cumulativeAdopters / m)) * (m - cumulativeAdopters);
            if (cumulativeAdopters + annualAdopters > m) { annualAdopters = m - cumulativeAdopters; }
        }
        cumulativeAdopters += annualAdopters;
        results.push({ year, S_Gen: annualAdopters > 0 ? annualAdopters : 0, N_Gen: cumulativeAdopters });
    }
    return results;
};

// --- Main Application Component ---
export default function App() {
  const { useState, useMemo, useEffect } = React;
  const [step, setStep] = useState(1);
  const [country, setCountry] = useState('USA');
  const [salesDataRaw, setSalesDataRaw] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const KEY_SPLIT_YEARS = [2004, 2025, 2045];
  const initialApplications = [
      { id: 1, name: 'Long Haul', splits: { 2004: 30, 2025: 40, 2045: 50 } },
      { id: 2, name: 'Construction', splits: { 2004: 30, 2025: 25, 2045: 15 } },
      { id: 3, name: 'Regional Delivery', splits: { 2004: 30, 2025: 25, 2045: 25 } },
      { id: 4, name: 'Other', splits: { 2004: 10, 2025: 10, 2045: 10 } },
  ];
  const [applications, setApplications] = useState(initialApplications);
  const [splitValidationError, setSplitValidationError] = useState('');

  // --- Step 3 State ---
  const [actualVioHistory, setActualVioHistory] = useState({ 2020: '', 2021: '', 2022: '', 2023: '', 2024: '' });
  const [avgFleetAgeHistory, setAvgFleetAgeHistory] = useState({ 2020: '', 2021: '', 2022: '', 2023: '', 2024: '' });
  const [calibrationWeight, setCalibrationWeight] = useState(50); // 50 = 50% VIO, 50% Age
  const [calibrationResult, setCalibrationResult] = useState(null);
  const [isCalibrating, setIsCalibrating] = useState(false);

  // --- Step 4 State ---
  const [currentAppIndex, setCurrentAppIndex] = useState(0);
  const [step4Data, setStep4Data] = useState({});
  const [isSimulating, setIsSimulating] = useState(false);
  const [monteCarloRuns, setMonteCarloRuns] = useState(1000);

  const initStep4AppData = () => {
    const pFactors = [
        { id: 1, name: 'TCO Parity', weight: 3, scoreRange: 2, changeRange: 5 }, 
        { id: 2, name: 'Subsidies', weight: 3, scoreRange: 1, changeRange: 5 },
        { id: 3, name: 'Regulatory Push', weight: 2, scoreRange: 0, changeRange: 0 }, 
        { id: 4, name: 'Product Availability', weight: 2, scoreRange: 1, changeRange: 2 }
    ];
    const qFactors = [
        { id: 1, name: 'Charging Infra', weight: 3, scoreRange: 2, changeRange: 5 }, 
        { id: 2, name: 'Word of Mouth', weight: 3, scoreRange: 1, changeRange: 5 },
        { id: 3, name: 'Resale Value', weight: 2, scoreRange: 1, changeRange: 3 }, 
        { id: 4, name: 'Maintenance Network', weight: 2, scoreRange: 2, changeRange: 4 }
    ];

    const pFactorChanges = {};
    pFactors.forEach(f => { pFactorChanges[f.id] = { stage1: -5, stage2: -10, stage3: -15 }; });
    const qFactorChanges = {};
    qFactors.forEach(f => { qFactorChanges[f.id] = { stage1: 5, stage2: 10, stage3: 15 }; });

    return {
        powertrainSplits: {
            base: { ICE: 70, H2ICE: 5, NG: 5, BEV: 10, FCEV: 10 },
        },
        genParams: { startYear: 2015, endYear: 2045, duration: 5, overlap: 2 },
        generatedGenerations: [],
        marketShares: {},
        pFactors,
        qFactors,
        gen1Scores: { p: {1: 7, 2: 6, 3: 8, 4: 5}, q: {1: 6, 2: 7, 3: 5, 4: 4} },
        pFactorChanges,
        qFactorChanges,
        finalCurves: null
    };
  };

  useEffect(() => {
    setStep4Data(prev => {
        const newState = {...prev};
        applications.forEach(app => { if (!newState[app.id]) { newState[app.id] = initStep4AppData(); }});
        return newState;
    });
  }, [applications]);

  const START_YEAR = 2004;
  const END_YEAR = 2045;
  const VIO_START_YEAR = 2020;
  const CHART_START_YEAR = 2020;
  const CHART_COLORS = ['#3b82f6', '#10b981', '#f97316', '#8b5cf6', '#ec4899', '#ef4444', '#6b7280'];
  const PERCENTILE_COLORS = { p10: '#ef4444', p25: '#f97316', p50: '#059669', p75: '#3b82f6', p90: '#8b5cf6'};


  const parsedData = useMemo(() => {
    if (!salesDataRaw) { setErrorMessage(''); return []; }
    const lines = salesDataRaw.split('\n').filter(line => line.trim() !== '');
    const numbers = lines.map(line => parseFloat(line.replace(/,/g, '')));
    if (numbers.some(isNaN)) { setErrorMessage('Invalid data.'); return []; }
    if (numbers.length > 0 && numbers.length !== (END_YEAR - START_YEAR + 1)) { setErrorMessage(`Provide ${END_YEAR - START_YEAR + 1} values.`); return []; }
    setErrorMessage('');
    return numbers.map((sales, index) => ({ year: START_YEAR + index, sales }));
  }, [salesDataRaw]);

  const isStep1DataValid = useMemo(() => country.trim() !== '' && parsedData.length === (END_YEAR - START_YEAR + 1) && errorMessage === '', [country, parsedData, errorMessage]);

  useEffect(() => {
    let error = '';
    for (const year of KEY_SPLIT_YEARS) {
        const sum = applications.reduce((acc, app) => acc + (parseFloat(app.splits[year]) || 0), 0);
        if (Math.abs(100 - sum) > 0.01) { error = `The sum of splits for ${year} is ${sum.toFixed(1)}%, not 100%.`; break; }
    }
    setSplitValidationError(error);
  }, [applications]);

  const salesByYear = useMemo(() => new Map(parsedData.map(d => [d.year, d.sales])), [parsedData]);

  const forecastData = useMemo(() => {
    if (splitValidationError || !isStep1DataValid) return [];
    const results = [];
    for (let year = START_YEAR; year <= END_YEAR; year++) {
      const totalSales = salesByYear.get(year) || 0;
      const yearData = { year };
      applications.forEach(app => {
        if (app.name.trim()) { yearData[app.name] = (totalSales * interpolate(year, app.splits)) / 100; }
      });
      results.push(yearData);
    }
    return results;
  }, [applications, salesByYear, splitValidationError, isStep1DataValid]);

  const isStep2DataValid = useMemo(() => !splitValidationError && applications.every(a => a.name.trim() !== ''), [splitValidationError, applications]);

  // --- Step 3 Logic ---
  const handleCalibrate = () => {
      setIsCalibrating(true);
      setTimeout(() => {
          let bestFit = { error: Infinity, params: {k: 2.5, l: 20} }; // Default params in case no valid data is entered
          const salesMap = new Map(parsedData.map(p => [p.year, p.sales]));
          const targetYears = Object.keys(actualVioHistory).map(Number);
          const vioWeight = calibrationWeight / 100;
          const ageWeight = 1 - vioWeight;

          for (let k = 1.5; k <= 4.5; k += 0.2) { 
              for (let l = 10; l <= 30; l += 0.5) { 
                  const survivalCurve = new Map();
                  for(let age = 0; age <= 40; age++) { survivalCurve.set(age, Math.exp(-Math.pow(age / l, k))); }
                  let totalVioError = 0, totalAgeError = 0, vioPoints = 0, agePoints = 0;
                  targetYears.forEach(year => {
                      let calculatedVio = 0, totalVehicles = 0, totalAgeSum = 0;
                      for (let i = 0; i <= 40; i++) {
                          const salesYear = year - i;
                          if (salesMap.has(salesYear)) {
                              const survivingVehicles = salesMap.get(salesYear) * (survivalCurve.get(i) || 0);
                              calculatedVio += survivingVehicles;
                              totalVehicles += survivingVehicles;
                              totalAgeSum += survivingVehicles * i;
                          }
                      }
                      const actualVio = parseFloat(actualVioHistory[year]);
                      if (!isNaN(actualVio) && actualVio > 0) { totalVioError += Math.pow((calculatedVio - actualVio) / actualVio, 2); vioPoints++; }
                      const calculatedAvgAge = totalVehicles > 0 ? totalAgeSum / totalVehicles : 0;
                      const actualAvgAge = parseFloat(avgFleetAgeHistory[year]);
                      if (!isNaN(actualAvgAge) && actualAvgAge > 0) { totalAgeError += Math.pow((calculatedAvgAge - actualAvgAge) / actualAvgAge, 2); agePoints++; }
                  });
                  const avgVioError = vioPoints > 0 ? totalVioError / vioPoints : 0;
                  const avgAgeError = agePoints > 0 ? totalAgeError / agePoints : 0;

                  if (vioPoints > 0 || agePoints > 0) {
                      const totalError = (vioWeight * avgVioError) + (ageWeight * avgAgeError);
                      if (totalError < bestFit.error) { bestFit = { error: totalError, params: { k, l } }; }
                  }
              }
          }

          const finalSurvivalCurve = new Map();
          const retirementCurve = [];
          for(let age = 0; age <= 40; age++) {
              const survivalProb = Math.exp(-Math.pow(age / bestFit.params.l, bestFit.params.k));
              finalSurvivalCurve.set(age, survivalProb);
              const prevSurvivalProb = age > 0 ? Math.exp(-Math.pow((age-1) / bestFit.params.l, bestFit.params.k)) : 1;
              retirementCurve.push({ age, 'Retirement %': (prevSurvivalProb - survivalProb) * 100 });
          }
          const vioForecast = [];
          for (let year = VIO_START_YEAR; year <= END_YEAR; year++) {
              const row = { year }; let totalVio = 0;
              applications.forEach(app => {
                  let appVio = 0;
                  for (let i = 0; i <= 40; i++) {
                      const salesYear = year - i;
                      const appSales = forecastData.find(d => d.year === salesYear)?.[app.name] || 0;
                      appVio += appSales * (finalSurvivalCurve.get(i) || 0);
                  }
                  row[app.id] = appVio; totalVio += appVio;
              });
              let totalFleetVehicles = 0, totalFleetAgeSum = 0;
              for (let i = 0; i <= 40; i++) {
                 const salesYear = year - i;
                 if(salesMap.has(salesYear)) {
                    const surviving = salesMap.get(salesYear) * (finalSurvivalCurve.get(i) || 0);
                    totalFleetVehicles += surviving; totalFleetAgeSum += surviving * i;
                 }
              }
              row.totalCalculated = totalVio;
              row.avgAgeCalculated = totalFleetVehicles > 0 ? totalFleetAgeSum / totalFleetVehicles : 0;
              vioForecast.push(row);
          }
          setCalibrationResult({ retirementCurve, vioForecast });
          setIsCalibrating(false);
      }, 50);
  };

  const isStep3DataValid = useMemo(() => {
      const hasAtLeastOneVio = Object.values(actualVioHistory).some(v => v && !isNaN(v));
      const hasAtLeastOneAge = Object.values(avgFleetAgeHistory).some(v => v && !isNaN(v));
      return hasAtLeastOneVio || hasAtLeastOneAge;
  }, [actualVioHistory, avgFleetAgeHistory]);

  const calibratedVioData = useMemo(() => calibrationResult?.vioForecast || [], [calibrationResult]);

  // --- STEP 4 LOGIC ---
  const currentApplication = applications[currentAppIndex];
  const currentStep4Data = currentApplication ? step4Data[currentApplication.id] : null;

  const handleStep4DataChange = (appId, field, value) => setStep4Data(prev => ({ ...prev, [appId]: { ...prev[appId], [field]: value } }));

  const handleFactorChange = (appId, factorType, factorId, field, value) => {
    const appData = step4Data[appId];
    if (!appData) return;
    const factors = appData[factorType];
    const updatedFactors = factors.map(f => f.id === factorId ? { ...f, [field]: value } : f);
    handleStep4DataChange(appId, factorType, updatedFactors);
  };

  const handleScoreChange = (appId, scoreType, factorId, value) => {
      const numValue = Math.max(1, Math.min(10, parseFloat(value) || 1));
      const appData = step4Data[appId];
      if (!appData) return;
      const newScores = { ...appData.gen1Scores, [scoreType]: { ...appData.gen1Scores[scoreType], [factorId]: numValue } };
      handleStep4DataChange(appId, 'gen1Scores', newScores);
  };

  const handleFactorPercentageChange = (appId, factorType, factorId, stage, value) => {
      const appData = step4Data[appId];
      if (!appData) return;
      const newChanges = { ...appData[factorType], [factorId]: { ...appData[factorType][factorId], [stage]: parseFloat(value) || 0 } };
      handleStep4DataChange(appId, factorType, newChanges);
  };

  const generationBuckets = useMemo(() => {
      if (!currentStep4Data || currentStep4Data.generatedGenerations.length === 0) return [];
      const totalGens = currentStep4Data.generatedGenerations.length;
      const bucketSize = Math.ceil(totalGens / 3);
      return [
          { stage: 'stage1', label: `Gen 1-${Math.min(bucketSize, totalGens)}` },
          { stage: 'stage2', label: `Gen ${bucketSize + 1}-${Math.min(bucketSize * 2, totalGens)}` },
          { stage: 'stage3', label: `Gen ${bucketSize * 2 + 1}-${totalGens}` },
      ].filter((b, i) => i === 0 || bucketSize * i < totalGens);
  }, [currentStep4Data?.generatedGenerations]);

  const totalVioForMarketPotentialStep4 = useMemo(() => calibratedVioData.find(row => row.year === END_YEAR)?.[currentApplication?.id] || 0, [calibratedVioData, currentApplication, END_YEAR]);
  const powertrainSplitSum = useMemo(() => !currentStep4Data ? 0 : Object.values(currentStep4Data.powertrainSplits.base).reduce((sum, val) => sum + (parseFloat(val) || 0), 0), [currentStep4Data?.powertrainSplits]);
  const marketShareSum = useMemo(() => !currentStep4Data ? 0 : Object.values(currentStep4Data.marketShares).reduce((sum, val) => sum + (parseFloat(val) || 0), 0), [currentStep4Data?.marketShares]);

  const pWeightSum = useMemo(() => currentStep4Data?.pFactors.reduce((sum, f) => sum + (parseFloat(f.weight) || 0), 0) || 0, [currentStep4Data?.pFactors]);
  const qWeightSum = useMemo(() => currentStep4Data?.qFactors.reduce((sum, f) => sum + (parseFloat(f.weight) || 0), 0) || 0, [currentStep4Data?.qFactors]);

  const handleGenerateGenerations = (appId) => {
    const { startYear, endYear, duration, overlap } = currentStep4Data.genParams;
    const gens = []; let id = 1;
    for (let currentStart = parseInt(startYear); currentStart < parseInt(endYear); currentStart += (parseInt(duration) - parseInt(overlap))) {
        gens.push({ id, start: currentStart, end: currentStart + parseInt(duration) }); id++;
    }
    handleStep4DataChange(appId, 'generatedGenerations', gens);
    handleStep4DataChange(appId, 'marketShares', {}); 
  };

  // Effect to clear results if inputs change
  useEffect(() => {
      if (currentStep4Data && currentApplication) {
          handleStep4DataChange(currentApplication.id, 'finalCurves', null);
      }
  }, [
      JSON.stringify(currentStep4Data?.pFactors),
      JSON.stringify(currentStep4Data?.qFactors),
      JSON.stringify(currentStep4Data?.gen1Scores),
      JSON.stringify(currentStep4Data?.pFactorChanges),
      JSON.stringify(currentStep4Data?.qFactorChanges),
      JSON.stringify(currentStep4Data?.marketShares)
  ]);

  const deterministicCalculations = useMemo(() => {
    if (!currentStep4Data || currentStep4Data.generatedGenerations.length === 0) return { p: [], q: [], pAndQ: [] };
    const { pFactors, qFactors, gen1Scores, pFactorChanges, qFactorChanges, generatedGenerations } = currentStep4Data;

    const pScoresByGen = [];
    const qScoresByGen = [];

    let lastpScores = {};
    pFactors.forEach(f => { lastpScores[f.id] = parseFloat(gen1Scores.p?.[f.id]) || 0; });

    let lastqScores = {};
    qFactors.forEach(f => { lastqScores[f.id] = parseFloat(gen1Scores.q?.[f.id]) || 0; });

    const bucketSize = Math.ceil(generatedGenerations.length / 3);

    for (let i = 0; i < generatedGenerations.length; i++) {
        if (i > 0) {
            const currentBucket = Math.floor((i-1) / bucketSize);
            const stage = `stage${currentBucket + 1}`;

            const newpScores = {...lastpScores};
            pFactors.forEach(f => {
                const change = parseFloat(pFactorChanges[f.id]?.[stage]) || 0;
                newpScores[f.id] *= (1 + change / 100);
                newpScores[f.id] = Math.max(1, Math.min(10, newpScores[f.id]));
            });
            lastpScores = newpScores;

            const newqScores = {...lastqScores};
            qFactors.forEach(f => {
                const change = parseFloat(qFactorChanges[f.id]?.[stage]) || 0;
                newqScores[f.id] *= (1 + change / 100);
                newqScores[f.id] = Math.max(1, Math.min(10, newqScores[f.id]));
            });
            lastqScores = newqScores;
        }
        pScoresByGen.push(lastpScores);
        qScoresByGen.push(lastqScores);
    }

    const pAndQ = pScoresByGen.map((pScores, index) => {
        const qScores = qScoresByGen[index];
        const pSum = pFactors.reduce((sum, f) => sum + (pScores[f.id] * (f.weight || 0)), 0);
        const qSum = qFactors.reduce((sum, f) => sum + (qScores[f.id] * (f.weight || 0)), 0);
        return { genId: index + 1, p: pSum / 1000, q: qSum / 100 };
    });

    return { p: pScoresByGen, q: qScoresByGen, pAndQ };
  }, [currentStep4Data]);

  const runMonteCarloSimulation = (appId) => {
      setIsSimulating(true);
      setTimeout(() => {
        const { pFactors, qFactors, gen1Scores, pFactorChanges, qFactorChanges, generatedGenerations, marketShares, powertrainSplits } = currentStep4Data;
        const allRuns = [];
        const M = (totalVioForMarketPotentialStep4 * (powertrainSplits.base?.BEV || 0)) / 100;
        const bucketSize = Math.ceil(generatedGenerations.length / 3);
        const appSalesMap = new Map(); forecastData.forEach(row => appSalesMap.set(row.year, row[currentApplication.name]));

        for (let i = 0; i < monteCarloRuns; i++) {
            let lastpScores = {};
            pFactors.forEach(f => {
                const baseScore = gen1Scores.p[f.id] || 0;
                const range = f.scoreRange || 0;
                lastpScores[f.id] = baseScore + (Math.random() * 2 - 1) * range;
            });
            let lastqScores = {};
            qFactors.forEach(f => {
                const baseScore = gen1Scores.q[f.id] || 0;
                const range = f.scoreRange || 0;
                lastqScores[f.id] = baseScore + (Math.random() * 2 - 1) * range;
            });

            const pAndQForRun = [];
            for (let genIdx = 0; genIdx < generatedGenerations.length; genIdx++) {
                if (genIdx > 0) {
                    const currentBucket = Math.floor((genIdx - 1) / bucketSize);
                    const stage = `stage${currentBucket + 1}`;
                    pFactors.forEach(f => {
                        const baseChange = pFactorChanges[f.id][stage] || 0;
                        const range = f.changeRange || 0;
                        const change = baseChange + (Math.random() * 2 - 1) * range;
                        lastpScores[f.id] *= (1 + change / 100);
                        lastpScores[f.id] = Math.max(1, Math.min(10, lastpScores[f.id]));
                    });
                    qFactors.forEach(f => {
                        const baseChange = qFactorChanges[f.id][stage] || 0;
                        const range = f.changeRange || 0;
                        const change = baseChange + (Math.random() * 2 - 1) * range;
                        lastqScores[f.id] *= (1 + change / 100);
                        lastqScores[f.id] = Math.max(1, Math.min(10, lastqScores[f.id]));
                    });
                }
                const pSum = pFactors.reduce((sum, f) => sum + (lastpScores[f.id] * (f.weight || 0)), 0);
                const qSum = qFactors.reduce((sum, f) => sum + (lastqScores[f.id] * (f.weight || 0)), 0);
                pAndQForRun.push({ p: Math.max(0, Math.min(0.1, pSum / 1000)), q: Math.max(0.1, Math.min(1.0, qSum / 100)) });
            }

            const runGenerations = generatedGenerations.map((gen, index) => {
                const m_gen = M * ((parseFloat(marketShares[gen.id]) || 0) / 100);
                const { p, q } = pAndQForRun[index];
                return { ...gen, bassCurve: calculateBassCurve(m_gen, p, q, gen.start, END_YEAR) };
            });

            const runResult = [];
            for (let year = CHART_START_YEAR; year <= END_YEAR; year++) {
                const yearResult = { year, S_Total: 0 };
                runGenerations.forEach((gen, index) => {
                    const point = gen.bassCurve.find(p => p.year === year);
                    yearResult.S_Total += point?.S_Gen || 0;
                });
                // Cap the new sales
                const totalAppSales = appSalesMap.get(year) || 0;
                if (totalAppSales > 0) {
                    yearResult.S_Total = Math.min(yearResult.S_Total, totalAppSales);
                }
                runResult.push(yearResult);
            }

            let cumulativeTotal = 0;
            runResult.forEach(row => { row.N_Total = cumulativeTotal += row.S_Total; });
            allRuns.push(runResult);
        }

        // Aggregate results
        const finalData = [];
        const appVioMap = new Map(); calibratedVioData.forEach(row => appVioMap.set(row.year, row[appId]));

        const percentiles = { p10: 0.1, p25: 0.25, p50: 0.5, p75: 0.75, p90: 0.9 };

        for (let year = CHART_START_YEAR; year <= END_YEAR; year++) {
            const yearData = { year };
            const getPercentile = (arr, p) => arr[Math.floor(monteCarloRuns * p)];

            const nTotalsForYear = allRuns.map(run => run.find(d => d.year === year).N_Total).sort((a,b) => a-b);
            const sTotalsForYear = allRuns.map(run => run.find(d => d.year === year).S_Total).sort((a,b) => a-b);

            Object.keys(percentiles).forEach(pKey => {
                yearData[`N_${pKey}`] = getPercentile(nTotalsForYear, percentiles[pKey]);
                yearData[`S_${pKey}`] = getPercentile(sTotalsForYear, percentiles[pKey]);
            });

            const totalVio = appVioMap.get(year) || 0;
            const totalSales = appSalesMap.get(year) || 0;

            const penVioForYear = nTotalsForYear.map(nTotal => totalVio > 0 ? (nTotal / totalVio) * 100 : 0).sort((a,b) => a-b);
            const shareSalesForYear = sTotalsForYear.map(sTotal => totalSales > 0 ? (sTotal / totalSales) * 100 : 0).sort((a,b) => a-b);

            Object.keys(percentiles).forEach(pKey => {
                yearData[`penVio_${pKey}`] = getPercentile(penVioForYear, percentiles[pKey]);
                yearData[`shareSales_${pKey}`] = getPercentile(shareSalesForYear, percentiles[pKey]);
            });

            finalData.push(yearData);
        }

        handleStep4DataChange(appId, 'finalCurves', { chartData: finalData });
        setIsSimulating(false);
      }, 200);
  };

  const handleGoToStep = (targetStep) => {
    if (targetStep === 1) setStep(1);
    else if (targetStep === 2 && isStep1DataValid) setStep(2);
    else if (targetStep === 3 && isStep2DataValid) setStep(3);
    else if (targetStep === 4 && isStep2DataValid && calibrationResult) setStep(4);
  };

  const handleDownload = (data, fileName) => {
    if (!data || data.length === 0) return;
    const headers = Object.keys(data[0]);
    const csv = [
        headers.join(','),
        ...data.map(row => headers.map(header => JSON.stringify(row[header] ?? '', (key, value) => value ?? '')).join(','))
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatNumber = (num) => new Intl.NumberFormat('en-US').format(Math.round(num));

  return (
    <div className="bg-gray-50 min-h-screen antialiased font-sans">
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
            <div className="text-center mb-4"><h1 className="text-3xl font-bold text-gray-900 flex items-center justify-center gap-3"><svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 256 256" fill="currentColor" className="text-gray-800"><path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm48-88a48,48,0,0,1-84.94-34h-0.09A48,48,0,0,1,128,80a47.49,47.49,0,0,1,14.21,2.29L128,96.54l-14.21-14.25A47.49,47.49,0,0,1,128,80a48,48,0,0,1,37.07,78l0.09,0.1A47.83,47.83,0,0,1,176,128Zm-48,48a48,48,0,0,1-37.07-78l-0.09-.1A47.83,47.83,0,0,1,80,128a48,48,0,0,1,84.94,34h0.09A48,48,0,0,1,128,176Z"/></svg>Project Phantom</h1></div>
            <div className="mb-8 border-b border-gray-200"><nav className="-mb-px flex space-x-6" aria-label="Tabs"><button onClick={() => handleGoToStep(1)} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${step === 1 ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Step 1</button><button onClick={() => handleGoToStep(2)} disabled={!isStep1DataValid} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${step === 2 ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} disabled:cursor-not-allowed`}>Step 2</button><button onClick={() => handleGoToStep(3)} disabled={!isStep2DataValid} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${step === 3 ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} disabled:cursor-not-allowed`}>Step 3</button><button onClick={() => handleGoToStep(4)} disabled={!isStep2DataValid || !calibrationResult} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${step === 4 ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} disabled:cursor-not-allowed`}>Step 4</button></nav></div>

            {step === 1 && <Card><CardHeader><CardTitle>Project Setup</CardTitle><CardDescription>Enter the country and paste the annual sales data to begin.</CardDescription></CardHeader><CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6"><div className="space-y-4"><div><label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">Country Name</label><Input id="country" type="text" placeholder="e.g., United States" value={country} onChange={(e) => setCountry(e.target.value)} /></div><div><label htmlFor="sales-data" className="block text-sm font-medium text-gray-700 mb-1">Annual Sales Volume ({START_YEAR} - {END_YEAR})</label><Textarea id="sales-data" rows={10} placeholder={`Paste a single column of ${END_YEAR - START_YEAR + 1} numbers...\nOne value per line.`} value={salesDataRaw} onChange={(e) => setSalesDataRaw(e.target.value)} /></div>{errorMessage && <div className="p-4 bg-red-50 text-red-700 rounded-md">{errorMessage}</div>}</div><div className="bg-gray-50 p-4 rounded-lg min-h-[300px] flex items-center justify-center">{isStep1DataValid ? <ResponsiveContainer width="100%" height={300}><LineChart data={parsedData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="year" /><YAxis tickFormatter={(tick) => `${tick/1000}K`} /><Tooltip formatter={(value) => formatNumber(value)} /><Legend /><Line type="monotone" dataKey="sales" name={`${country} Sales`} stroke="#3b82f6" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer> : <div className="text-center text-gray-500">Graph will appear here.</div>}</div></CardContent><CardFooter className="justify-end"><Button onClick={() => handleGoToStep(2)} disabled={!isStep1DataValid}>Proceed to Step 2</Button></CardFooter></Card>}

            {step === 2 && <div className="space-y-8"><Card><CardHeader><CardTitle>Application Split & Individual Forecast</CardTitle><CardDescription>Define applications and their market share % for key years.</CardDescription></CardHeader><CardContent className="space-y-4">{applications.map((app, index) => (<div key={app.id} className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-gray-50 rounded-lg items-center"><div className="space-y-3"><div className="flex items-center gap-4"><Input placeholder={`Application ${index + 1}`} value={app.name} onChange={e => setApplications(apps => apps.map(a => a.id === app.id ? {...a, name: e.target.value} : a))} className="flex-grow"/><Button variant="ghost" size="icon" onClick={() => setApplications(apps => apps.filter(a => a.id !== app.id))} className="text-gray-400 hover:text-red-500 flex-shrink-0"><Trash2 className="h-4 w-4" /></Button></div><div className="grid grid-cols-3 gap-3">{KEY_SPLIT_YEARS.map(year => (<div key={year}><label className="block text-xs font-medium text-gray-600 mb-1">{year} Split %</label><Input type="number" placeholder="%" value={app.splits[year]} onChange={e => setApplications(apps => apps.map(a => a.id === app.id ? {...a, splits: {...a.splits, [year]: e.target.value}} : a))} /></div>))}</div></div><div className="h-40"><ResponsiveContainer width="100%" height="100%"><LineChart data={forecastData.map(d => ({ year: d.year, value: d[app.name] || 0 }))}><Tooltip formatter={(value) => [`${formatNumber(value)} units`, app.name]} contentStyle={{fontSize: '12px', padding: '4px 8px'}}/><Line type="monotone" dataKey="value" stroke={CHART_COLORS[index % CHART_COLORS.length]} strokeWidth={2} dot={false} /><YAxis hide={true} domain={['dataMin', 'dataMax']}/><XAxis dataKey="year" hide={true}/></LineChart></ResponsiveContainer></div></div>))}{splitValidationError && (<div className="mt-4 flex items-center text-sm text-red-600 p-3 bg-red-50 rounded-md"><AlertCircle className="h-4 w-4 mr-2" />{splitValidationError}</div>)}</CardContent><CardFooter><Button variant="outline" onClick={() => { if(applications.length < 6) setApplications(apps => [...apps, {id: Date.now(), name: '', splits: KEY_SPLIT_YEARS.reduce((acc, y) => ({...acc, [y]: 0}), {})}])}} disabled={applications.length >= 6}><PlusCircle className="h-4 w-4 mr-2" /> Add Application</Button></CardFooter></Card><Card><CardHeader><CardTitle>Total Market Forecast by Application</CardTitle><CardDescription>Stacked view of the market composition over time.</CardDescription></CardHeader><CardContent className="h-[350px]">{isStep2DataValid ? (<ResponsiveContainer width="100%" height="100%"><AreaChart data={forecastData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="year" /><YAxis tickFormatter={(tick) => `${tick/1000}K`} /><Tooltip formatter={(value) => formatNumber(value)} /><Legend />{applications.map((app, index) => (app.name && <Area key={app.id} type="monotone" dataKey={app.name} stackId="1" stroke={CHART_COLORS[index % CHART_COLORS.length]} fill={CHART_COLORS[index % CHART_COLORS.length]} fillOpacity={0.7} />))}</AreaChart></ResponsiveContainer>) : (<div className="flex items-center justify-center h-full text-gray-500">Please complete inputs to view graph.</div>)}</CardContent><CardFooter><Button variant="outline" onClick={() => handleDownload(forecastData, `${country}_applicationsplit.csv`)} disabled={!isStep2DataValid}><Download className="h-4 w-4 mr-2" /> Download Forecast</Button></CardFooter></Card><CardFooter className="justify-between !border-none !p-0"><Button variant="outline" onClick={() => handleGoToStep(1)}><ArrowLeft className="h-4 w-4 mr-2" /> Previous Section</Button><Button onClick={() => handleGoToStep(3)} disabled={!isStep2DataValid}>Proceed to Step 3</Button></CardFooter></div>}

            {step === 3 && (
                <div className="space-y-8">
                    <Card>
                        <CardHeader><CardTitle>Step 3: VIO Model Calibration</CardTitle><CardDescription>Provide real-world data to calibrate the model's retirement curve for an accurate VIO forecast.</CardDescription></CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <h3 className="font-semibold text-gray-800 mb-2">Actual VIO (Last 5 Years)</h3>
                                <div className="space-y-2">
                                    {Object.keys(actualVioHistory).sort((a,b) => a-b).map(year => (
                                        <div key={year} className="flex items-center gap-4"><label className="w-12 font-medium">{year}</label><Input type="number" placeholder="Total VIO" value={actualVioHistory[year]} onChange={e => setActualVioHistory(prev => ({...prev, [year]: e.target.value}))} /></div>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-800 mb-2">Average Fleet Age (Last 5 Years)</h3>
                                <div className="space-y-2">
                                    {Object.keys(avgFleetAgeHistory).sort((a,b) => a-b).map(year => (
                                        <div key={year} className="flex items-center gap-4"><label className="w-12 font-medium">{year}</label><Input type="number" placeholder="e.g., 12.5" value={avgFleetAgeHistory[year]} onChange={e => setAvgFleetAgeHistory(prev => ({...prev, [year]: e.target.value}))} /></div>
                                    ))}
                                </div>
                            </div>
                            <div className="md:col-span-2">
                                <label className="font-semibold text-gray-800 mb-2 block">Calibration Priority</label>
                                <div className="flex items-center gap-4">
                                    <span className="text-sm font-medium text-blue-600">VIO Focus</span>
                                    <input type="range" min="0" max="100" value={calibrationWeight} onChange={e => setCalibrationWeight(Number(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
                                    <span className="text-sm font-medium text-green-600">Age Focus</span>
                                </div>
                                <div className="text-center text-sm text-gray-500 mt-1">VIO: {calibrationWeight}% / Age: {100 - calibrationWeight}%</div>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button onClick={handleCalibrate} disabled={!isStep3DataValid || isCalibrating} className="w-full justify-center text-base py-3">
                                <BrainCircuit className="h-5 w-5 mr-2"/>
                                {isCalibrating ? 'Calibrating...' : 'Calibrate Retirement Model'}
                            </Button>
                        </CardFooter>
                    </Card>

                    {calibrationResult && (
                        <Card>
                            <CardHeader><CardTitle>Calibration Results</CardTitle></CardHeader>
                            <CardContent className="space-y-8">
                                <div>
                                    <h3 className="font-semibold text-gray-800 text-center mb-2">Master Retirement Curve</h3>
                                    <div className="h-80"><ResponsiveContainer width="100%" height="100%"><LineChart data={calibrationResult.retirementCurve}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="age" name="Truck Age" /><YAxis tickFormatter={tick => `${tick.toFixed(1)}%`}/><Tooltip formatter={(value) => `${value.toFixed(2)}%`} /><Legend /><Line type="monotone" dataKey="Retirement %" stroke="#ef4444" dot={false} /></LineChart></ResponsiveContainer></div>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-800 mb-2">Calibrated VIO Forecast</h3>
                                    <div className="overflow-x-auto"><table className="w-full text-center"><thead><tr className="bg-gray-50 text-xs text-gray-600 uppercase"><th className="p-2 font-semibold text-left">Year</th>{applications.map(app => <th key={app.id} className="p-2 font-semibold">{app.name}</th>)}<th className="p-2 font-semibold">Total Calc. VIO</th><th className="p-2 font-semibold">Actual VIO</th><th className="p-2 font-semibold">% Diff (VIO)</th><th className="p-2 font-semibold">Calc. Avg. Age</th><th className="p-2 font-semibold">Actual Avg. Age</th><th className="p-2 font-semibold">% Diff (Age)</th></tr></thead><tbody>
                                        {calibrationResult.vioForecast.map(row => {
                                            const actualVio = parseFloat(actualVioHistory[row.year]);
                                            const vioDiff = !isNaN(actualVio) && actualVio > 0 ? ((row.totalCalculated - actualVio) / actualVio) * 100 : null;
                                            const actualAge = parseFloat(avgFleetAgeHistory[row.year]);
                                            const ageDiff = !isNaN(actualAge) && actualAge > 0 ? ((row.avgAgeCalculated - actualAge) / actualAge) * 100 : null;
                                            return (<tr key={row.year} className="hover:bg-gray-50"><td className="p-2 font-medium text-left">{row.year}</td>{applications.map(app => <td key={app.id} className="p-2 text-gray-600">{formatNumber(row[app.id])}</td>)}<td className="p-2 font-bold">{formatNumber(row.totalCalculated)}</td><td className="p-2">{!isNaN(actualVio) ? formatNumber(actualVio) : '-'}</td><td className={`p-2 font-medium ${vioDiff !== null && Math.abs(vioDiff) > 5 ? 'text-red-500' : 'text-green-600'}`}>{vioDiff !== null ? `${vioDiff.toFixed(1)}%` : '-'}</td><td className="p-2 font-bold">{row.avgAgeCalculated.toFixed(1)}</td><td className="p-2">{!isNaN(actualAge) ? actualAge.toFixed(1) : '-'}</td><td className={`p-2 font-medium ${ageDiff !== null && Math.abs(ageDiff) > 3 ? 'text-red-500' : 'text-green-600'}`}>{ageDiff !== null ? `${ageDiff.toFixed(1)}%` : '-'}</td></tr>);
                                        })}
                                    </tbody></table></div>
                                </div>
                            </CardContent>
                            <CardFooter>
                                <Button variant="outline" onClick={() => handleDownload(calibrationResult.vioForecast.map(row => ({Year: row.year, ...applications.reduce((obj, app) => ({...obj, [app.name]: row[app.id]}), {}), 'Total Calculated VIO': row.totalCalculated, 'Calculated Avg Age': row.avgAgeCalculated})), `${country}_VIO.csv`)}><Download className="h-4 w-4 mr-2"/> Download VIO Forecast</Button>
                            </CardFooter>
                        </Card>
                    )}

                    <CardFooter className="justify-between !border-none !p-0"><Button variant="outline" onClick={() => handleGoToStep(2)}><ArrowLeft className="h-4 w-4 mr-2" /> Previous Section</Button><Button onClick={() => handleGoToStep(4)} disabled={!calibrationResult}>Proceed to Step 4</Button></CardFooter>
                </div>
            )}

            {step === 4 && currentApplication && currentStep4Data && (
                <div className="space-y-8">
                    <Card><CardHeader><CardTitle>Step 4: EV Penetration for "{currentApplication.name}"</CardTitle><CardDescription>Probabilistic forecast using Monte Carlo simulation.</CardDescription></CardHeader></Card>

                    <Card>
                        <CardHeader><CardTitle>1. Powertrain VIO Split ({END_YEAR})</CardTitle><CardDescription>Total VIO for {currentApplication.name} in {END_YEAR} is <span className="font-bold text-blue-600">{formatNumber(totalVioForMarketPotentialStep4)}</span>. Define the VIO split %.</CardDescription></CardHeader>
                        <CardContent>
                           <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                                {Object.keys(currentStep4Data.powertrainSplits.base).map(pt => (
                                    <div key={pt}><label className="block text-sm font-medium text-gray-700">{pt}</label><Input type="number" placeholder="%" value={currentStep4Data.powertrainSplits.base[pt]} onChange={e => { const newSplits = {...currentStep4Data.powertrainSplits, base: {...currentStep4Data.powertrainSplits.base, [pt]: e.target.value }}; handleStep4DataChange(currentApplication.id, 'powertrainSplits', newSplits); }} /></div>
                                ))}
                            </div>
                            {Math.abs(100 - powertrainSplitSum) > 0.01 && <div className="mt-4 flex items-center text-red-600 text-sm"><AlertCircle className="h-4 w-4 mr-1"/>Sum must be 100% (is {powertrainSplitSum.toFixed(1)}%)</div>}
                        </CardContent>
                    </Card>

                    <Card><CardHeader><CardTitle>2. Automated Generation Definition</CardTitle></CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                             <div><label>Start Year</label><Input type="number" value={currentStep4Data.genParams.startYear} onChange={e => handleStep4DataChange(currentApplication.id, 'genParams', {...currentStep4Data.genParams, startYear: e.target.value})} /></div>
                             <div><label>End Year</label><Input type="number" value={currentStep4Data.genParams.endYear} onChange={e => handleStep4DataChange(currentApplication.id, 'genParams', {...currentStep4Data.genParams, endYear: e.target.value})} /></div>
                             <div><label>Duration (Years)</label><Input type="number" value={currentStep4Data.genParams.duration} onChange={e => handleStep4DataChange(currentApplication.id, 'genParams', {...currentStep4Data.genParams, duration: e.target.value})} /></div>
                             <div><label>Overlap (Years)</label><Input type="number" value={currentStep4Data.genParams.overlap} onChange={e => handleStep4DataChange(currentApplication.id, 'genParams', {...currentStep4Data.genParams, overlap: e.target.value})} /></div>
                        </CardContent>
                        <CardFooter><Button onClick={() => handleGenerateGenerations(currentApplication.id)}><Settings className="h-4 w-4 mr-2"/>Generate Generations</Button></CardFooter>
                    </Card>

                    {currentStep4Data.generatedGenerations.length > 0 && (
                    <Card>
                        <CardHeader><CardTitle>3. Generation Market Share</CardTitle><CardDescription>Distribute the total BEV market potential across the generated generations. The sum must be 100%.</CardDescription></CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                           {currentStep4Data.generatedGenerations.map(gen => (
                               <div key={gen.id} className="flex items-center gap-4">
                                   <div className="font-semibold whitespace-nowrap">Gen {gen.id} <span className="text-gray-500">({gen.start}-{gen.end})</span></div>
                                   <Input type="number" placeholder="Market Share %" value={currentStep4Data.marketShares[gen.id] || ''} onChange={e => handleStep4DataChange(currentApplication.id, 'marketShares', {...currentStep4Data.marketShares, [gen.id]: e.target.value})} />
                               </div>
                           ))}
                        </CardContent>
                        {Math.abs(100 - marketShareSum) > 0.01 && <CardFooter><AlertCircle className="h-4 w-4 mr-2 text-red-500"/> <span className="text-red-600 text-sm">Market shares must sum to 100%. Current sum: {marketShareSum.toFixed(1)}%</span></CardFooter>}
                    </Card>
                    )}

                    <Card>
                        <CardHeader>
                            <CardTitle>4. P & Q Value Generation (with Uncertainty)</CardTitle>
                            <CardDescription>Define factor scores (1-10) and % change, plus their uncertainty ranges (+/-) for the simulation.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-8">
                            <div>
                                <h4 className="font-semibold mb-2">P-Value Factors (Innovation)</h4>
                                <div className="overflow-x-auto">
                                <table className="w-full text-sm"><thead><tr className="bg-gray-50"><th className="p-2 text-left font-semibold">Factor</th><th className="p-2 w-20 text-center font-semibold">Weight</th><th className="p-2 w-24 text-center font-semibold">Gen 1 Score</th><th className="p-2 w-24 text-center font-semibold">Range (+/-)</th>{generationBuckets.map(b => <React.Fragment key={b.stage}><th className="p-2 w-24 text-center font-semibold">% Δ ({b.label})</th><th className="p-2 w-24 text-center font-semibold">Δ Range (+/-)</th></React.Fragment>)}</tr></thead>
                                <tbody>{currentStep4Data.pFactors.map(f => <tr key={f.id} className="border-b"><td className="p-1"><Input className="bg-transparent border-none" value={f.name} onChange={e => handleFactorChange(currentApplication.id, 'pFactors', f.id, 'name', e.target.value)} /></td><td className="p-1"><Input type="number" min="1" max="10" value={f.weight} onChange={e => handleFactorChange(currentApplication.id, 'pFactors', f.id, 'weight', e.target.value)}/></td><td className="p-1"><Input type="number" min="1" max="10" value={currentStep4Data.gen1Scores.p?.[f.id] || ''} onChange={e => handleScoreChange(currentApplication.id, 'p', f.id, e.target.value)} /></td><td className="p-1"><Input type="number" value={f.scoreRange} onChange={e => handleFactorChange(currentApplication.id, 'pFactors', f.id, 'scoreRange', parseFloat(e.target.value) || 0)} /></td>{generationBuckets.map(b => <React.Fragment key={b.stage}><td className="p-1"><Input type="number" value={currentStep4Data.pFactorChanges[f.id]?.[b.stage] || 0} onChange={e => handleFactorPercentageChange(currentApplication.id, 'pFactorChanges', f.id, b.stage, e.target.value)} /></td><td className="p-1"><Input type="number" value={f.changeRange} onChange={e => handleFactorChange(currentApplication.id, 'pFactors', f.id, 'changeRange', parseFloat(e.target.value) || 0)} /></td></React.Fragment>)}</tr>)}</tbody></table>
                                </div>
                                {Math.abs(10 - pWeightSum) > 0.01 && <div className="flex items-center text-red-600 text-xs pt-2"><AlertCircle className="h-4 w-4 mr-1"/>P-Factor weights must sum to 10 (is {pWeightSum}).</div>}
                            </div>
                            <div>
                                <h4 className="font-semibold mb-2">Q-Value Factors (Imitation)</h4>
                                <div className="overflow-x-auto">
                                <table className="w-full text-sm"><thead><tr className="bg-gray-50"><th className="p-2 text-left font-semibold">Factor</th><th className="p-2 w-20 text-center font-semibold">Weight</th><th className="p-2 w-24 text-center font-semibold">Gen 1 Score</th><th className="p-2 w-24 text-center font-semibold">Range (+/-)</th>{generationBuckets.map(b => <React.Fragment key={b.stage}><th className="p-2 w-24 text-center font-semibold">% Δ ({b.label})</th><th className="p-2 w-24 text-center font-semibold">Δ Range (+/-)</th></React.Fragment>)}</tr></thead>
                                <tbody>{currentStep4Data.qFactors.map(f => <tr key={f.id} className="border-b"><td className="p-1"><Input className="bg-transparent border-none" value={f.name} onChange={e => handleFactorChange(currentApplication.id, 'qFactors', f.id, 'name', e.target.value)} /></td><td className="p-1"><Input type="number" min="1" max="10" value={f.weight} onChange={e => handleFactorChange(currentApplication.id, 'qFactors', f.id, 'weight', e.target.value)}/></td><td className="p-1"><Input type="number" min="1" max="10" value={currentStep4Data.gen1Scores.q?.[f.id] || ''} onChange={e => handleScoreChange(currentApplication.id, 'q', f.id, e.target.value)} /></td><td className="p-1"><Input type="number" value={f.scoreRange} onChange={e => handleFactorChange(currentApplication.id, 'qFactors', f.id, 'scoreRange', parseFloat(e.target.value) || 0)} /></td>{generationBuckets.map(b => <React.Fragment key={b.stage}><td className="p-1"><Input type="number" value={currentStep4Data.qFactorChanges[f.id]?.[b.stage] || 0} onChange={e => handleFactorPercentageChange(currentApplication.id, 'qFactorChanges', f.id, b.stage, e.target.value)} /></td><td className="p-1"><Input type="number" value={f.changeRange} onChange={e => handleFactorChange(currentApplication.id, 'qFactors', f.id, 'changeRange', parseFloat(e.target.value) || 0)} /></td></React.Fragment>)}</tr>)}</tbody></table>
                                </div>
                                {Math.abs(10 - qWeightSum) > 0.01 && <div className="flex items-center text-red-600 text-xs pt-2"><AlertCircle className="h-4 w-4 mr-1"/>Q-Factor weights must sum to 10 (is {qWeightSum}).</div>}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                       <CardHeader><CardTitle>5. Run Monte Carlo Simulation</CardTitle></CardHeader>
                       <CardContent>
                           <label htmlFor="monte-carlo-runs" className="block text-sm font-medium text-gray-700 mb-1">Number of Simulation Runs</label>
                           <Input id="monte-carlo-runs" type="number" value={monteCarloRuns} onChange={e => setMonteCarloRuns(parseInt(e.target.value, 10) || 100)} />
                       </CardContent>
                       <CardFooter>
                         <Button onClick={() => runMonteCarloSimulation(currentApplication.id)} disabled={isSimulating || Math.abs(100 - marketShareSum) > 0.01 || Math.abs(10 - pWeightSum) > 0.01 || Math.abs(10 - qWeightSum) > 0.01} className="w-full justify-center text-base py-3">
                             <BrainCircuit className="h-5 w-5 mr-2"/> {isSimulating ? `Simulating ${monteCarloRuns} runs...` : `Run ${monteCarloRuns}-run Simulation`}
                         </Button>
                       </CardFooter>
                    </Card>

                    {currentStep4Data.finalCurves && (
                        <Card>
                            <CardHeader className="flex justify-between items-center">
                                <CardTitle>Final Probabilistic Forecast</CardTitle>
                                <Button variant="outline" onClick={() => handleDownload(currentStep4Data.finalCurves.chartData, `${country}_${currentApplication.name}_evforecast.csv`)}><Download className="h-4 w-4 mr-2"/> Download Forecast Data</Button>
                            </CardHeader>
                            <CardContent className="space-y-8">
                                <Card>
                                    <CardHeader><CardTitle>Deterministic P & Q Values (Median Path)</CardTitle></CardHeader>
                                    <CardContent className="space-y-4">
                                        <div>
                                            <h4 className="font-semibold text-sm mb-2">Factor Scores by Generation</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div>
                                                    <h5 className="font-medium text-xs text-gray-600 mb-1">P-Factor Scores</h5>
                                                    <div className="overflow-x-auto border rounded-lg"><table className="w-full text-xs"><thead><tr className="bg-gray-50">{['Factor', ...deterministicCalculations.pAndQ.map(v => `G${v.genId}`)].map(h => <th key={h} className="p-2 font-semibold">{h}</th>)}</tr></thead><tbody>{currentStep4Data.pFactors.map(f => <tr key={f.id} className="border-b"><td className="p-2 font-medium text-left">{f.name}</td>{deterministicCalculations.p.map((scores, i) => <td key={i} className="p-2 text-center">{scores[f.id].toFixed(2)}</td>)}</tr>)}</tbody></table></div>
                                                </div>
                                                <div>
                                                    <h5 className="font-medium text-xs text-gray-600 mb-1">Q-Factor Scores</h5>
                                                    <div className="overflow-x-auto border rounded-lg"><table className="w-full text-xs"><thead><tr className="bg-gray-50">{['Factor', ...deterministicCalculations.pAndQ.map(v => `G${v.genId}`)].map(h => <th key={h} className="p-2 font-semibold">{h}</th>)}</tr></thead><tbody>{currentStep4Data.qFactors.map(f => <tr key={f.id} className="border-b"><td className="p-2 font-medium text-left">{f.name}</td>{deterministicCalculations.q.map((scores, i) => <td key={i} className="p-2 text-center">{scores[f.id].toFixed(2)}</td>)}</tr>)}</tbody></table></div>
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-sm mb-2">Final P & Q Values by Generation</h4>
                                            <div className="text-xs grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-x-4 gap-y-1 w-full">{deterministicCalculations.pAndQ.map(({genId, p, q}) => <div key={genId} className="flex gap-2 p-1 bg-gray-50 rounded"><span className="font-bold">Gen {genId}:</span><span className={(p < 0 || p > 0.1) ? 'text-red-500 font-semibold' : ''}>p={p.toFixed(4)}</span><span className={(q < 0.1 || q > 1.0) ? 'text-red-500 font-semibold' : ''}>q={q.toFixed(4)}</span></div>)}</div>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader><CardTitle>Probabilistic Sales Forecast</CardTitle></CardHeader>
                                    <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                        <div className="h-[350px]">
                                            <h4 className="text-center font-semibold text-sm mb-2">New EV Sales (S)</h4>
                                            <ResponsiveContainer width="100%" height="100%">
                                                <LineChart data={currentStep4Data.finalCurves.chartData}>
                                                    <CartesianGrid strokeDasharray="3 3" />
                                                    <XAxis dataKey="year" />
                                                    <YAxis tickFormatter={(tick) => `${formatNumber(tick/1000)}K`} />
                                                    <Tooltip formatter={(value) => formatNumber(value)}/>
                                                    <Legend />
                                                    {Object.keys(PERCENTILE_COLORS).map(pKey => <Line key={pKey} type="monotone" dataKey={`S_${pKey}`} name={pKey.toUpperCase()} stroke={PERCENTILE_COLORS[pKey]} dot={false} strokeWidth={pKey === 'p50' ? 3 : 1} />)}
                                                </LineChart>
                                            </ResponsiveContainer>
                                        </div>
                                        <div className="h-[350px]">
                                            <h4 className="text-center font-semibold text-sm mb-2">Cumulative EV VIO (N)</h4>
                                            <ResponsiveContainer width="100%" height="100%">
                                                <LineChart data={currentStep4Data.finalCurves.chartData}>
                                                    <CartesianGrid strokeDasharray="3 3" />
                                                    <XAxis dataKey="year" />
                                                    <YAxis tickFormatter={(tick) => `${formatNumber(tick/1000)}K`} />
                                                    <Tooltip formatter={(value) => formatNumber(value)}/>
                                                    <Legend />
                                                    {Object.keys(PERCENTILE_COLORS).map(pKey => <Line key={pKey} type="monotone" dataKey={`N_${pKey}`} name={pKey.toUpperCase()} stroke={PERCENTILE_COLORS[pKey]} dot={false} strokeWidth={pKey === 'p50' ? 3 : 1} />)}
                                                </LineChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader><CardTitle>Probabilistic Penetration Forecast</CardTitle></CardHeader>
                                    <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                        <div className="h-[350px]">
                                            <h4 className="text-center font-semibold text-sm mb-2">Penetration of New Sales</h4>
                                            <ResponsiveContainer width="100%" height="100%">
                                                <LineChart data={currentStep4Data.finalCurves.chartData}>
                                                    <CartesianGrid strokeDasharray="3 3" />
                                                    <XAxis dataKey="year" />
                                                    <YAxis tickFormatter={(tick) => `${tick.toFixed(0)}%`} />
                                                    <Tooltip formatter={(value) => `${value.toFixed(1)}%`}/>
                                                    <Legend />
                                                    {Object.keys(PERCENTILE_COLORS).map(pKey => <Line key={pKey} type="monotone" dataKey={`shareSales_${pKey}`} name={pKey.toUpperCase()} stroke={PERCENTILE_COLORS[pKey]} dot={false} strokeWidth={pKey === 'p50' ? 3 : 1} />)}
                                                </LineChart>
                                            </ResponsiveContainer>
                                        </div>
                                        <div className="h-[350px]">
                                            <h4 className="text-center font-semibold text-sm mb-2">Penetration of VIO</h4>
                                            <ResponsiveContainer width="100%" height="100%">
                                                <LineChart data={currentStep4Data.finalCurves.chartData}>
                                                    <CartesianGrid strokeDasharray="3 3" />
                                                    <XAxis dataKey="year" />
                                                    <YAxis tickFormatter={(tick) => `${tick.toFixed(0)}%`} />
                                                    <Tooltip formatter={(value) => `${value.toFixed(1)}%`}/>
                                                    <Legend />
                                                    {Object.keys(PERCENTILE_COLORS).map(pKey => <Line key={pKey} type="monotone" dataKey={`penVio_${pKey}`} name={pKey.toUpperCase()} stroke={PERCENTILE_COLORS[pKey]} dot={false} strokeWidth={pKey === 'p50' ? 3 : 1} />)}
                                                </LineChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader><CardTitle>Forecast Data Table</CardTitle></CardHeader>
                                    <CardContent className="max-h-[400px] overflow-y-auto">
                                        <table className="w-full text-xs text-center">
                                            <thead>
                                                <tr className="bg-gray-50">
                                                    <th className="p-2 font-semibold sticky top-0 bg-gray-50">Year</th>
                                                    <th colSpan="5" className="p-2 font-semibold sticky top-0 bg-gray-50 border-l border-r">New Sales (S)</th>
                                                    <th colSpan="5" className="p-2 font-semibold sticky top-0 bg-gray-50 border-l border-r">Cumulative VIO (N)</th>
                                                </tr>
                                                <tr className="bg-gray-50">
                                                    <th className="p-2 font-semibold sticky top-8 bg-gray-50"></th>
                                                    {['P10', 'P25', 'P50', 'P75', 'P90'].map(p => <th key={`s-${p}`} className="p-2 font-semibold sticky top-8 bg-gray-50">{p}</th>)}
                                                    {['P10', 'P25', 'P50', 'P75', 'P90'].map(p => <th key={`n-${p}`} className="p-2 font-semibold sticky top-8 bg-gray-50 border-l">{p}</th>)}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {currentStep4Data.finalCurves.chartData.map(row => (
                                                    <tr key={row.year} className="border-t">
                                                        <td className="p-2 font-medium">{row.year}</td>
                                                        {['p10', 'p25', 'p50', 'p75', 'p90'].map(pKey => <td key={`s-${pKey}-${row.year}`} className="p-2">{formatNumber(row[`S_${pKey}`])}</td>)}
                                                        {['p10', 'p25', 'p50', 'p75', 'p90'].map(pKey => <td key={`n-${pKey}-${row.year}`} className="p-2 border-l">{formatNumber(row[`N_${pKey}`])}</td>)}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </CardContent>
                                </Card>
                            </CardContent>
                        </Card>
                    )}

                    <Card>
                        <CardFooter className="justify-between">
                            <Button variant="outline" onClick={() => handleGoToStep(3)}><ArrowLeft className="h-4 w-4 mr-2" /> Previous Step</Button>
                            <div className="flex gap-4">
                                <Button variant="outline" onClick={() => setCurrentAppIndex(i => Math.max(0, i - 1))} disabled={currentAppIndex === 0}><ArrowLeft className="h-4 w-4 mr-2" /> Prev. Application</Button>
                                <Button variant="outline" onClick={() => setCurrentAppIndex(i => Math.min(applications.length - 1, i + 1))} disabled={currentAppIndex === applications.length - 1}>Next Application <ArrowRight className="h-4 w-4 ml-2" /></Button>
                            </div>
                        </CardFooter>
                    </Card>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}
