import { getFieldsDto } from '@/lib/baserow/fields';
import { getLotsDto } from '@/lib/baserow/lots';
import { getCyclesDto } from '@/lib/baserow/cycles';
import CamposPageClient from './CamposPageClient';

const CamposPage = async () => {
  const [fields, lots, cycles] = await Promise.all([
    getFieldsDto(),
    getLotsDto(),
    getCyclesDto(),
  ]);

  return (
    <CamposPageClient fields={fields} lots={lots} cycles={cycles} />
  );
};

export default CamposPage;
