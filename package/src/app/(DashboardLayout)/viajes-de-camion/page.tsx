// app/(DashboardLayout)/viajes-camion/page.tsx
import { getTruckTripsWithCycleIdsDto } from '@/lib/baserow/truckTrips';
import ViajesDeCamionClient from './ViajesDeCamionClient';

const TruckTripsPage = async () => {
  const trips = await getTruckTripsWithCycleIdsDto();

  return <ViajesDeCamionClient initialTrips={trips} />;
};

export default TruckTripsPage;
