import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useLang, catLabel, countryName, LangSwitcher } from "@/i18n";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { CATEGORIES } from "@/lib/categories";
import { COUNTRIES } from "@/lib/countries";
import { ArrowLeft, Upload } from "lucide-react";
import { toast } from "sonner";
import { ImageCropModal } from "@/components/ImageCropModal";
import type { TranslationKey } from "@/i18n/en";
import { useOrganiserGuard } from "@/lib/roles";

const searchSchema = z.object({ edit: z.string().optional() });

export const Route = createFileRoute("/_app/organiser_/post-event")({
  head: () => ({ meta: [
    { title: "Post an event — Majorka Racing" },
    { name: "description", content: "Create or edit a motorsport event listing." },
    { property: "og:title", content: "Post an event — Majorka Racing" },
    { property: "og:description", content: "Create or edit a motorsport event listing." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: PostEventPage,
  validateSearch: (search) => searchSchema.parse(search),
});

const DURATIONS = ["2 hours", "4 hours", "6 hours", "Full day", "Multi-day"];
const REQUIREMENTS = ["helmet", "tech_ok", "sound_limit", "driver_only", "studded_tyres", "rwd_only"] as const;
const DURATION_KEYS: Record<string, TranslationKey> = {
  "2 hours": "organiser.post.duration.2h", "4 hours": "organiser.post.duration.4h", "6 hours": "organiser.post.duration.6h",
  "Full day": "organiser.post.duration.fullDay", "Multi-day": "organiser.post.duration.multiDay",
};

function PostEventPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useLang();
  const { isAdmin } = useOrganiserGuard(t("organiser.notAllowed"));
  const { edit: editId } = Route.useSearch();
  const [submitting, setSubmitting] = useState(false);
  const [waiver, setWaiver] = useState(false);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [existingCover, setExistingCover] = useState<string | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [customRequirement, setCustomRequirement] = useState("");
  const [addingRequirement, setAddingRequirement] = useState(false);
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
    deposit: "",
    format: "",
    requirements: [] as string[],
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
        deposit: data.deposit != null ? String(data.deposit) : "",
        format: data.format ?? "",
        requirements: data.requirements ?? [],
      });
      setExistingCover(data.cover_image_url);
      if (data.status === "live") setWaiver(true);
    });
  }, [editId]);

  function setField<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function openFilePicker(onFile: (file: File) => void, accept: string) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.style.display = 'none';
    document.body.appendChild(input);
    input.onchange = () => {
      const file = input.files?.[0];
      document.body.removeChild(input);
      if (file) onFile(file);
    };
    input.click();
  }

  function onPickCover(f: File) {
    setCropSrc(URL.createObjectURL(f));
  }

  function closeCrop() {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
  }

  function onCropConfirm(blob: Blob) {
    const file = new File([blob], `cover-${Date.now()}.jpg`, { type: "image/jpeg" });
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(blob));
    closeCrop();
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
    if (!form.title || !form.date) return toast.error(t("organiser.post.required"));
    if (status === "live" && !waiver) return toast.error(t("organiser.post.acceptWaiver"));
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
      location_lat: form.location_lat ? Number(form.location_lat) : null,
      location_lng: form.location_lng ? Number(form.location_lng) : null,
      capacity: Number(form.capacity) || 0,
      price: Number(form.price) || 0,
      deposit: form.deposit === "" ? null : Number(form.deposit),
      format: form.format || null,
      requirements: form.requirements,
      currency: "EUR",
      cover_image_url: cover,
      status,
    };

    const { data: saved, error } = editId
      ? await supabase.from("events").update(payload).eq("id", editId).select("id").maybeSingle()
      : await supabase.from("events").insert(payload).select("id").single();

    setSubmitting(false);
    if (error) return toast.error(error.message);
    const savedId = (saved as any)?.id ?? editId;
    if (status === "live" && savedId) {
      const { data: ann } = await supabase.rpc("announce_event", { _event_id: savedId });
      const n = Number((ann as any)?.recipients ?? 0);
      if (n > 0) toast.success(t("organiser.followersNotified", { count: n }));
    }
    toast.success(editId
      ? t("organiser.post.updated")
      : status === "live" ? t("organiser.post.published") : t("organiser.post.drafted"));
    navigate({ to: "/organiser" });
  }

  const specialReadOnly = !!editId && !isAdmin && form.category === "majorka_special";
  return (
    <main className="container-app py-6 space-y-5 pb-32">
      <button onClick={() => navigate({ to: "/organiser" })} className="inline-flex items-center gap-2 text-muted-foreground">
        <ArrowLeft size={18} /> {t("common.back")}
      </button>
      <h1 className="text-[22px] font-semibold">{editId ? t("organiser.post.editTitle") : t("organiser.post.newTitle")}</h1>
      {specialReadOnly && (
        <p className="text-sm border border-border rounded-xl p-3 text-muted-foreground">{t("organiser.post.specialReadOnly")}</p>
      )}

      <div className="space-y-3">
        <Field label={t("organiser.post.eventTitle")}>
          <input className="input-field" value={form.title} onChange={(e) => setField("title", e.target.value)} />
        </Field>

        <Field label={t("organiser.post.category")}>
          <select className="input-field" value={form.category} onChange={(e) => setField("category", e.target.value)}>
            {CATEGORIES.filter((c) => c.value !== "majorka_special" || isAdmin || form.category === "majorka_special")
              .map((c) => <option key={c.value} value={c.value}>{catLabel(t, c.value)}</option>)}
          </select>
        </Field>

        <Field label={t("organiser.post.description")}>
          <textarea className="input-field py-3" style={{ height: "auto", minHeight: 96 }} rows={4}
            value={form.description} onChange={(e) => setField("description", e.target.value)} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label={t("organiser.post.date")}>
            <input className="input-field" type="date" value={form.date} onChange={(e) => setField("date", e.target.value)} />
          </Field>
          <Field label={t("organiser.post.time")}>
            <input className="input-field" type="time" value={form.time} onChange={(e) => setField("time", e.target.value)} />
          </Field>
        </div>

        <Field label={t("organiser.post.duration")}>
          <select className="input-field" value={form.duration} onChange={(e) => setField("duration", e.target.value)}>
            {DURATIONS.map((d) => <option key={d} value={d}>{DURATION_KEYS[d] ? t(DURATION_KEYS[d]) : d}</option>)}
          </select>
        </Field>

        <Field label={t("organiser.post.country")}>
          <select className="input-field" value={form.country} onChange={(e) => setField("country", e.target.value)}>
            {COUNTRIES.map((c) => <option key={c.value} value={c.value}>{countryName(t, c.value)}</option>)}
          </select>
        </Field>

        <Field label={t("organiser.post.city")}>
          <input className="input-field" value={form.city} onChange={(e) => setField("city", e.target.value)} />
        </Field>

        <div>
          <label className="text-xs text-muted-foreground">{t("organiser.post.mapLocation")}</label>
          <input
            className="input-field mt-1"
            placeholder={t("organiser.post.mapPlaceholder")}
            value={form.location_name}
            onChange={(e) => setField("location_name", e.target.value)}
          />
          <p className="text-[11px] text-muted-foreground mt-1">
            {t("organiser.post.mapHelp")}
          </p>
          <input type="hidden" value={form.location_lat} onChange={(e) => setField("location_lat", e.target.value)} />
          <input type="hidden" value={form.location_lng} onChange={(e) => setField("location_lng", e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label={t("organiser.post.capacity")}>
            <input className="input-field" type="number" min={0} value={form.capacity}
              onFocus={(e) => e.target.select()}
              onChange={(e) => setField("capacity", Number(e.target.value))} />
          </Field>
          <Field label={t("organiser.post.price")}>
            <input className="input-field" type="number" min={0} step="0.01" value={form.price}
              onFocus={(e) => e.target.select()}
              onChange={(e) => setField("price", Number(e.target.value))} />
          </Field>
        </div>

        <Field label={t("organiser.post.deposit")}>
          <input className="input-field" type="number" min={0} step="0.01" value={form.deposit}
            onChange={(e) => setField("deposit", e.target.value)} />
        </Field>
        <Field label={t("organiser.post.format")}>
          <input className="input-field" type="text" value={form.format}
            onChange={(e) => setField("format", e.target.value)} />
        </Field>
        <div>
          <p className="text-xs text-muted-foreground mb-2">{t("organiser.post.requirements")}</p>
          <div className="flex flex-wrap gap-2">
            {REQUIREMENTS.map((key) => (
              <label key={key} className={`cursor-pointer rounded-full border px-3 py-2 text-xs ${form.requirements.includes(key) ? "border-accent bg-accent text-accent-foreground" : "border-border bg-card"}`}>
                <input type="checkbox" className="sr-only" checked={form.requirements.includes(key)}
                  onChange={(e) => setField("requirements", e.target.checked ? [...form.requirements, key] : form.requirements.filter((v) => v !== key))} />
                {t(`req.${key}`)}
              </label>
            ))}
            {form.requirements.filter((requirement) => !REQUIREMENTS.includes(requirement as (typeof REQUIREMENTS)[number])).map((requirement) => (
              <button key={requirement} type="button" onClick={() => setField("requirements", form.requirements.filter((value) => value !== requirement))}
                className="rounded-full border border-accent bg-accent px-3 py-2 text-xs text-accent-foreground">
                {requirement} ×
              </button>
            ))}
          </div>
          {addingRequirement ? (
            <div className="mt-2 flex gap-2">
              <input className="input-field" value={customRequirement} placeholder={t("organiser.post.customRequirementPlaceholder")}
                onChange={(e) => setCustomRequirement(e.target.value)} />
              <button type="button" className="h-12 shrink-0 rounded-xl border border-border px-4 text-sm"
                onClick={() => {
                  const value = customRequirement.trim();
                  if (!value || form.requirements.includes(value)) return;
                  setField("requirements", [...form.requirements, value]);
                  setCustomRequirement("");
                  setAddingRequirement(false);
                }}>
                {t("organiser.post.add")}
              </button>
            </div>
          ) : (
            <button type="button" className="mt-2 text-sm text-accent" onClick={() => setAddingRequirement(true)}>
              {t("organiser.post.addRequirement")}
            </button>
          )}
        </div>

        <Field label={t("organiser.post.cover")}>
          <button
            type="button"
            onClick={() => openFilePicker(onPickCover, "image/*")}
            className="flex items-center gap-3 bg-card border border-border rounded-xl p-3 w-full text-left"
          >
            {(coverPreview || existingCover) ? (
              <img src={coverPreview ?? existingCover ?? ""} alt="" className="w-16 h-16 rounded-lg object-cover" />
            ) : (
              <div className="w-16 h-16 rounded-lg flex items-center justify-center" style={{ backgroundColor: "var(--input)" }}>
                <Upload size={20} className="text-muted-foreground" />
              </div>
            )}
            <span className="text-sm text-muted-foreground">
              {coverFile ? coverFile.name : (existingCover ? t("organiser.post.replaceCover") : t("organiser.post.uploadCover"))}
            </span>
          </button>
        </Field>

        <label className="flex items-start gap-2 text-xs text-muted-foreground bg-card border border-border rounded-2xl p-4">
          <input type="checkbox" checked={waiver} onChange={(e) => setWaiver(e.target.checked)}
            className="mt-1 accent-[var(--accent)] flex-shrink-0" />
          <span>
            {t("organiser.post.waiverPrefix")} {" "}
            <Link to="/terms" target="_blank" className="text-accent underline">{t("splash.terms")}</Link>
            {" "}{t("splash.and")}{" "}
            <Link to="/event-terms" target="_blank" className="text-accent underline">{t("eventTerms.title")}</Link>
          </span>
        </label>
      </div>

      {!specialReadOnly && <div className="grid grid-cols-2 gap-3 pt-2">
        <button onClick={() => submit("draft")} disabled={submitting}
          className="h-14 rounded-xl border text-sm font-medium"
          style={{ borderColor: "var(--accent)", color: "var(--accent)" }}>
          {t("organiser.post.saveDraft")}
        </button>
        <button onClick={() => submit("live")} disabled={submitting}
          className="h-14 rounded-xl text-sm font-semibold text-accent-foreground"
          style={{ backgroundColor: "var(--accent)" }}>
          {submitting ? t("common.saving") : editId ? t("organiser.post.saveChanges") : t("organiser.post.publish")}
        </button>
      </div>}
      {cropSrc && (
        <ImageCropModal
          imageSrc={cropSrc}
          aspectRatio={16 / 9}
          onConfirm={onCropConfirm}
          onCancel={closeCrop}
        />
      )}
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
