// Re-export from parent route module so the Next.js App Router exposes this
// handler at /api/dev/pages while tests can import the module via ../route.
export { GET } from '../route';
