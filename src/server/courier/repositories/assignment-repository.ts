import type {
  AssignmentStatus,
  DeliveryAssignment,
} from "@/lib/courier/types";

export type AssignmentListFilter = {
  courierId?: string;
  orderId?: string;
  statuses?: AssignmentStatus[];
  onlyActive?: boolean;
};

export interface AssignmentRepository {
  getById(id: string): Promise<DeliveryAssignment | null>;
  list(filter?: AssignmentListFilter): Promise<DeliveryAssignment[]>;
  upsert(assignment: DeliveryAssignment): Promise<DeliveryAssignment>;
}
