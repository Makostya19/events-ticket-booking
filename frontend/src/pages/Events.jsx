import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, qs } from '../api/client.js';
import EventCard from '../components/EventCard.jsx';
import EventFilters from '../components/EventFilters.jsx';
import Pagination from '../components/Pagination.jsx';
import { EmptyState, ErrorMessage, EventGridSkeleton } from '../components/States.jsx';

const FILTER_KEYS = ['category', 'city', 'dateFrom', 'dateTo', 'priceMin', 'priceMax'];
const SORTS = [
  ['newest', 'Newest'],
  ['date_asc', 'Soonest first'],
  ['price_asc', 'Price: low to high'],
  ['price_desc', 'Price: high to low'],
];
const PAGE_SIZE = 9;

export default function Events() {
  const [params, setParams] = useSearchParams();
  const [options, setOptions] = useState({ categories: [], cities: [] });
  const [state, setState] = useState({ key: null, data: null, error: null });
  const [reload, setReload] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [searchText, setSearchText] = useState(params.get('search') || '');

  const paramsString = params.toString();
  const key = `${paramsString}|${reload}`;
  const loading = state.key !== key;
  const page = Math.max(1, Number(params.get('page')) || 1);
  const sort = params.get('sort') || 'newest';

  const filterValues = Object.fromEntries(FILTER_KEYS.map((k) => [k, params.get(k) || '']));
  const activeFilters = FILTER_KEYS.filter((k) => filterValues[k]).length;

  const update = (patch, { keepPage = false } = {}) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      for (const [k, v] of Object.entries(patch)) {
        if (v) next.set(k, v);
        else next.delete(k);
      }
      if (!keepPage) next.delete('page');
      return next;
    });
  };

  useEffect(() => {
    api('/api/events/filters')
      .then(setOptions)
      .catch(() => {});
  }, []);

  useEffect(() => {
    let active = true;
    const query = Object.fromEntries(new URLSearchParams(paramsString));
    api(`/api/events${qs({ ...query, limit: PAGE_SIZE })}`)
      .then((data) => active && setState({ key, data, error: null }))
      .catch((error) => active && setState({ key, data: null, error }));
    return () => {
      active = false;
    };
  }, [key, paramsString]);

  // поиск обновляет адрес с небольшой задержкой, пока человек печатает
  useEffect(() => {
    if (searchText.trim() === (params.get('search') || '')) return;
    const timer = setTimeout(() => update({ search: searchText.trim() }), 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText]);

  const resetAll = () => {
    setSearchText('');
    update({ search: '', ...Object.fromEntries(FILTER_KEYS.map((k) => [k, ''])) });
  };

  const goToPage = (p) => {
    update({ page: String(p) }, { keepPage: true });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const data = state.data;

  return (
    <div className="container page">
      <div className="page-head">
        <h1>Events</h1>
        <p className="muted">Search, filter and find something worth going to.</p>
      </div>

      <input
        type="search"
        className="input searchbar"
        placeholder="Search by title, description, city or venue"
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
        aria-label="Search events"
      />

      <div className="catalog">
        <aside className={`filters ${filtersOpen ? 'open' : ''}`}>
          <EventFilters
            key={JSON.stringify(filterValues)}
            options={options}
            values={filterValues}
            onApply={(vals) => {
              update(vals);
              setFiltersOpen(false);
            }}
            onReset={resetAll}
          />
        </aside>

        <section className="results">
          <div className="toolbar">
            <span className="toolbar-count">
              {data ? `${data.total} event${data.total === 1 ? '' : 's'}` : 'Loading…'}
            </span>
            <div className="toolbar-actions">
              <button
                type="button"
                className="btn btn-outline btn-sm filters-toggle"
                onClick={() => setFiltersOpen((v) => !v)}
                aria-expanded={filtersOpen}
              >
                Filters{activeFilters > 0 ? ` (${activeFilters})` : ''}
              </button>
              <select
                className="select select-sm"
                value={sort}
                onChange={(e) => update({ sort: e.target.value === 'newest' ? '' : e.target.value })}
                aria-label="Sort events"
              >
                {SORTS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loading && !data && <EventGridSkeleton count={PAGE_SIZE} />}

          {!loading && state.error && (
            <ErrorMessage error={state.error} onRetry={() => setReload((n) => n + 1)} />
          )}

          {data && data.items.length === 0 && (
            <EmptyState title="No events found" text="Try changing or clearing your filters.">
              <button type="button" className="btn btn-primary" onClick={resetAll}>
                Clear filters
              </button>
            </EmptyState>
          )}

          {data && data.items.length > 0 && (
            <>
              <div className={`grid ${loading ? 'is-loading' : ''}`}>
                {data.items.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
              <Pagination page={data.page} totalPages={data.totalPages} onChange={goToPage} />
            </>
          )}
        </section>
      </div>
    </div>
  );
}