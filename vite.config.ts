import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
  // Bind explicitly to IPv4 so CS2's GSI client (which POSTs to 127.0.0.1) can reach the
  // endpoint. Vite's default "localhost" can resolve to IPv6 ::1 only on Windows, which the
  // game silently fails to connect to (connection refused, nothing logged).
  server: { host: "127.0.0.1" },
});
