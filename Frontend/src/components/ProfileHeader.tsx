import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Users, Briefcase } from "lucide-react";
import type { ProfileData, OceanAnalysis } from "../types";

interface ProfileHeaderProps {
  profile: ProfileData;
  analysis: OceanAnalysis | null;
}

export function ProfileHeader({ profile, analysis }: ProfileHeaderProps) {
  return (
    <Card className="overflow-hidden" style={{ backgroundColor: "#1d2226", border: "1px solid #313740" }}>
      {/* Banner */}
      {profile.backgroundImageUrl ? (
        <img
          src={profile.backgroundImageUrl}
          alt="Banner"
          className="h-32 w-full object-cover"
          referrerPolicy="no-referrer"
        />
      ) : (
        <div className="h-24" style={{ background: "linear-gradient(135deg, #0a66c2 0%, #004182 100%)" }} />
      )}

      <CardContent className="relative px-6 pb-6">
        {/* Avatar */}
        <div className="flex items-end gap-4 -mt-10 mb-4">
          {profile.profilePictureUrl ? (
            <img
              src={profile.profilePictureUrl}
              alt={profile.name || "Profile"}
              className="w-20 h-20 rounded-full object-cover shadow-lg"
              style={{ border: "3px solid #1d2226" }}
              referrerPolicy="no-referrer"
            />
          ) : (
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center text-xl font-bold text-white shadow-lg"
              style={{ border: "3px solid #1d2226", background: "linear-gradient(135deg, #0a66c2, #004182)" }}
            >
              {profile.name
                ? profile.name.split(" ").map((n) => n[0]).join("").slice(0, 2)
                : "?"}
            </div>
          )}
          {analysis && (
            <Badge
              className="px-3 py-1 text-xs font-normal mb-1"
              style={{ backgroundColor: "rgba(10, 102, 194, 0.15)", color: "#378fe9", border: "1px solid rgba(10, 102, 194, 0.3)" }}
            >
              {analysis.title}
            </Badge>
          )}
        </div>

        {/* Info */}
        <h1 className="text-xl font-bold text-white tracking-tight">
          {profile.name || "Unknown"}
        </h1>
        <p className="mt-1 text-sm" style={{ color: "#b0b4b8" }}>
          {profile.headline || "No headline"}
        </p>

        <div className="flex flex-wrap gap-4 mt-4 text-xs" style={{ color: "#8b8f94" }}>
          {profile.location && (
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3 h-3" />
              {profile.location}
            </span>
          )}
          {profile.connections && (
            <span className="flex items-center gap-1.5">
              <Users className="w-3 h-3" />
              {profile.connections} connections
            </span>
          )}
          {profile.followers && (
            <span className="flex items-center gap-1.5">
              <Users className="w-3 h-3" />
              {profile.followers} followers
            </span>
          )}
          {profile.experience?.[0] && (
            <span className="flex items-center gap-1.5">
              <Briefcase className="w-3 h-3" />
              {profile.experience[0].title} at {profile.experience[0].company}
            </span>
          )}
        </div>

        {/* About */}
        {profile.about && (
          <p
            className="mt-4 text-sm leading-relaxed pl-4"
            style={{ color: "#b0b4b8", borderLeft: "2px solid #0a66c2" }}
          >
            {profile.about.length > 250
              ? profile.about.slice(0, 250) + "..."
              : profile.about}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
