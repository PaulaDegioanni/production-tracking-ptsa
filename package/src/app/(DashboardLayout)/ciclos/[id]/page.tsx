import { notFound } from 'next/navigation';
import { getCycleByIdDto } from '@/lib/baserow/cycles';
import CycleDetailPageClient from '../CycleDetailPageClient';

interface CycleDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

const CycleDetailPage = async ({ params }: CycleDetailPageProps) => {
  const { id } = await params;
  const numericId = Number(id);

  if (!numericId || Number.isNaN(numericId)) {
    notFound();
  }

  const cycle = await getCycleByIdDto(numericId);

  if (!cycle) {
    notFound();
  }

  return <CycleDetailPageClient cycle={cycle} />;
};

export default CycleDetailPage;
