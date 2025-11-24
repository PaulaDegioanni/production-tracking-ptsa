import { notFound } from 'next/navigation';
import { getCycleDetailDto } from '@/lib/baserow/cycleDetail';
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

  const detail = await getCycleDetailDto(numericId);

  if (!detail) {
    notFound();
  }

  return <CycleDetailPageClient initialDetail={detail} />;
};

export default CycleDetailPage;
