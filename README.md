# QueueDesk

A simple help desk. Customers open support tickets, and agents answer them.

## How to try it

**1. Install Docker.** Download [Docker Desktop](https://www.docker.com/products/docker-desktop/),
install it, and open it.

**2. Start the server.** Open a terminal (Command Prompt on Windows, Terminal on Mac) and paste:

```bash
docker run -d --name queuedesk-api -p 4000:4000 -v queuedesk-data:/data ghcr.io/ejtx16/queuedesk-api:latest
```

Wait until http://localhost:4000/api/health shows `"status":"ok"`.

**3. Open the website:** https://ejtx16.github.io/support-desk/

Use Chrome, Edge or Firefox (not Safari). If the browser asks to access devices on your local
network, click **Allow**.

**4. Log in.** Click a demo button on the login page, or type one of these:

| Role     | Email                     | Password       |
| -------- | ------------------------- | -------------- |
| Customer | `customer@queuedesk.test` | `Password123!` |
| Agent    | `agent@queuedesk.test`    | `Password123!` |
| Admin    | `admin@queuedesk.test`    | `Password123!` |

## Things to try

- **Customer:** create a ticket, reply to it, then close it.
- **Agent:** claim a ticket, change its status, and add a private note.
- **Admin:** assign a ticket to an agent.

## Stop or reset

| What you want              | Command                                                         |
| -------------------------- | --------------------------------------------------------------- |
| Stop the server            | `docker stop queuedesk-api`                                     |
| Start it again             | `docker start queuedesk-api`                                    |
| Delete it and all its data | `docker rm -f queuedesk-api && docker volume rm queuedesk-data` |

After deleting, run step 2 again to get fresh demo data.

## Problems?

- **"Cannot reach the server":** make sure Docker Desktop is open and the server is started (step 2).
- **"Port is already allocated":** another app is using port 4000. Close it and try again.
- **"denied" when downloading:** the server image isn't public yet. Tell the project owner.

---

## For developers

You need Node.js 18.18 or newer.

```bash
npm install    # install and create the database
npm run dev    # API on :4000, website on :5173
npm test       # run tests
```

To build the API image from source instead of downloading it:

```bash
docker compose up -d --build    # API on http://localhost:4000/api
docker compose down -v          # stop and wipe the database
```

- `client/` is the React website and `server/` is the Express API. `docs/` has the
  [PRD](docs/PRD.md), the [app flow](docs/flow.md) and how
  [deployment](docs/deployment.md) works.
- GitHub Actions publishes the website to GitHub Pages and the server image to GHCR when you push
  to `main`. In **Settings → Pages**, set **Source** to **GitHub Actions**. After the first image is
  published, make the `queuedesk-api` package **Public** in its package settings.
