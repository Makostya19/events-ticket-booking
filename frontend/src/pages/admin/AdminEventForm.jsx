import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, fieldErrors } from '../../api/client.js';
import { useToast } from '../../context/ToastContext.jsx';
import FormField from '../../components/FormField.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import { ErrorMessage } from '../../components/States.jsx';
import { categoryEmoji, categoryHue, imageSrc, toInputDateTime } from '../../utils/format.js';

const EMPTY = {
  title: '',
  description: '',
  category: '',
  city: 'Seoul',
  venue: '',
  startsAt: '',
  endsAt: '',
  price: '0',
  totalTickets: '',
};

const MAX_IMAGE = 2 * 1024 * 1024;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_YEAR = 2100;
const MAX_PRICE = 10_000_000;
const MAX_TICKETS = 100_000;
const MAX_DATE_INPUT = `${MAX_YEAR}-12-31T23:59`;

const fromEvent = (e) => ({
  title: e.title,
  description: e.description,
  category: e.category,
  city: e.city,
  venue: e.venue,
  startsAt: toInputDateTime(e.startsAt),
  endsAt: toInputDateTime(e.endsAt),
  price: String(e.price),
  totalTickets: String(e.totalTickets),
});

const toDate = (value) => {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

function dateError(value, label) {
  if (!value) return `${label} date is required`;
  const d = toDate(value);
  if (!d) return 'Enter a valid date';
  if (d.getFullYear() > MAX_YEAR) return `Year must be ${MAX_YEAR} or earlier`;
  return '';
}

function validate(f, { isNew, event }) {
  const e = {};

  const title = f.title.trim();
  if (title.length < 3 || title.length > 120) e.title = 'Title must be 3–120 characters';

  const description = f.description.trim();
  if (description.length < 20) e.description = 'Description must be at least 20 characters';
  else if (description.length > 5000) e.description = 'Description must be at most 5000 characters';

  if (!f.category.trim()) e.category = 'Category is required';
  else if (f.category.trim().length > 60) e.category = 'Category must be at most 60 characters';

  if (!f.city.trim()) e.city = 'City is required';
  else if (f.city.trim().length > 80) e.city = 'City must be at most 80 characters';

  if (!f.venue.trim()) e.venue = 'Venue is required';
  else if (f.venue.trim().length > 120) e.venue = 'Venue must be at most 120 characters';

  const startMsg = dateError(f.startsAt, 'Start');
  const endMsg = dateError(f.endsAt, 'End');
  const start = startMsg ? null : toDate(f.startsAt);
  const end = endMsg ? null : toDate(f.endsAt);

  if (startMsg) e.startsAt = startMsg;
  else if ((isNew || event?.status === 'published') && start <= new Date()) {
    e.startsAt = 'Start date must be in the future';
  }

  if (endMsg) e.endsAt = endMsg;
  else if (start && end <= start) e.endsAt = 'End date must be after start date';

  const price = Number(f.price);
  if (f.price === '' || Number.isNaN(price) || price < 0) e.price = 'Price must be zero or greater';
  else if (price > MAX_PRICE) e.price = `Price can’t exceed ₩${MAX_PRICE.toLocaleString('en-US')}`;

  const total = Number(f.totalTickets);
  if (!Number.isInteger(total) || total < 1) {
    e.totalTickets = 'Total tickets must be a whole number greater than zero';
  } else if (total > MAX_TICKETS) {
    e.totalTickets = `Total tickets can’t exceed ${MAX_TICKETS.toLocaleString('en-US')}`;
  } else if (event) {
    const booked = event.totalTickets - event.availableTickets;
    if (total < booked) e.totalTickets = `${booked} ticket(s) are already booked, so this can’t go lower`;
  }

  return e;
}

function checkFile(file) {
  if (!IMAGE_TYPES.includes(file.type)) return 'Only jpg, png and webp images are allowed';
  if (file.size > MAX_IMAGE) return 'Image must be 2 MB or smaller';
  return '';
}

async function uploadImage(eventId, file) {
  const body = new FormData();
  body.append('image', file);
  return api(`/api/admin/events/${eventId}/image`, { method: 'POST', body });
}

export default function AdminEventForm() {
  const { id } = useParams();
  return <EventFormInner key={id ?? 'new'} id={id} />;
}

function EventFormInner({ id }) {
  const isNew = !id;
  const navigate = useNavigate();
  const toast = useToast();
  const [load, setLoad] = useState({ status: isNew ? 'ready' : 'loading', event: null, error: null });
  const [form, setForm] = useState(EMPTY);
  const [options, setOptions] = useState({ categories: [], cities: [] });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [image, setImage] = useState({ file: null, url: null });
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (isNew) return;
    let active = true;
    api(`/api/admin/events/${id}`)
      .then((data) => {
        if (!active) return;
        setForm(fromEvent(data.event));
        setLoad({ status: 'ready', event: data.event, error: null });
      })
      .catch((error) => active && setLoad({ status: 'error', event: null, error }));
    return () => {
      active = false;
    };
  }, [id, isNew, reload]);

  useEffect(() => {
    api('/api/events/filters')
      .then(setOptions)
      .catch(() => {});
  }, []);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const pickImage = (e) => {
    const file = e.target.files?.[0] || null;
    if (image.url) URL.revokeObjectURL(image.url);
    if (!file) {
      setImage({ file: null, url: null });
      return;
    }
    const message = checkFile(file);
    setErrors((prev) => ({ ...prev, image: message }));
    if (message) {
      e.target.value = '';
      setImage({ file: null, url: null });
      return;
    }
    setImage({ file, url: URL.createObjectURL(file) });
  };

  if (load.status === 'loading') {
    return <div className="skeleton" style={{ height: 420 }} />;
  }

  if (load.status === 'error') {
    return load.error.status === 404 ? (
      <div className="state">
        <div className="state-emoji">🕳️</div>
        <h3>Event not found</h3>
        <Link to="/admin/events" className="btn btn-primary">
          Back to events
        </Link>
      </div>
    ) : (
      <ErrorMessage error={load.error} onRetry={() => setReload((n) => n + 1)} />
    );
  }

  const event = load.event;
  const locked = !isNew && (event.status === 'cancelled' || event.status === 'completed');
  const currentImage = imageSrc(event?.imageUrl);
  const preview = image.url || currentImage;
  const hue = categoryHue(form.category);

  const submit = async (e) => {
    e.preventDefault();
    const next = validate(form, { isNew, event });
    if (image.file) {
      const message = checkFile(image.file);
      if (message) next.image = message;
    }
    setErrors(next);
    setFormError('');
    if (Object.keys(next).length) return;

    const body = {
      title: form.title.trim(),
      description: form.description.trim(),
      category: form.category.trim(),
      city: form.city.trim(),
      venue: form.venue.trim(),
      startsAt: new Date(form.startsAt).toISOString(),
      endsAt: new Date(form.endsAt).toISOString(),
      price: Number(form.price),
      totalTickets: Number(form.totalTickets),
    };

    setBusy(true);
    try {
      const data = await api(isNew ? '/api/admin/events' : `/api/admin/events/${id}`, {
        method: isNew ? 'POST' : 'PUT',
        body,
      });

      if (image.file) {
        try {
          await uploadImage(data.event.id, image.file);
        } catch (err) {
          toast.error(`Event saved, but the image upload failed: ${err.message}`);
          navigate(`/admin/events/${data.event.id}/edit`);
          return;
        }
      }

      toast.success(isNew ? 'Event created as a draft' : 'Event updated');
      navigate('/admin/events');
    } catch (err) {
      setErrors(fieldErrors(err));
      setFormError(err.message);
      setBusy(false);
    }
  };

  return (
    <>
      <Link to="/admin/events" className="back-link">
        ← All events
      </Link>

      <div className="block-head">
        <h2 className="section-title">
          {isNew ? 'New event' : locked ? 'Event details' : 'Edit event'}
        </h2>
        {!isNew && <StatusBadge status={event.status} />}
      </div>
      {isNew && (
        <p className="muted panel-sub">
          New events start as drafts. Publish them from the events list when they’re ready.
        </p>
      )}
      {locked && (
        <div className="notice" style={{ marginBottom: 18 }}>
          This event is {event.status} and can’t be edited.
        </div>
      )}

      <form className="event-form" onSubmit={submit} noValidate>
        <div className="panel panel-wide">
          {formError && <div className="form-error">{formError}</div>}
          <fieldset className="fieldset" disabled={locked || busy}>
            <FormField id="title" label="Title" error={errors.title}>
              <input id="title" className="input" value={form.title} onChange={set('title')} />
            </FormField>

            <FormField id="description" label="Description" error={errors.description}>
              <textarea
                id="description"
                className="input textarea"
                value={form.description}
                onChange={set('description')}
              />
            </FormField>

            <div className="form-row">
              <FormField id="category" label="Category" error={errors.category}>
                <input
                  id="category"
                  className="input"
                  list="category-options"
                  value={form.category}
                  onChange={set('category')}
                />
                <datalist id="category-options">
                  {options.categories.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </FormField>
              <FormField id="city" label="City" error={errors.city}>
                <input
                  id="city"
                  className="input"
                  list="city-options"
                  value={form.city}
                  onChange={set('city')}
                />
                <datalist id="city-options">
                  {options.cities.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </FormField>
            </div>

            <FormField id="venue" label="Venue" error={errors.venue}>
              <input id="venue" className="input" value={form.venue} onChange={set('venue')} />
            </FormField>

            <div className="form-row">
              <FormField id="startsAt" label="Starts" error={errors.startsAt}>
                <input
                  id="startsAt"
                  type="datetime-local"
                  className="input"
                  max={MAX_DATE_INPUT}
                  value={form.startsAt}
                  onChange={set('startsAt')}
                />
              </FormField>
              <FormField id="endsAt" label="Ends" error={errors.endsAt}>
                <input
                  id="endsAt"
                  type="datetime-local"
                  className="input"
                  max={MAX_DATE_INPUT}
                  value={form.endsAt}
                  onChange={set('endsAt')}
                />
              </FormField>
            </div>

            <div className="form-row">
              <FormField id="price" label="Price (₩, 0 for free)" error={errors.price}>
                <input
                  id="price"
                  type="number"
                  min="0"
                  max={MAX_PRICE}
                  step="100"
                  className="input"
                  value={form.price}
                  onChange={set('price')}
                />
              </FormField>
              <FormField id="totalTickets" label="Total tickets" error={errors.totalTickets}>
                <input
                  id="totalTickets"
                  type="number"
                  min="1"
                  max={MAX_TICKETS}
                  step="1"
                  className="input"
                  value={form.totalTickets}
                  onChange={set('totalTickets')}
                />
              </FormField>
            </div>
          </fieldset>
        </div>

        <aside className="panel side-panel">
          <h3 className="panel-section">Cover image</h3>
          <div className="cover cover-preview" style={{ '--hue': hue }}>
            {preview ? (
              <img src={preview} alt="" />
            ) : (
              <span className="cover-emoji" aria-hidden="true">
                {categoryEmoji(form.category)}
              </span>
            )}
          </div>
          <FormField id="image" label={currentImage ? 'Replace image' : 'Upload image'} error={errors.image}>
            <input
              id="image"
              type="file"
              className="file-input"
              accept="image/jpeg,image/png,image/webp"
              onChange={pickImage}
              disabled={locked || busy}
            />
          </FormField>
          <p className="muted small">JPG, PNG or WebP, up to 2 MB.</p>

          {!locked && (
            <div className="form-actions">
              <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={busy}>
                {busy ? 'Saving…' : isNew ? 'Create event' : 'Save changes'}
              </button>
              <Link to="/admin/events" className="btn btn-ghost btn-block">
                Cancel
              </Link>
            </div>
          )}
        </aside>
      </form>
    </>
  );
}