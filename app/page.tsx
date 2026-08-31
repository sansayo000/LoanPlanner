"use client";

import { useEffect, useMemo, useState } from "react";
import { calculateLoan, findBreakEvenRate, requiredDownPaymentForMonthlyTarget, requiredDownPaymentForTotalTarget } from "@/lib/mortgage";

type FormState = {
  price:number; loanAmount:number; currentRate:number; years:number; waitMonths:number;
  extraDownPayment:number; futureRate:number; currentRent:number; purchaseCosts:number;
  renovation:number; moving:number; furniture:number; propertyTax:number; cityTax:number;
  fireInsurance:number; earthquakeInsurance:number; repairMonthly:number; renewalCosts:number;
  availableCash:number; desiredCash:number; priceChange:number;
};

const defaults:FormState={price:6500,loanAmount:5500,currentRate:1,years:35,waitMonths:24,extraDownPayment:500,futureRate:2,currentRent:58000,purchaseCosts:0,renovation:0,moving:0,furniture:0,propertyTax:0,cityTax:0,fireInsurance:0,earthquakeInsurance:0,repairMonthly:0,renewalCosts:0,availableCash:0,desiredCash:0,priceChange:0};
const STORAGE_KEY="home-timing-simulator-v2";
const toYen=(value:number)=>value*10_000;
const yen=(value:number)=>Number.isFinite(value)?`${Math.round(value).toLocaleString("ja-JP")}円`:"—";
const man=(value:number)=>Number.isFinite(value)?`${Math.round(value/10_000).toLocaleString("ja-JP")}万円`:"—";
const signedYen=(value:number)=>Number.isFinite(value)?`${value>0?"+":value<0?"−":"±"}${Math.round(Math.abs(value)).toLocaleString("ja-JP")}円`:"—";
const signedMan=(value:number)=>Number.isFinite(value)?`${value>0?"+":value<0?"−":"±"}${Math.round(Math.abs(value)/10_000).toLocaleString("ja-JP")}万円`:"—";
const duration=(months:number)=>months<12?`${months}カ月`:`${Math.floor(months/12)}年${months%12?`${months%12}カ月`:""}`;

function NumberInput({label,value,unit,onChange,min=0,max,step=1,note}:{label:string;value:number;unit:string;onChange:(value:number)=>void;min?:number;max?:number;step?:number;note?:string}){
  const[draft,setDraft]=useState(String(value));
  useEffect(()=>setDraft(String(value)),[value]);
  const handleChange=(raw:string)=>{setDraft(raw);if(raw!=="")onChange(Number(raw))};
  const handleBlur=()=>{if(draft===""){setDraft("0");onChange(0)}};
  return <label className="field"><span className="field-label">{label}</span><span className="input-shell"><input type="number" inputMode="decimal" value={draft} min={min} max={max} step={step} onChange={event=>handleChange(event.target.value)} onBlur={handleBlur}/><b>{unit}</b></span>{note&&<small>{note}</small>}</label>;
}
function DetailRows({rows}:{rows:[string,string][]}){return <dl className="detail-rows">{rows.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>}

export default function Home(){
  const[form,setForm]=useState<FormState>(defaults);
  const[loaded,setLoaded]=useState(false);
  const update=<K extends keyof FormState>(key:K,value:FormState[K])=>setForm(previous=>({...previous,[key]:value}));
  useEffect(()=>{try{const saved=localStorage.getItem(STORAGE_KEY);if(saved)setForm({...defaults,...JSON.parse(saved)})}catch{/* 保存は任意 */}setLoaded(true)},[]);
  useEffect(()=>{if(loaded)localStorage.setItem(STORAGE_KEY,JSON.stringify(form))},[form,loaded]);

  const values=useMemo(()=>{
    const price=toYen(form.price),currentPrincipal=toYen(form.loanAmount),currentDown=price-currentPrincipal;
    const futurePrice=price*(1+form.priceChange/100);
    const futurePrincipal=currentPrincipal-toYen(form.extraDownPayment)+(futurePrice-price);
    const futureDown=futurePrice-futurePrincipal;
    const current=calculateLoan(currentPrincipal,form.currentRate,form.years);
    const future=calculateLoan(futurePrincipal,form.futureRate,form.years);
    const annualExtras=form.propertyTax+form.cityTax+form.fireInsurance+form.earthquakeInsurance;
    const currentEffective=current.monthlyPayment+annualExtras/12+form.repairMonthly;
    const futureEffective=future.monthlyPayment+annualExtras/12+form.repairMonthly;
    const waitingRent=form.currentRent*form.waitMonths,waitingHousing=waitingRent+toYen(form.renewalCosts);
    const requiredMonthlyDown=requiredDownPaymentForMonthlyTarget(futurePrice,current.monthlyPayment,form.futureRate,form.years);
    const requiredTotalDown=requiredDownPaymentForTotalTarget(futurePrice,current.totalPayment,form.futureRate,form.years);
    const monthlyBreakEven=findBreakEvenRate(futurePrincipal,form.years,current.monthlyPayment,"monthly");
    const totalBreakEven=findBreakEvenRate(futurePrincipal,form.years,current.totalPayment,"total");
    const cashCosts=toYen(form.purchaseCosts+form.renovation+form.moving+form.furniture);
    const currentCash=toYen(form.availableCash)-currentDown-cashCosts;
    const futureCash=toYen(form.availableCash+form.extraDownPayment)-futureDown-cashCosts;
    return{price,currentPrincipal,currentDown,futurePrice,futurePrincipal,futureDown,current,future,currentEffective,futureEffective,waitingRent,waitingHousing,requiredMonthlyDown,requiredTotalDown,monthlyBreakEven,totalBreakEven,currentCash,futureCash};
  },[form]);

  const errors=[form.price<=0?"物件価格は0より大きい値を入力してください。":"",form.loanAmount<0?"借入額は0以上で入力してください。":"",form.loanAmount>form.price?"借入額が物件価格を超えています。":"",values.futurePrincipal<0?"追加頭金により、将来の借入額が0円未満になっています。":"",form.currentRate<0||form.futureRate<0?"金利は0%以上で入力してください。":"",form.years<=0?"返済期間は0より大きい値を入力してください。":"",form.waitMonths<1?"待機期間は1カ月以上で入力してください。":""].filter(Boolean);
  const valid=errors.length===0,futureLabel=`${duration(form.waitMonths)}後`;
  const remainingDown=(required:number)=>{const remaining=required-values.futureDown;return remaining>0?{main:`あと ${man(remaining)}`,sub:`必要な頭金合計 ${man(required)}`}:remaining<0?{main:signedMan(remaining),sub:"予定頭金との差"}:{main:"追加不要",sub:"予定している頭金と同額"}};
  const monthlyRequired=remainingDown(values.requiredMonthlyDown),totalRequired=remainingDown(values.requiredTotalDown);

  return <main>
    <header className="hero"><p className="eyebrow">住宅購入タイミング比較</p><h1>今とその先を、<br/>同じ数字で比べる。</h1><p>今買う場合と、一定期間待って頭金を増やす場合を比較できます。</p><span className="privacy">入力内容はこの端末内だけで計算します</span></header>

    <section aria-labelledby="conditions-heading"><div className="section-title"><div><span>STEP 1</span><h2 id="conditions-heading">比較条件を入力</h2></div><p>変更すると結果が自動更新されます</p></div>
      <div className="condition-layout">
        <article className="input-panel"><div className="panel-heading"><span>基準</span><div><h3>今買う</h3><p>比較の起点になる購入条件</p></div></div><div className="input-grid"><NumberInput label="物件価格" value={form.price} unit="万円" onChange={value=>update("price",value)}/><NumberInput label="借入額" value={form.loanAmount} unit="万円" onChange={value=>update("loanAmount",value)}/><NumberInput label="住宅ローン金利" value={form.currentRate} unit="%" step={.05} onChange={value=>update("currentRate",value)}/><NumberInput label="返済期間" value={form.years} unit="年" onChange={value=>update("years",value)}/></div><div className="auto-value"><span>頭金（自動計算）</span><strong>{man(values.currentDown)}</strong></div></article>
        <article className="input-panel wait-panel"><div className="panel-heading"><span>比較</span><div><h3>待って買う</h3><p>待つ期間と、その時点の想定条件</p></div></div>
          <div className="wait-period"><NumberInput label="購入までの期間" value={form.waitMonths} unit="カ月" min={1} max={120} onChange={value=>update("waitMonths",value)}/><strong>{duration(form.waitMonths)}</strong></div><input className="range" aria-label="購入までの期間" type="range" min="1" max="60" step="1" value={Math.min(60,Math.max(1,form.waitMonths))} onChange={event=>update("waitMonths",Number(event.target.value))}/><div className="range-scale"><span>1カ月</span><span>5年</span></div>
          <div className="input-grid"><NumberInput label="現在の家賃" value={form.currentRent} unit="円 / 月" onChange={value=>update("currentRent",value)}/><NumberInput label="増やす頭金" value={form.extraDownPayment} unit="万円" onChange={value=>update("extraDownPayment",value)} note="家賃などを支払った後に増やせる金額"/><NumberInput label="購入時の想定金利" value={form.futureRate} unit="%" step={.05} onChange={value=>update("futureRate",value)}/></div><input className="range rate-range" aria-label="購入時の想定金利" type="range" min="0" max="5" step="0.05" value={Math.min(5,Math.max(0,form.futureRate))} onChange={event=>update("futureRate",Number(event.target.value))}/><div className="range-scale"><span>0%</span><span>5%</span></div><div className="auto-value"><span>{futureLabel}の借入額（自動計算）</span><strong>{man(values.futurePrincipal)}</strong></div>
        </article>
      </div>{errors.length>0&&<div className="errors" role="alert"><strong>入力内容を確認してください</strong>{errors.map(error=><p key={error}>{error}</p>)}</div>}
    </section>

    {valid&&<><section aria-labelledby="comparison-heading"><div className="section-title"><div><span>STEP 2</span><h2 id="comparison-heading">結果を比較</h2></div><p>同じ項目を横に見比べられます</p></div><div className="comparison-wrap"><table className="comparison-table"><thead><tr><th>項目</th><th>今</th><th>{futureLabel}</th></tr></thead><tbody><tr><th>物件価格</th><td>{man(values.price)}</td><td>{man(values.futurePrice)}</td></tr><tr><th>頭金</th><td>{man(values.currentDown)}</td><td>{man(values.futureDown)}</td></tr><tr><th>借入額</th><td>{man(values.currentPrincipal)}</td><td>{man(values.futurePrincipal)}</td></tr><tr><th>金利</th><td>{form.currentRate.toFixed(2)}%</td><td>{form.futureRate.toFixed(2)}%</td></tr><tr className="primary-row"><th>月返済</th><td>{yen(values.current.monthlyPayment)}</td><td>{yen(values.future.monthlyPayment)}</td></tr><tr><th>総利息</th><td>{man(values.current.totalInterest)}</td><td>{man(values.future.totalInterest)}</td></tr><tr><th>総返済額</th><td>{man(values.current.totalPayment)}</td><td>{man(values.future.totalPayment)}</td></tr><tr><th>実質月額住居費</th><td>{yen(values.currentEffective)}</td><td>{yen(values.futureEffective)}</td></tr></tbody></table><div className="difference-strip"><div><span>月返済の差</span><strong>{signedYen(values.future.monthlyPayment-values.current.monthlyPayment)} / 月</strong></div><div><span>総利息の差</span><strong>{signedMan(values.future.totalInterest-values.current.totalInterest)}</strong></div><div><span>{duration(form.waitMonths)}の家賃合計</span><strong>{yen(values.waitingRent)}</strong></div></div><p className="neutral-note">プラス・マイナスは数値の増減です。購入時期の評価や推奨を示すものではありません。</p></div></section>
      <section aria-labelledby="insight-heading"><div className="section-title"><div><span>STEP 3</span><h2 id="insight-heading">条件が一致する地点</h2></div><p>金利と頭金を逆算します</p></div><div className="insight-grid"><article className="insight-panel"><p className="insight-label">金利上昇を相殺する頭金</p><h3>今と同じ月返済にするには</h3><strong>{monthlyRequired.main}</strong><small>{monthlyRequired.sub}</small><div className="sub-result"><span>総返済額ベース</span><b>{totalRequired.main}</b></div></article><article className="insight-panel"><p className="insight-label">金利の分岐点</p><h3>今と同じ月返済になる金利</h3><strong>{values.monthlyBreakEven===null?"範囲外":`${values.monthlyBreakEven.toFixed(2)}%`}</strong><small>追加頭金 {form.extraDownPayment.toLocaleString("ja-JP")}万円の場合</small><div className="sub-result"><span>総返済額ベース</span><b>{values.totalBreakEven===null?"範囲外":`${values.totalBreakEven.toFixed(2)}%`}</b></div></article></div></section></>}

    <section className="details-section"><details><summary><span><b>詳細設定・計算内訳</b><small>諸費用、税金、保険、物件価格変動など</small></span><i aria-hidden="true">＋</i></summary><div className="details-body"><h3>購入時の費用 <small>万円</small></h3><div className="input-grid detail-inputs"><NumberInput label="購入諸費用" value={form.purchaseCosts} unit="万円" onChange={value=>update("purchaseCosts",value)}/><NumberInput label="リフォーム費" value={form.renovation} unit="万円" onChange={value=>update("renovation",value)}/><NumberInput label="引越し費" value={form.moving} unit="万円" onChange={value=>update("moving",value)}/><NumberInput label="家具・家電費" value={form.furniture} unit="万円" onChange={value=>update("furniture",value)}/></div><h3>購入後の費用 <small>円</small></h3><div className="input-grid detail-inputs"><NumberInput label="固定資産税 / 年" value={form.propertyTax} unit="円" onChange={value=>update("propertyTax",value)}/><NumberInput label="都市計画税 / 年" value={form.cityTax} unit="円" onChange={value=>update("cityTax",value)}/><NumberInput label="火災保険 / 年換算" value={form.fireInsurance} unit="円" onChange={value=>update("fireInsurance",value)}/><NumberInput label="地震保険 / 年換算" value={form.earthquakeInsurance} unit="円" onChange={value=>update("earthquakeInsurance",value)}/><NumberInput label="修繕積立額 / 月" value={form.repairMonthly} unit="円" onChange={value=>update("repairMonthly",value)}/></div><h3>待機・現金・価格</h3><div className="input-grid detail-inputs"><NumberInput label="待機中の更新料等（合計）" value={form.renewalCosts} unit="万円" onChange={value=>update("renewalCosts",value)}/><NumberInput label="現在の住宅購入用現金" value={form.availableCash} unit="万円" onChange={value=>update("availableCash",value)}/><NumberInput label="購入後に残したい現金" value={form.desiredCash} unit="万円" onChange={value=>update("desiredCash",value)}/><NumberInput label="将来の物件価格変動率" value={form.priceChange} unit="%" min={-100} onChange={value=>update("priceChange",value)}/></div>{valid&&<div className="calculation-detail"><h3>計算内訳</h3><DetailRows rows={[["現在の頭金",man(values.currentDown)],[`${futureLabel}の頭金`,man(values.futureDown)],["待機期間中の家賃",yen(values.waitingRent)],["更新料等を含む待機住居費",yen(values.waitingHousing)],...(form.availableCash>0?[["今買う場合の購入後現金",man(values.currentCash)],[`${futureLabel}の購入後現金`,man(values.futureCash)],["残したい現金",`${form.desiredCash.toLocaleString("ja-JP")}万円`]] as [string,string][]:[])]}/></div>}<button type="button" className="reset" onClick={()=>setForm(defaults)}>初期値に戻す</button></div></details></section>
    {valid&&<aside className="sticky-comparison" aria-label="月返済の比較"><div><span>今</span><strong>{yen(values.current.monthlyPayment)} / 月</strong></div><div><span>{futureLabel}</span><strong>{yen(values.future.monthlyPayment)} / 月</strong></div></aside>}
    <footer><strong>ご利用にあたって</strong><p>本シミュレーターは概算です。実際の住宅ローンでは、金融機関ごとの金利変更ルール、手数料、保証料、団体信用生命保険、税金等により結果が異なる場合があります。住宅購入の最終判断は、金融機関・専門家等の情報も確認のうえ行ってください。</p><p>元利均等返済・ボーナス返済なし・返済期間中の金利一定として計算しています。</p></footer>
  </main>;
}
