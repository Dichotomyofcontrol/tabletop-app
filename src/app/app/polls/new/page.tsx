import { redirect } from 'next/navigation';

export default function PollsNewRedirect() {
  redirect('/app/schedule?mode=poll');
}
