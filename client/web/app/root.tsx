import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from "@remix-run/react";
import type { LinksFunction } from "@remix-run/node";
import { Analytics } from "@vercel/analytics/remix";

import "./tailwind.css";
import { ThemeProvider } from "~/theme/ThemeProvider";
import { FeedProvider } from "./context/feedContext";

export const links: LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
        {/* Cloudflare Web Analytics */}
        <script
          defer
          src="https://static.cloudflareinsights.com/beacon.min.js"
          data-cf-beacon='{"token": "7c98740fce3f471c972621c7e3654b7a"}'
        ></script>
        {/* End Cloudflare Web Analytics */}
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
        <Analytics />
      </body>
    </html>
  );
}

export default function App() {
  const { baseUrl } = useLoaderData<{ baseUrl: string }>();

  return (
    <FeedProvider>
      <ThemeProvider>
        <Outlet />
      </ThemeProvider>
    </FeedProvider>
  );
}

export const loader = async () => {
  const baseUrl = process.env.SERVER_URL ?? "";
  return { baseUrl };
};
