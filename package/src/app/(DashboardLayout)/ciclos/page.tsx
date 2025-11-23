import { getCyclesDto } from '@/lib/baserow/ciclos';
import CiclosPageClient from './CiclosPageClient';

const CiclosPage = async () => {
  const ciclos = await getCyclesDto();

  return <CiclosPageClient initialCiclos={ciclos} />;
};

export default CiclosPage;
