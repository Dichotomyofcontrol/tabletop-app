import { redirect } from 'next/navigation';

export default function PollsListRedirect() {
  redirect('/app/one-shots');
}
