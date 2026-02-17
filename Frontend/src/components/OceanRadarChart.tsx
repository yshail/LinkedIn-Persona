import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";
import type { OceanAnalysis } from "../types";

interface OceanRadarChartProps {
  analysis: OceanAnalysis;
}

export function OceanRadarChart({ analysis }: OceanRadarChartProps) {
  const data = [
    { trait: "Openness", score: analysis.openness.score },
    { trait: "Conscientiousness", score: analysis.conscientiousness.score },
    { trait: "Extraversion", score: analysis.extraversion.score },
    { trait: "Agreeableness", score: analysis.agreeableness.score },
    { trait: "Neuroticism", score: analysis.neuroticism.score },
  ];

  return (
    <div className="w-full h-[340px]">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
          <PolarGrid stroke="#38434f" strokeWidth={0.5} />
          <PolarAngleAxis
            dataKey="trait"
            tick={{ fill: "#8b8f94", fontSize: 11, fontWeight: 500 }}
          />
          <PolarRadiusAxis
            domain={[0, 100]}
            tick={{ fill: "#8b8f94", fontSize: 9 }}
            axisLine={false}
          />
          <defs>
            <linearGradient id="liRadarGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0a66c2" stopOpacity={0.6} />
              <stop offset="100%" stopColor="#378fe9" stopOpacity={0.15} />
            </linearGradient>
          </defs>
          <Radar
            name="OCEAN"
            dataKey="score"
            stroke="#0a66c2"
            strokeWidth={2}
            fill="url(#liRadarGrad)"
            dot={{ r: 3, fill: "#0a66c2", stroke: "#1d2226", strokeWidth: 2 }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
