import { redirect } from 'next/navigation';

export default function Home() {
  // Middleware handles role-based redirection inside the dashboard.
  // For unauthenticated visitors, send them to login.
  redirect('/overview');
}
