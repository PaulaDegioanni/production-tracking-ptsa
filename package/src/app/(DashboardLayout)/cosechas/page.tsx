import { getHarvestsDto } from '@/lib/baserow/harvests';
import CosechasPageClient from './CosechasPageClient';

const CosechasPage = async () => {
  const harvests = await getHarvestsDto();

  return <CosechasPageClient initialHarvests={harvests} />;
};

export default CosechasPage;
