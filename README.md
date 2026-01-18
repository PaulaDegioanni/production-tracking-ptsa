# Production Tracking PTSA

Internal web app for tracking harvests, stock, and truck trips. The Next.js app lives in `package/`.

This app lives in `package/`.
Deployed at https://production-tracking-ptsa.vercel.app/

## 🚀 Getting Started

1.  Clone the repository
2.  Navigate to the project

```bash
    cd Modernize-Nextjs-Free/package
```

3. Install dependencies

```bash
    cd package
    npm install
```

4. Run in development mode

```bash
    npm run build
```

5. Build for production

```bash
    npm run build
    npm start
```

## Environment variables

Set these in `package/.env.local`:

- `NEXT_PUBLIC_BASEROW_URL`
- `BASEROW_TOKEN`
- `NEXT_PUBLIC_BASEROW_FIELDS_TABLE_ID`
- `NEXT_PUBLIC_BASEROW_LOTS_TABLE_ID`
- `NEXT_PUBLIC_BASEROW_CYCLES_TABLE_ID`
- `NEXT_PUBLIC_BASEROW_HARVESTS_TABLE_ID`
- `NEXT_PUBLIC_BASEROW_STOCK_TABLE_ID`
- `NEXT_PUBLIC_BASEROW_TRUCK_TRIPS_TABLE_ID`
- `NEXT_PUBLIC_BASEROW_TRUCKS_TABLE_ID`
- `NEXT_PUBLIC_BASEROW_PROVIDERS_TABLE_ID`
- `NEXT_PUBLIC_BASEROW_USERS_TABLE_ID`
- `JWT_SECRET`
