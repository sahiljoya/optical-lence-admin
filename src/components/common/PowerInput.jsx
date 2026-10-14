// Stepper input for prescription power fields (SPH/CYL/ADD, 0.25D steps by default; Axis,
// 1deg steps). Used anywhere staff enter/search a power value, so +/- always behaves the same
// way: "+1.00" stays signed, "0.00" has no sign, negative values keep their own "-".
export function PowerInput({ value, onChange, placeholder, step = 0.25, decimals = 2, signed = true }) {
  const format = (n) => (signed && n > 0 ? `+${n.toFixed(decimals)}` : n.toFixed(decimals));

  const bump = (delta) => {
    let val = parseFloat(value || 0);
    if (isNaN(val)) val = 0;
    onChange(format(val + delta));
  };

  return (
    <div className="flex items-center border border-slate-200 rounded overflow-hidden h-9 bg-white">
      <button type="button" onClick={() => bump(-step)} className="w-8 h-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-500 border-r border-slate-200 font-bold transition-colors shrink-0">−</button>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 w-full h-full min-w-0 text-center text-[13px] font-mono focus:outline-none px-1"
      />
      <button type="button" onClick={() => bump(step)} className="w-8 h-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-500 border-l border-slate-200 font-bold transition-colors shrink-0">+</button>
    </div>
  );
}
