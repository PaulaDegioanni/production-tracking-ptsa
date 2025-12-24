export type FieldFormLotInput = {
  id?: number;
  code: string;
  areaHa: number;
};

export type FieldFormSubmitPayload = {
  name: string;
  totalAreaHa: number;
  location: string;
  isRented: boolean;
  notes: string;
  lots: FieldFormLotInput[];
};
