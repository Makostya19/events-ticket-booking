import { useState } from 'react';

export default function EventFilters({ options, values, onApply, onReset }) {
  const [draft, setDraft] = useState(values);
  const set = (key) => (e) => setDraft((d) => ({ ...d, [key]: e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    onApply(draft);
  };

  return (
    <form className="filter-form" onSubmit={submit}>
      <div className="filter-group">
        <label htmlFor="f-category">Category</label>
        <select id="f-category" className="select" value={draft.category} onChange={set('category')}>
          <option value="">All categories</option>
          {options.categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <label htmlFor="f-city">City</label>
        <select id="f-city" className="select" value={draft.city} onChange={set('city')}>
          <option value="">All cities</option>
          {options.cities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <span className="filter-label">Date</span>
        <div className="filter-row filter-row-stack">
          <input
            type="date"
            className="input"
            aria-label="From date"
            value={draft.dateFrom}
            onChange={set('dateFrom')}
          />
          <input
            type="date"
            className="input"
            aria-label="To date"
            value={draft.dateTo}
            onChange={set('dateTo')}
          />
        </div>
      </div>

      <div className="filter-group">
        <span className="filter-label">Price (₩)</span>
        <div className="filter-row">
          <input
            type="number"
            min="0"
            className="input"
            placeholder="Min"
            aria-label="Minimum price"
            value={draft.priceMin}
            onChange={set('priceMin')}
          />
          <input
            type="number"
            min="0"
            className="input"
            placeholder="Max"
            aria-label="Maximum price"
            value={draft.priceMax}
            onChange={set('priceMax')}
          />
        </div>
      </div>

      <div className="filter-actions">
        <button type="submit" className="btn btn-primary btn-block">
          Apply filters
        </button>
        <button type="button" className="btn btn-ghost btn-block" onClick={onReset}>
          Reset
        </button>
      </div>
    </form>
  );
}