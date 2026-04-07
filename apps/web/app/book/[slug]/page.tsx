import { BookingFlow } from '../../../src/components/booking/BookingFlow';

interface BookPageProps {
  params: { slug: string };
}

export default function BookPage({ params }: BookPageProps) {
  return <BookingFlow slug={params.slug} />;
}
