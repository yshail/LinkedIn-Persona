import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { OceanTrait } from "../types";

interface TraitCardProps {
  name: string;
  trait: OceanTrait;
  icon: string;
}

const TRAIT_COLORS: Record<string, string> = {
  Openness: "#378fe9",
  Conscientiousness: "#057642",
  Extraversion: "#b24020",
  Agreeableness: "#5f4bb6",
  Neuroticism: "#915907",
};

export function TraitCard({ name, trait, icon }: TraitCardProps) {
  const color = TRAIT_COLORS[name] || "#0a66c2";
  const score = trait.score; // 1-100 from model

  return (
    <Card style={{ backgroundColor: "#1d2226", border: "1px solid #313740" }}>
      <CardContent className="py-5 px-5">
        {/* Header */}
        <div className="flex items-center gap-3 mb-3">
          <span className="text-lg" style={{ color }}>{icon}</span>
          <h3 className="font-semibold text-white text-sm tracking-wide">{name}</h3>
          <span className="ml-auto text-lg font-bold" style={{ color }}>
            {score}<span className="text-xs font-normal" style={{ color: "#8b8f94" }}>/100</span>
          </span>
        </div>

        {/* Progress */}
        <div
          className="mb-4 relative"
          style={{ ["--progress-color" as string]: color }}
        >
          <Progress value={score} className="h-2" style={{ backgroundColor: "#38434f" }} />
          {/* Subtle glow underneath the bar */}
          <div 
            className="absolute inset-0 blur-sm opacity-20" 
            style={{ backgroundColor: color, width: `${score}%`, borderRadius: '999px', height: '8px' }}
          />
        </div>

        {/* Evidence */}
        <div className="space-y-2">
          {trait.evidence.map((e: string, i: number) => (
            <div key={i} className="flex items-start gap-3 text-sm">
              <span className="text-xs font-mono mt-0.5 w-4 text-right shrink-0" style={{ color: "#8b8f94" }}>
                {i + 1}
              </span>
              <p style={{ color: "#b0b4b8" }}>{e}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
