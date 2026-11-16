import { Timestamp } from "firebase/firestore";
import type {
  Notification,
  Order,
  Product,
  StockMovement,
  Supplier,
  User,
} from "../types";
import type { UserProfile } from "../types/ui";

/**
 * Demo data shaped exactly like src/types/index.ts.
 * Used only as a fallback/preview when Firestore has no documents yet.
 */

const ts = (daysAgo: number) =>
  Timestamp.fromDate(new Date(Date.now() - daysAgo * 86_400_000));

export const demoUsers: User[] = [
  {
    id: "u1",
    name: "Olivia Rhye",
    email: "olivia@stockwise.io",
    role: "admin",
    createdAt: ts(90),
  },
  {
    id: "u2",
    name: "Phoenix Baker",
    email: "phoenix@stockwise.io",
    role: "warehouse_manager",
    createdAt: ts(60),
  },
  {
    id: "u3",
    name: "Lana Steiner",
    email: "lana@northstar.co",
    role: "supplier",
    createdAt: ts(45),
  },
  {
    id: "u4",
    name: "Demi Wilkinson",
    email: "demi@apexsupply.co",
    role: "supplier",
    createdAt: ts(30),
  },
];

export const demoUserProfiles: UserProfile[] = [
  {
    uid: "u1",
    fullName: "Olivia Rhye",
    email: "olivia@stockwise.io",
    role: "admin",
    status: "active",
  },
  {
    uid: "u2",
    fullName: "Phoenix Baker",
    email: "phoenix@stockwise.io",
    role: "warehouse_manager",
    status: "active",
  },
  {
    uid: "u3",
    fullName: "Lana Steiner",
    email: "lana@northstar.co",
    role: "supplier",
    status: "active",
    company: "Northstar Packaging",
  },
  {
    uid: "u4",
    fullName: "Demi Wilkinson",
    email: "demi@apexsupply.co",
    role: "supplier",
    status: "inactive",
    company: "Apex Industrial Supply",
  },
];

export const demoSuppliers: Supplier[] = [
  {
    id: "s1",
    name: "Lana Steiner",
    company: "Northstar Packaging",
    email: "lana@northstar.co",
    phone: "+1 415 555 0121",
    address: "1180 Harbor Way, Oakland, CA",
    userId: "u3",
    createdAt: ts(80),
  },
  {
    id: "s2",
    name: "Demi Wilkinson",
    company: "Apex Industrial Supply",
    email: "demi@apexsupply.co",
    phone: "+1 415 555 0144",
    address: "22 Foundry Street, Fremont, CA",
    userId: "u4",
    createdAt: ts(70),
  },
  {
    id: "s3",
    name: "Marco Villa",
    company: "BluePeak Logistics",
    email: "marco@bluepeak.io",
    phone: "+1 206 555 0188",
    address: "505 Dock Road, Tacoma, WA",
    createdAt: ts(55),
  },
  {
    id: "s4",
    name: "Priya Raman",
    company: "Evergreen Materials",
    email: "priya@evergreenmat.com",
    phone: "+1 503 555 0102",
    address: "77 Cedar Lane, Portland, OR",
    createdAt: ts(40),
  },
];

export const demoProducts: Product[] = [
  {
    id: "PR-1048",
    name: "Heavy-duty shipping boxes",
    sku: "PKG-BOX-04",
    category: "Packaging",
    quantity: 24,
    minStockThreshold: 40,
    price: 8.5,
    supplierId: "s1",
    supplierName: "Northstar Packaging",
    createdAt: ts(50),
    updatedAt: ts(1),
  },
  {
    id: "PR-1032",
    name: "Thermal label rolls",
    sku: "LBL-THERM-2",
    category: "Supplies",
    quantity: 18,
    minStockThreshold: 30,
    price: 12,
    supplierId: "s2",
    supplierName: "Apex Industrial Supply",
    createdAt: ts(48),
    updatedAt: ts(2),
  },
  {
    id: "PR-1021",
    name: "Pallet wrap · Clear",
    sku: "WRP-CLR-500",
    category: "Packaging",
    quantity: 86,
    minStockThreshold: 35,
    price: 16.8,
    supplierId: "s1",
    supplierName: "Northstar Packaging",
    createdAt: ts(45),
    updatedAt: ts(3),
  },
  {
    id: "PR-1009",
    name: "Handheld barcode scanner",
    sku: "SCN-HH-210",
    category: "Equipment",
    quantity: 7,
    minStockThreshold: 10,
    price: 249,
    supplierId: "s2",
    supplierName: "Apex Industrial Supply",
    createdAt: ts(40),
    updatedAt: ts(4),
  },
  {
    id: "PR-1014",
    name: "Safety gloves · Large",
    sku: "PPE-GLV-L",
    category: "Safety",
    quantity: 0,
    minStockThreshold: 25,
    price: 4.2,
    supplierId: "s4",
    supplierName: "Evergreen Materials",
    createdAt: ts(35),
    updatedAt: ts(5),
  },
];

export const demoOrders: Order[] = [
  {
    id: "PO-2024-084",
    supplierId: "s1",
    createdBy: "u2",
    status: "pending",
    items: [
      {
        productId: "PR-1048",
        productName: "Heavy-duty shipping boxes",
        quantity: 200,
        unitPrice: 8.5,
      },
      {
        productId: "PR-1021",
        productName: "Pallet wrap · Clear",
        quantity: 46,
        unitPrice: 16.8,
      },
    ],
    totalAmount: 2472.8,
    createdAt: ts(0),
    updatedAt: ts(0),
  },
  {
    id: "PO-2024-083",
    supplierId: "s2",
    createdBy: "u2",
    status: "approved",
    items: [
      {
        productId: "PR-1032",
        productName: "Thermal label rolls",
        quantity: 105,
        unitPrice: 12,
      },
    ],
    totalAmount: 1260,
    createdAt: ts(1),
    updatedAt: ts(1),
  },
  {
    id: "PO-2024-082",
    supplierId: "s3",
    createdBy: "u1",
    status: "shipped",
    items: [
      {
        productId: "PR-1009",
        productName: "Handheld barcode scanner",
        quantity: 20,
        unitPrice: 249,
      },
      {
        productId: "PR-1014",
        productName: "Safety gloves · Large",
        quantity: 190,
        unitPrice: 4.2,
      },
    ],
    totalAmount: 5778,
    createdAt: ts(2),
    updatedAt: ts(2),
  },
  {
    id: "PO-2024-081",
    supplierId: "s4",
    createdBy: "u2",
    status: "delivered",
    items: [
      {
        productId: "PR-1014",
        productName: "Safety gloves · Large",
        quantity: 300,
        unitPrice: 4.2,
      },
    ],
    totalAmount: 1260,
    createdAt: ts(6),
    updatedAt: ts(4),
  },
];

export const demoNotifications: Notification[] = [
  {
    id: "n1",
    userId: "u1",
    type: "new_order",
    message: "New purchase order PO-2024-084 is ready for your review",
    read: false,
    relatedOrderId: "PO-2024-084",
    createdAt: ts(0),
  },
  {
    id: "n2",
    userId: "u1",
    type: "low_stock",
    message: "Safety gloves · Large is out of stock",
    read: false,
    relatedProductId: "PR-1014",
    createdAt: ts(1),
  },
  {
    id: "n3",
    userId: "u1",
    type: "order_update",
    message: "Order PO-2024-082 has been shipped",
    read: true,
    relatedOrderId: "PO-2024-082",
    createdAt: ts(2),
  },
];

export const demoStockMovements: StockMovement[] = [
  {
    id: "m1",
    productId: "PR-1048",
    productName: "Heavy-duty shipping boxes",
    change: -24,
    reason: "Outbound shipment",
    previousQuantity: 48,
    newQuantity: 24,
    changedBy: "u2",
    timestamp: ts(0),
  },
  {
    id: "m2",
    productId: "PR-1014",
    productName: "Safety gloves · Large",
    change: 300,
    reason: "Order delivered",
    previousQuantity: 0,
    newQuantity: 300,
    changedBy: "u2",
    orderId: "PO-2024-081",
    timestamp: ts(4),
  },
];
