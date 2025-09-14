export class AppResponse {
  id!: string;
  name!: string;
  description?: string | null;
  keycloakClientId!: string;
  createdAt!: Date;
  updatedAt!: Date;
}
