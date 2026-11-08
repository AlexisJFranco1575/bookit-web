# Bookit Web

Angular frontend for [Bookit](https://github.com/AlexisJFranco1575/bookit-api), an appointment booking API for small businesses.

**Live demo:** https://alexisjfranco1575.github.io/bookit-web/

Customers pick a service, a provider and a day, see the free times in the time zone of the business and book without an account. Owners create businesses, services and providers with weekly hours, share one booking link and read their agenda.

## Screens

| Route | Who | What it does |
| --- | --- | --- |
| `/b/:businessId` | Customer | Free times by service, provider and day; booking form |
| `/appointment/:id` | Customer | Shows and cancels an appointment (the id is the secret) |
| `/login`, `/register` | Owner | Account with JWT |
| `/dashboard` | Owner | List and create businesses |
| `/dashboard/:businessId` | Owner | Booking link, agenda by range of days, services, providers and weekly hours |

## Decisions worth knowing

- **Time zones.** The API returns each free time with its wall-clock time in the business time zone; the page shows exactly that and never converts it with the time zone of the browser, so a customer in another country sees the hours of the business.
- **Conflicts.** If two people choose the same slot, the API answers `409`; the page shows the message and loads the free times again.
- **Ownership.** The dashboard checks that the business is in the list of the signed-in owner before showing it; the API enforces it too.
- **Token.** The browser decodes the JWT only to know who is signed in and when it expires; the API validates the signature on every request. An expired token is dropped on load, and a `401` signs the owner out.
- **Errors.** One function turns API problem details, network failures and the sleeping server (`502`-`504`) into short messages for the user.

## Stack

Angular 22, standalone components, signals, reactive forms, RxJS, TypeScript in strict mode, Vitest, GitHub Actions and GitHub Pages.

## Run it locally

Requirements: Node 24 and the Bookit API running on `http://localhost:5080` (see its README), with this origin allowed:

```powershell
dotnet user-secrets set "Cors:AllowedOrigins:0" "http://localhost:4200" --project src/Bookit.Api
```

```powershell
npm ci
npx ng serve
```

## Test and build

```powershell
npx ng test --watch=false
npx ng build --base-href /bookit-web/
```

## License

MIT