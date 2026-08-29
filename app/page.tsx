"use client";

import { useEffect, useMemo, useState } from "react";
import {
  calculateLoan,
  findBreakEvenRate,
  requiredDownPaymentForMonthlyTarget,
  requiredDownPaymentForTotalTarget,
} from "@/lib/mortgage";

type FormState = {
  price: number; downPayment: number; currentRate: number; years: number;
  waitYears: number; extraDownPayment: number; futureRate: number;
  purchaseCosts: number; renovation: number; moving: number; furniture: number;
  propertyTax: number; cityTax: number; fireInsurance: number; earthquakeInsurance: number;
  repairMonthly: number; currentHousingMonthly: number; renewalCosts: number;
  availableCash: number; desiredCash: number; priceChange: number;
};

const defaults: FormState = {
  price: 6500, downPayment: 1000, currentRate: 1, years: 35,
  waitYears: 2, extraDownPayment: 500, futureRate: 2,
  purchaseCosts: 0, renovation: 0, moving: 0, furniture: 0,
  propertyTax: 0, cityTax: 0, fireInsurance: 0, earthquakeInsurance: 0,
  repairMonthly: 0, currentHousingMonthly: 58000, renewalCosts: 0,
  availableCash: 0, desiredCash: 0, priceChange: 0,
};

const STORAGE_KEY = "home-timing-simulator-v1";
const yen = (value: number) => Number.isFinite(value) ? `${Math.round(value).toLocaleString("ja-JP")}円` : "—";
const man = (value: number) => Number.isFinite(value) ? `${Math.round(value / 10_000).toLocaleString("ja-JP")}万円` : "—";
const signedYen = (value: number) => Number.isFinite(value) ? `${value > 0 ? "+" : value < 0 ? "−" : "±"}${Math.round(Math.abs(value)).toLocaleString("ja-JP")}円` : "—";
const signedMan = (value: number) => Number.isFinite(value) ? `${value > 0 ? "+" : value < 0 ? "−" : "±"}${Math.round(Math.abs(value) / 10_000).toLocaleString("ja-JP")}万円` : "—";
const signedPoint = (value: number) => `${value > 0 ? "+" : value < 0 ? "−" : "±"}${Math.abs(value).toFixed(2)}ポイント`;

function NumberInput({ label, value, unit, onChange, min = 0, step = 1, hint }: {
  label: string; value: number; unit: string; onChange: (value: number) => void; min?: number; step?: number; hint?: string;
}) {
  return <label className="field"><span>{label}</span><span className="input-wrap"><input type="number" inputMode="decimal" value={value} min={min} step={step} onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}/><b>{unit}</b></span>{hint && <small>{hint}</small>}</label>;
}

function ResultRows({ rows }: { rows: [string, string, boolean?][] }) {
  return <dl className="result-list">{rows.map(([label, value, strong]) => <div key={label} className={strong ? "featured" : ""}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>;
}

export default function Home() {
  const [form, setForm] = useState<FormState>(defaults);
  const [loaded, setLoaded] = useState(false);
  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((prev) => ({ ...prev, [key]: value }));

  useEffect(() => {
    try { const saved = localStorage.getItem(STORAGE_KEY); if (saved) setForm({ ...defaults, ...JSON.parse(saved) }); } catch { /* Ignore inaccessible or malformed local data. */ }
    setLoaded(true);
  }, []);
  useEffect(() => { if (loaded) localStorage.setItem(STORAGE_KEY, JSON.stringify(form)); }, [form, loaded]);

  const values = useMemo(() => {
    const price = form.price * 10_000;
    const currentDown = form.downPayment * 10_000;
    const futurePrice = price * (1 + form.priceChange / 100);
    const futureDown = (form.downPayment + form.extraDownPayment) * 10_000;
    const current = calculateLoan(price - currentDown, form.currentRate, form.years);
    const future = calculateLoan(futurePrice - futureDown, form.futureRate, form.years);
    const annualExtras = form.propertyTax + form.cityTax + form.fireInsurance + form.earthquakeInsurance;
    const currentEffective = current.monthlyPayment + annualExtras / 12 + form.repairMonthly;
    const futureEffective = future.monthlyPayment + annualExtras / 12 + form.repairMonthly;
    const waitingHousing = form.currentHousingMonthly * form.waitYears * 12 + form.renewalCosts * 10_000;
    const requiredMonthlyDown = requiredDownPaymentForMonthlyTarget(futurePrice, current.monthlyPayment, form.futureRate, form.years);
    const requiredTotalDown = requiredDownPaymentForTotalTarget(futurePrice, current.totalPayment, form.futureRate, form.years);
    const futurePrincipal = futurePrice - futureDown;
    const monthlyBreakEven = findBreakEvenRate(futurePrincipal, form.years, current.monthlyPayment, "monthly");
    const totalBreakEven = findBreakEvenRate(futurePrincipal, form.years, current.totalPayment, "total");
    const cashCosts = (form.purchaseCosts + form.renovation + form.moving + form.furniture) * 10_000;
    const currentCash = form.availableCash * 10_000 - currentDown - cashCosts;
    const futureCash = (form.availableCash + form.extraDownPayment) * 10_000 - futureDown - cashCosts;
    return { price, currentDown, futurePrice, futureDown, current, future, currentEffective, futureEffective, waitingHousing, requiredMonthlyDown, requiredTotalDown, monthlyBreakEven, totalBreakEven, currentCash, futureCash };
  }, [form]);

  const errors = [
    form.price <= 0 ? "物件価格は0より大きい値を入力してください。" : "",
    form.downPayment > form.price ? "今買う場合の頭金が物件価格を超えています。" : "",
    values.futureDown > values.futurePrice ? "待って買う場合の頭金が将来の物件価格を超えています。" : "",
    form.currentRate < 0 || form.futureRate < 0 ? "金利は0%以上で入力してください。" : "",
    form.years <= 0 ? "返済期間は0より大きい値を入力してください。" : "",
    form.waitYears < 0 ? "購入までの期間は0年以上で入力してください。" : "",
  ].filter(Boolean);
  const valid = errors.length === 0;
  const remainingText = (required: number) => {
    const remaining = required - values.futureDown;
    return remaining > 0 ? `予定している頭金に加えて ${man(remaining)}` : remaining < 0 ? `予定している頭金との差 ${signedMan(remaining)}` : "予定している頭金と同額";
  };

  return <main>
    <header className="hero"><p className="eyebrow">HOME TIMING COMPARISON</p><h1>住宅購入タイミング<br className="mobile-break"/> シミュレーター</h1><p>今買う場合と、頭金を増やしてから買う場合を比較できます。</p><span className="privacy">入力内容は端末内だけで計算され、外部へ送信されません</span></header>

    <section aria-labelledby="conditions-title"><div className="section-heading"><span>01</span><div><h2 id="conditions-title">比較する条件</h2><p>数字を変えると結果がすぐに更新されます</p></div></div>
      <div className="two-column inputs">
        <article className="card current"><div className="card-label"><span>NOW</span><h3>今買う</h3></div>
          <NumberInput label="物件価格" value={form.price} unit="万円" onChange={(v) => update("price", v)}/>
          <NumberInput label="頭金" value={form.downPayment} unit="万円" onChange={(v) => update("downPayment", v)}/>
          <NumberInput label="住宅ローン金利" value={form.currentRate} unit="%" step={0.05} onChange={(v) => update("currentRate", v)}/>
          <NumberInput label="返済期間" value={form.years} unit="年" onChange={(v) => update("years", v)}/>
        </article>
        <article className="card future"><div className="card-label"><span>WAIT</span><h3>待って買う</h3></div>
          <NumberInput label="購入までの期間" value={form.waitYears} unit="年" step={0.5} onChange={(v) => update("waitYears", v)}/>
          <NumberInput label="待つ間に増やす頭金" value={form.extraDownPayment} unit="万円" onChange={(v) => update("extraDownPayment", v)} hint="住居費などを支払った後に増やせる金額"/>
          <NumberInput label="購入時の想定金利" value={form.futureRate} unit="%" step={0.05} onChange={(v) => update("futureRate", v)}/>
          <input className="rate-range" aria-label="購入時の想定金利スライダー" type="range" min="0" max="5" step="0.05" value={Math.min(5, Math.max(0, form.futureRate))} onChange={(e) => update("futureRate", Number(e.target.value))}/><div className="range-label"><span>0%</span><span>5%</span></div>
        </article>
      </div>
      {errors.length > 0 && <div className="errors" role="alert"><strong>入力内容を確認してください</strong>{errors.map((e) => <p key={e}>{e}</p>)}</div>}
    </section>

    {valid && <>
      <section aria-labelledby="result-title"><div className="section-heading"><span>02</span><div><h2 id="result-title">比較結果</h2><p>同じ返済期間・元利均等返済での概算です</p></div></div>
        <div className="two-column results">
          <article className="card result-card"><p className="mini-label">今買う</p><h3>{man(values.current.monthlyPayment)}<small> / 月</small></h3><ResultRows rows={[["物件価格", man(values.price)],["頭金", man(values.currentDown)],["借入額", man(values.current.principal)],["金利", `${form.currentRate.toFixed(2)}%`],["月返済", yen(values.current.monthlyPayment), true],["総返済額", man(values.current.totalPayment)],["総利息", man(values.current.totalInterest)],["実質月額住居費", yen(values.currentEffective)]]}/></article>
          <article className="card result-card"><p className="mini-label">{form.waitYears}年後に買う</p><h3>{man(values.future.monthlyPayment)}<small> / 月</small></h3><ResultRows rows={[["物件価格", man(values.futurePrice)],["頭金", man(values.futureDown)],["借入額", man(values.future.principal)],["金利", `${form.futureRate.toFixed(2)}%`],["月返済", yen(values.future.monthlyPayment), true],["総返済額", man(values.future.totalPayment)],["総利息", man(values.future.totalInterest)],["実質月額住居費", yen(values.futureEffective)]]}/></article>
        </div>
      </section>

      <section className="change-card" aria-labelledby="change-title"><p className="mini-label">CHANGE</p><h2 id="change-title">{form.waitYears}年間待った場合の変化</h2><ResultRows rows={[["物件価格", signedMan(values.futurePrice-values.price)],["頭金", signedMan(values.futureDown-values.currentDown)],["借入額", signedMan(values.future.principal-values.current.principal)],["金利", signedPoint(form.futureRate-form.currentRate)],["月返済", `${signedYen(values.future.monthlyPayment-values.current.monthlyPayment)} / 月`],["総利息", signedMan(values.future.totalInterest-values.current.totalInterest)],["総返済額", signedMan(values.future.totalPayment-values.current.totalPayment)],["待機期間中住居費", man(values.waitingHousing)]]}/><p className="neutral-note">符号は数値の増減を表します。結果の評価や推奨を示すものではありません。</p></section>

      <section className="insights" aria-label="逆算結果">
        <article className="insight-card"><p className="mini-label">REQUIRED DOWN PAYMENT</p><h2>金利上昇を相殺するには？</h2><p className="lead">想定金利 <strong>{form.futureRate.toFixed(2)}%</strong> で、今買う場合と同じ返済額にするための頭金です。</p><div className="insight-grid"><div><span>月返済額ベース</span><strong>{remainingText(values.requiredMonthlyDown)}</strong><small>必要な頭金合計 {man(values.requiredMonthlyDown)}</small></div><div><span>総返済額ベース</span><strong>{remainingText(values.requiredTotalDown)}</strong><small>必要な頭金合計 {man(values.requiredTotalDown)}</small></div></div></article>
        <article className="insight-card"><p className="mini-label">BREAK-EVEN RATE</p><h2>金利の分岐点</h2><p className="lead">頭金を <strong>{man(values.futureDown-values.currentDown)}</strong> 増やした条件で、今買う場合と同じ返済額になる金利です。</p><div className="insight-grid rates"><div><span>月返済額が同じ</span><strong>{values.monthlyBreakEven === null ? "範囲外" : `${values.monthlyBreakEven.toFixed(2)}%`}</strong></div><div><span>総返済額が同じ</span><strong>{values.totalBreakEven === null ? "範囲外" : `${values.totalBreakEven.toFixed(2)}%`}</strong></div></div></article>
      </section>
    </>}

    <section className="details-section"><details><summary><span><b>詳細設定を開く</b><small>住居費・税金・諸費用・物件価格変動など</small></span><i aria-hidden="true">＋</i></summary><div className="detail-body">
      <h3>購入時の費用 <small>万円</small></h3><div className="detail-grid"><NumberInput label="購入諸費用" value={form.purchaseCosts} unit="万円" onChange={(v) => update("purchaseCosts", v)}/><NumberInput label="リフォーム費" value={form.renovation} unit="万円" onChange={(v) => update("renovation", v)}/><NumberInput label="引越し費" value={form.moving} unit="万円" onChange={(v) => update("moving", v)}/><NumberInput label="家具・家電費" value={form.furniture} unit="万円" onChange={(v) => update("furniture", v)}/></div>
      <h3>購入後の年間費用 <small>円</small></h3><div className="detail-grid"><NumberInput label="固定資産税 / 年" value={form.propertyTax} unit="円" onChange={(v) => update("propertyTax", v)}/><NumberInput label="都市計画税 / 年" value={form.cityTax} unit="円" onChange={(v) => update("cityTax", v)}/><NumberInput label="火災保険 / 年換算" value={form.fireInsurance} unit="円" onChange={(v) => update("fireInsurance", v)}/><NumberInput label="地震保険 / 年換算" value={form.earthquakeInsurance} unit="円" onChange={(v) => update("earthquakeInsurance", v)}/><NumberInput label="将来修繕積立額 / 月" value={form.repairMonthly} unit="円" onChange={(v) => update("repairMonthly", v)}/></div>
      <h3>待機・現金・価格</h3><div className="detail-grid"><NumberInput label="現在の月額住居費" value={form.currentHousingMonthly} unit="円" onChange={(v) => update("currentHousingMonthly", v)}/><NumberInput label="待機中の更新料等（合計）" value={form.renewalCosts} unit="万円" onChange={(v) => update("renewalCosts", v)}/><NumberInput label="現在の住宅購入用現金" value={form.availableCash} unit="万円" onChange={(v) => update("availableCash", v)}/><NumberInput label="購入後に残したい現金" value={form.desiredCash} unit="万円" onChange={(v) => update("desiredCash", v)}/><NumberInput label="将来の物件価格変動率" value={form.priceChange} unit="%" min={-100} step={1} onChange={(v) => update("priceChange", v)}/></div>
      {valid && <div className="detail-results"><h3>詳細な計算結果</h3><ResultRows rows={[["待機期間中住居費", man(values.waitingHousing)],["今買う場合の実質月額住居費", yen(values.currentEffective)],[`${form.waitYears}年後の実質月額住居費`, yen(values.futureEffective)],...(form.availableCash > 0 ? [["今買う場合の購入後現金", man(values.currentCash)],[`${form.waitYears}年後の購入後現金`, man(values.futureCash)],["残したい現金", `${form.desiredCash.toLocaleString("ja-JP")}万円`]] as [string,string][] : [])]}/></div>}
      <button className="reset" type="button" onClick={() => setForm(defaults)}>初期値に戻す</button>
    </div></details></section>

    <footer><strong>ご利用にあたって</strong><p>本シミュレーターは概算です。実際の住宅ローンでは、金融機関ごとの金利変更ルール、手数料、保証料、団体信用生命保険、税金等により結果が異なる場合があります。住宅購入の最終判断は、金融機関・専門家等の情報も確認のうえ行ってください。</p><p>元利均等返済・ボーナス返済なし・期間中の金利一定として計算しています。</p></footer>
  </main>;
}
