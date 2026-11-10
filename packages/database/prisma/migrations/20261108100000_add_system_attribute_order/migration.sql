-- Ordem dos atributos na ficha (SAGA Editar Sistema). Só acrescenta; padrão 0 mantém a ordem por nome.
-- AlterTable
ALTER TABLE "SystemAttribute" ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0;

