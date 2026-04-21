import { INDIAN_OCEAN_ZONES } from "../data/oceanZones";

// Add zone selector before sliders:
<div className="zone-selector">
  <label>Quick Fill — Indian Ocean Zone</label>
  <select onChange={e => {
    const z = INDIAN_OCEAN_ZONES[e.target.value];
    if (z) setValues(v => ({ ...v, ...z }));
  }}>
    <option value="">Select a zone to auto-fill…</option>
    {Object.keys(INDIAN_OCEAN_ZONES).map(k =>
      <option key={k} value={k}>{k}</option>
    )}
  </select>
</div>