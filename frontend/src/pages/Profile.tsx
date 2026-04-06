import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, ArrowLeft } from "lucide-react";
import { z } from "zod";

const profileSchema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters").max(100),
  phone: z.string().max(20).optional(),
  company: z.string().max(100).optional(),
  bio: z.string().max(500).optional(),
  website: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
  avatar_url: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
});

const Profile = () => {
  const navigate = useNavigate();
  const { user, profile, updateProfile, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    company: "",
    bio: "",
    website: "",
    avatar_url: "",
    is_agent: false,
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || "",
        phone: profile.phone || "",
        company: profile.company || "",
        bio: profile.bio || "",
        website: profile.website || "",
        avatar_url: profile.avatar_url || "",
        is_agent: profile.is_agent || false,
      });
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const dataToValidate = {
      full_name: formData.full_name,
      phone: formData.phone || undefined,
      company: formData.company || undefined,
      bio: formData.bio || undefined,
      website: formData.website || undefined,
      avatar_url: formData.avatar_url || undefined,
    };

    const result = profileSchema.safeParse(dataToValidate);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);

    const { error } = await updateProfile({
      full_name: formData.full_name || null,
      phone: formData.phone || null,
      company: formData.company || null,
      bio: formData.bio || null,
      website: formData.website || null,
      avatar_url: formData.avatar_url || null,
      is_agent: formData.is_agent,
    });

    setIsSubmitting(false);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Profile Updated",
      description: "Your profile has been successfully updated.",
    });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  const initials = formData.full_name
    ?.split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase() || "U";

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-muted/30">
        <div className="container-wide py-8">
          <div className="max-w-2xl mx-auto">
            <Button
              variant="ghost"
              onClick={() => navigate("/dashboard")}
              className="mb-6"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>

            <div className="mb-8">
              <h1 className="text-3xl font-display font-bold mb-2">Edit Profile</h1>
              <p className="text-muted-foreground">
                Update your personal information and preferences.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Avatar Section */}
              <Card>
                <CardHeader>
                  <CardTitle>Profile Picture</CardTitle>
                  <CardDescription>Add a profile picture URL</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-6">
                    <Avatar className="h-24 w-24">
                      <AvatarImage src={formData.avatar_url || undefined} />
                      <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <Input
                        placeholder="https://example.com/avatar.jpg"
                        value={formData.avatar_url}
                        onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
                      />
                      {errors.avatar_url && (
                        <p className="text-sm text-destructive mt-1">{errors.avatar_url}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Personal Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Personal Information</CardTitle>
                  <CardDescription>Your public profile information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Full Name *</Label>
                    <Input
                      id="full_name"
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    />
                    {errors.full_name && (
                      <p className="text-sm text-destructive">{errors.full_name}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      value={profile?.email || ""}
                      disabled
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground">
                      Email cannot be changed
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+254 700 000 000"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                    {errors.phone && (
                      <p className="text-sm text-destructive">{errors.phone}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      placeholder="Tell us about yourself..."
                      value={formData.bio}
                      onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                      rows={4}
                    />
                    {errors.bio && (
                      <p className="text-sm text-destructive">{errors.bio}</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Agent Profile */}
              <Card>
                <CardHeader>
                  <CardTitle>Agent Profile</CardTitle>
                  <CardDescription>Professional details for agents</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="is_agent">Agent Account</Label>
                      <p className="text-sm text-muted-foreground">
                        Enable if you're a real estate agent or agency
                      </p>
                    </div>
                    <Switch
                      id="is_agent"
                      checked={formData.is_agent}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_agent: checked })}
                    />
                  </div>

                  {formData.is_agent && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="company">Company / Agency Name</Label>
                        <Input
                          id="company"
                          placeholder="Your company or agency name"
                          value={formData.company}
                          onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                        />
                        {errors.company && (
                          <p className="text-sm text-destructive">{errors.company}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="website">Website</Label>
                        <Input
                          id="website"
                          type="url"
                          placeholder="https://yourwebsite.com"
                          value={formData.website}
                          onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                        />
                        {errors.website && (
                          <p className="text-sm text-destructive">{errors.website}</p>
                        )}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Submit */}
              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/dashboard")}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Profile;
