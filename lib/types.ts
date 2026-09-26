export type Role='user'|'owner'|'admin'|'customer_service'
export type OrderStatus='PENDING_PAYMENT'|'PAYMENT_RECEIVED'|'PROCESSING'|'SUCCESS'|'FAILED'|'CANCELLED'|'EXPIRED'
export type Game={id:string;slug:string;name:string;description:string|null;logo_url:string|null;banner_url:string|null;is_active:boolean;popular:boolean}
