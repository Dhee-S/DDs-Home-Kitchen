import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

const Profile = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState({
    name: "", phone: "", address: "", dietary_preference: "", preferred_pickup_time: "",
  });

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).single().then(({ data }) => {
      if (data) setProfile({
        name: data.name || "",
        phone: data.phone || "",
        address: data.address || "",
        dietary_preference: data.dietary_preference || "",
        preferred_pickup_time: data.preferred_pickup_time || "",
      });
    });
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    const { error } = await supabase.from("profiles").update(profile).eq("id", user.id);
    setLoading(false);
    if (error) toast.error("Failed to update profile");
    else toast.success("Profile updated!");
  };

  const fields = [
    { key: "name", label: "Full Name", type: "text" },
    { key: "phone", label: "Phone Number", type: "tel" },
    { key: "address", label: "Address", type: "text" },
    { key: "dietary_preference", label: "Dietary Preference", type: "text" },
    { key: "preferred_pickup_time", label: "Preferred Pickup Time", type: "text" },
  ] as const;

  return (
    <div className="container mx-auto px-4 py-8 max-w-lg">
      <h1 className="text-3xl font-serif font-bold mb-8">My Profile</h1>
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={user?.email || ""} disabled />
          </div>
          {fields.map((f) => (
            <div key={f.key} className="space-y-2">
              <Label>{f.label}</Label>
              <Input
                type={f.type}
                value={profile[f.key]}
                onChange={(e) => setProfile({ ...profile, [f.key]: e.target.value })}
              />
            </div>
          ))}
          <Button onClick={handleSave} disabled={loading} className="w-full gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Changes
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;
