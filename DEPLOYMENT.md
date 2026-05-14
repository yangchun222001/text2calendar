# Deployment

This project is split into:

- Frontend: React/Vite app on Vercel
- Backend: Flask API on Railway
- Domain: `tinyworks.dev` on Cloudflare

Use `tinyworks.dev` as the umbrella domain for small tools. Each app gets its
own subdomain, and each backend gets a matching API subdomain:

```text
calendarai.tinyworks.dev       -> Vercel frontend
api-calendarai.tinyworks.dev   -> Railway Flask API
```

This keeps future tools easy to add:

```text
another-tool.tinyworks.dev
api-another-tool.tinyworks.dev
```

In production, build the frontend with
`VITE_API_BASE_URL=https://api-calendarai.tinyworks.dev` and configure Flask
with `ALLOWED_ORIGINS=https://calendarai.tinyworks.dev`.

## 1. Deploy The Backend On Railway

Create a Railway service from this GitHub repo.

Recommended settings:

```text
Root Directory: backend
Build Command: pip install -r requirements.txt
Start Command: gunicorn app:app
```

Environment variables:

```text
LLM_API_KEY=<your provider key>
LLM_API_BASE=https://api.openai.com/v1
LLM_MODEL=gpt-4o-mini
ALLOWED_ORIGINS=https://calendarai.tinyworks.dev
```

After Railway deploys, verify the Railway-provided domain:

```bash
curl https://<your-railway-domain>/api/health
```

## 2. Point `api-calendarai.tinyworks.dev` To Railway

In Railway, add a custom domain:

```text
api-calendarai.tinyworks.dev
```

Railway will show the DNS target to add in Cloudflare.

In Cloudflare DNS, add the CNAME record Railway provides. It will usually look
like this:

```text
Type: CNAME
Name: api-calendarai
Target: <your-railway-dns-target>
Proxy status: DNS only
```

Then verify:

```bash
curl https://api-calendarai.tinyworks.dev/api/health
```

## 3. Deploy The Frontend On Vercel

Create a Vercel project from this GitHub repo.

Recommended settings:

```text
Root directory: frontend
Build command: npm run build
Build output directory: dist
```

Environment variables:

```text
VITE_API_BASE_URL=https://api-calendarai.tinyworks.dev
```

Deploy the project and test the generated `*.vercel.app` URL.

## 4. Point `calendarai.tinyworks.dev` To Vercel

In Vercel, add this custom domain to the frontend project:

```text
calendarai.tinyworks.dev
```

Vercel will show the DNS record to add. For a subdomain, this is normally:

```text
Type: CNAME
Name: calendarai
Target: cname.vercel-dns.com
Proxy status: DNS only
```

Keep the apex domain `tinyworks.dev` available for a future landing page that
links to all small tools.

## 5. Final Smoke Test

Open:

```text
https://calendarai.tinyworks.dev
```

Then:

1. Paste event text.
2. Generate an event.
3. Confirm the network call goes to `https://api-calendarai.tinyworks.dev/api/extract-event`.
4. Open the Google Calendar link.

If the frontend loads but event generation fails, check:

- `VITE_API_BASE_URL` is set on the Vercel production environment.
- `ALLOWED_ORIGINS` includes the exact frontend origin.
- `LLM_API_KEY` is set on Railway.
- `https://api-calendarai.tinyworks.dev/api/health` returns `{ "status": "ok" }`.
