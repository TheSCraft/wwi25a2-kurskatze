export type Motif = {
  id: string;
  title: string;
  category: string;
  pose: "sitz" | "pfote" | "schlaf" | "code";
  transform?: string;
  back?: string;
  front?: string;
};
