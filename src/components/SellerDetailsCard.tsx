import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useLang } from "@/i18n";
import { toast } from "sonner";

const empty = { seller_type: "individual", legal_name: "", address_line: "", city: "", postcode: "", country: "LV", tax_id_or_reg_no: "", vat_no: "", iban: "", date_of_birth: "" };

export function validIban(v: string) {
  const s = v.replace(/\s+/g, "").toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(s)) return false;
  const r = (s.slice(4) + s.slice(0, 4)).replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  let m = 0;
  for (const ch of r) m = (m * 10 + Number(ch)) % 97;
  return m === 1;
}

export function SellerDetailsCard() {
  const { user } = useAuth();
  const { t } = useLang();
  const [f, setF] = useState(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("organiser_tax_details").select("*").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (data) setF({ ...empty, ...data, vat_no: data.vat_no ?? "", date_of_birth: data.date_of_birth ?? "" });
    });
  }, [user]);

  const set = (k: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  const isInd = f.seller_type === "individual";

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const req = [f.legal_name, f.address_line, f.city, f.postcode, f.country, f.tax_id_or_reg_no, f.iban, isInd ? f.date_of_birth : "x"];
    if (req.some((v) => !v.trim())) return toast.error(t("seller.missing"));
    if (!validIban(f.iban)) return toast.error(t("seller.badIban"));
    setSaving(true);
    const { error } = await supabase.from("organiser_tax_details").upsert({
      user_id: user.id, seller_type: f.seller_type, legal_name: f.legal_name.trim(), address_line: f.address_line.trim(),
      city: f.city.trim(), postcode: f.postcode.trim(), country: f.country.trim().toUpperCase(), tax_id_or_reg_no: f.tax_id_or_reg_no.trim(),
      vat_no: f.vat_no.trim() || null, iban: f.iban.replace(/\s+/g, "").toUpperCase(), date_of_birth: isInd ? f.date_of_birth : null,
      updated_at: new Date().toISOString(),
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(t("seller.saved"));
  }

  const field = (k: keyof typeof empty, label: string, type = "text") => (
    <label className="block text-sm">
      <span className="text-muted-foreground">{label}</span>
      <input className="input-field mt-1" type={type} value={f[k]} onChange={set(k)} />
    </label>
  );

  return (
    <form id="seller-details" onSubmit={save} className="bg-card border border-border rounded-xl p-4 space-y-3 scroll-mt-20">
      <div>
        <h2 className="font-semibold">{t("seller.title")}</h2>
        <p className="text-xs text-muted-foreground mt-1">{t("seller.dac7")}</p>
      </div>
      <label className="block text-sm">
        <span className="text-muted-foreground">{t("seller.type")}</span>
        <select className="input-field mt-1" value={f.seller_type} onChange={set("seller_type")}>
          <option value="individual">{t("seller.individual")}</option>
          <option value="company">{t("seller.company")}</option>
        </select>
      </label>
      {field("legal_name", t("seller.legalName"))}
      {field("address_line", t("seller.address"))}
      <div className="grid grid-cols-2 gap-3">
        {field("city", t("seller.city"))}
        {field("postcode", t("seller.postcode"))}
      </div>
      {field("country", t("seller.country"))}
      {field("tax_id_or_reg_no", t("seller.taxId"))}
      {field("vat_no", t("seller.vat"))}
      {field("iban", t("seller.iban"))}
      {isInd && field("date_of_birth", t("seller.dob"), "date")}
      <button type="submit" className="btn-primary w-full" disabled={saving}>{t("seller.save")}</button>
    </form>
  );
}
