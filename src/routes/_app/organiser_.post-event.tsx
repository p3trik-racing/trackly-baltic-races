import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { CATEGORIES } from "@/lib/categories";
import { COUNTRIES } from "@/lib/countries";
import { ArrowLeft, Upload } from "lucide-react";
import { toast } from "sonner";

const searchSchema = z.object({ edit: z.string().optional() });

export const Route = createFileRoute("/_app/organiser_/post-event")({
  component: PostEventPage,
  validateSearch: (search) => searchSchema.parse(search),
});

const DURATIONS = ["2 hours", "4 hours", "6 hours", "Full day", "Multi-day"];

function PostEventPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { edit: editId } = Route.useSearch();
  const [submitting, setSubmitting] = useState(false);
  const [waiver, setWaiver] = useState(false);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [existingCover, setExistingCover] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    category: CATEGORIES[0].value as string,
    description: "",
    date: "",
    time: "",
    duration: DURATIONS[0],
    country: COUNTRIES[0].value as string,
    city: "",
    location_name: "",
    location_lat: "" as string,
    location_lng: "" as string,
    capacity: 20,
    price: 0,
  });

  useEffect(() => {
    if (!editId) return;
    supabase.from("events").select("*").eq("id", editId).maybeSingle().then(({ data }) => {
      if (!data) return;
      setForm({
        title: data.title ?? "",
        category: data.category,
        description: data.description ?? "",
        date: data.date ?? "",
        time: data.time ? String(data.time).slice(0, 5) : "",
        duration: data.duration ?? DURATIONS[0],
        country: data.country ?? COUNTRIES[0].value,
        city: data.city ?? "",
        location_name: data.location_name ?? "",
        location_lat: data.location_lat != null ? String(data.location_lat) : "",
        location_lng: data.location_lng != null ? String(data.location_lng) : "",
        capacity: data.capacity ?? 0,
        price: Number(data.price ?? 0),
      });
      setExistingCover(data.cover_image_url);
      if (data.status === "live") setWaiver(true);
    });
  }, [editId]);

  function setField<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function onPickCover(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setCoverFile(f);
    setCoverPreview(URL.createObjectURL(f));
  }

  async function uploadCover(): Promise<string | null> {
    if (!coverFile || !user) return null;
    const ext = coverFile.name.split(".").pop() ?? "jpg";
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("event-covers").upload(path, coverFile);
    if (error) { toast.error(error.message); return null; }
    return supabase.storage.from("event-covers").getPublicUrl(path).data.publicUrl;
  }

  async function submit(status: "draft" | "live") {
    if (!user) return;
    if (!form.title || !form.date) return toast.error("Title and date are required");
    if (status === "live" && !waiver) return toast.error("Accept the liability statement to publish");
    setSubmitting(true);

    const cover = (await uploadCover()) ?? existingCover;

    const payload = {
      organiser_id: user.id,
      organiser_name: user.user_metadata?.full_name ?? null,
      title: form.title,
      category: form.category as any,
      description: form.description || null,
      date: form.date,
      time: form.time || null,
      duration: form.duration,
      country: form.country,
      city: form.city || null,
      location_name: form.location_name || null,
      capacity: Number(form.capacity) || 0,
      price: Number(form.price) || 0,
      currency: "EUR",
      cover_image_url: cover,
      status,
    };

    const { error } = editId
      ? await supabase.from("events").update(payload).eq("id", editId)
      : await supabase.from("events").insert(payload);

    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success(editId
      ? "Event updated"
      : status === "live" ? "Event published!" : "Saved as draft");
    navigate({ to: "/organiser" });
  }

  return (
    <main className="container-app py-6 space-y-5 pb-32">
      <button onClick={() => navigate({ to: "/organiser" })} className="inline-flex items-center gap-2 text-muted-foreground">
        <ArrowLeft size={18} /> Back
      </button>
      <h1 className="text-[22px] font-semibold">{editId ? "Edit Event" : "Post New Event"}</h1>

      <div className="space-y-3">
        <Field label="Event title">
          <input className="input-field" value={form.title} onChange={(e) => setField("title", e.target.value)} />
        </Field>

        <Field label="Category">
          <select className="input-field" value={form.category} onChange={(e) => setField("category", e.target.value)}>
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </Field>

        <Field label="Description">
          <textarea className="input-field py-3" style={{ height: "auto", minHeight: 96 }} rows={4}
            value={form.description} onChange={(e) => setField("description", e.target.value)} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Date">
            <input className="input-field" type="date" value={form.date} onChange={(e) => setField("date", e.target.value)} />
          </Field>
          <Field label="Time">
            <input className="input-field" type="time" value={form.time} onChange={(e) => setField("time", e.target.value)} />
          </Field>
        </div>

        <Field label="Duration">
          <select className="input-field" value={form.duration} onChange={(e) => setField("duration", e.target.value)}>
            {DURATIONS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </Field>

        <Field label="Country">
          <select className="input-field" value={form.country} onChange={(e) => setField("country", e.target.value)}>
            {COUNTRIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </Field>

        <Field label="City">
          <input className="input-field" value={form.city} onChange={(e) => setField("city", e.target.value)} />
        </Field>

        <Field label="Location / venue">
          <input className="input-field" value={form.location_name} onChange={(e) => setField("location_name", e.target.value)} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Capacity">
            <input className="input-field" type="number" min={0} value={form.capacity}
              onChange={(e) => setField("capacity", Number(e.target.value))} />
          </Field>
          <Field label="Ticket price (EUR)">
            <input className="input-field" type="number" min={0} step="0.01" value={form.price}
              onChange={(e) => setField("price", Number(e.target.value))} />
          </Field>
        </div>

        <Field label="Cover image">
          <label className="flex items-center gap-3 cursor-pointer bg-card border border-border rounded-xl p-3">
            {(coverPreview || existingCover) ? (
              <img src={coverPreview ?? existingCover ?? ""} alt="" className="w-16 h-16 rounded-lg object-cover" />
            ) : (
              <div className="w-16 h-16 rounded-lg flex items-center justify-center" style={{ backgroundColor: "var(--input)" }}>
                <Upload size={20} className="text-muted-foreground" />
              </div>
            )}
            <span className="text-sm text-muted-foreground">
              {coverFile ? coverFile.name : (existingCover ? "Replace cover image" : "Upload cover image")}
            </span>
            <input type="file" accept="image/*" hidden onChange={onPickCover} />
          </label>
        </Field>

        <label className="flex items-start gap-2 text-xs text-muted-foreground bg-card border border-border rounded-2xl p-4">
          <input type="checkbox" checked={waiver} onChange={(e) => setWaiver(e.target.checked)}
            className="mt-1 accent-[var(--accent)] flex-shrink-0" />
          <span>
            I confirm that I am solely responsible for the safety, legality, and insurance of this event. Trackly holds no liability.
          </span>
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-2">
        <button onClick={() => submit("draft")} disabled={submitting}
          className="h-14 rounded-xl border text-sm font-medium"
          style={{ borderColor: "var(--accent)", color: "var(--accent)" }}>
          Save as Draft
        </button>
        <button onClick={() => submit("live")} disabled={submitting}
          className="h-14 rounded-xl text-sm font-semibold text-white"
          style={{ backgroundColor: "var(--accent)" }}>
          {submitting ? "Saving…" : editId ? "Save Changes" : "Publish Event"}
        </button>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-muted-foreground">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
