import { useEffect, useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { subscribeToProducts } from "../services/productService";
import { subscribeToOrders } from "../services/orderService";
import type { Product } from "../types";

/** Palette taken from the StockWise stylesheet so the charts match the shell. */
const BLUE = "#3971eb";
const BLUE_SOFT = "#d7e5ff";
const SERIES = ["#3971eb", "#0c9b79", "#e69738", "#915ce1", "#7ea4fa", "#f9735b"];

const AXIS = { stroke: "#e9eef6", tick: { fill: "#a0aec0", fontSize: 8 } };

const tooltipStyle = {
  border: "1px solid #e8edf5",
  borderRadius: 8,
  boxShadow: "0 6px 25px rgba(23,37,84,.12)",
  fontSize: 10,
  padding: "6px 9px",
};

/** StockWise's change indicator — unchanged. */
export function Change({ value, down = false }: { value: string; down?: boolean }) {
  const Icon = down ? ArrowDownRight : ArrowUpRight;
  return (
    <span className={`change ${down ? "negative" : ""}`}>
      <Icon size={14} />
      {value}
    </span>
  );
}

function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeToProducts(
      (next) => setProducts(next),
      (error) => console.error("Chart products subscription failed:", error),
    );
    return () => unsubscribe();
  }, []);

  return products;
}

function useOrders() {
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeToOrders((next) => setOrders(next));
    return () => unsubscribe();
  }, []);

  return orders;
}

function Empty({ label }: { label: string }) {
  return <div className="chart-empty">{label}</div>;
}

/** Stock on hand vs. reorder threshold, per product. */
export function InventoryChart() {
  const products = useProducts();

  const data = useMemo(
    () =>
      [...products]
        .sort((a, b) => (b.quantity ?? 0) - (a.quantity ?? 0))
        .slice(0, 8)
        .map((product) => ({
          name: product.sku || product.name,
          inStock: product.quantity ?? 0,
          threshold: product.minStockThreshold ?? 0,
        })),
    [products],
  );

  if (!data.length) return <Empty label="No products yet" />;

  return (
    <div className="chart-wrap chart-recharts">
      <ResponsiveContainer width="100%" height={146}>
        <BarChart data={data} margin={{ top: 4, right: 6, left: -22, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e9eef6" vertical={false} />
          <XAxis dataKey="name" {...AXIS} interval={0} />
          <YAxis {...AXIS} />
          <Tooltip contentStyle={tooltipStyle} />
          <Bar
            dataKey="inStock"
            name="In stock"
            fill={BLUE}
            radius={[3, 3, 0, 0]}
            maxBarSize={14}
          />
          <Bar
            dataKey="threshold"
            name="Reorder at"
            fill={BLUE_SOFT}
            radius={[3, 3, 0, 0]}
            maxBarSize={14}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Share of total units by product category. */
export function CategoryChart() {
  const products = useProducts();

  const data = useMemo(() => {
    const totals = new Map<string, number>();
    for (const product of products) {
      const key = product.category || "Uncategorized";
      totals.set(key, (totals.get(key) ?? 0) + (product.quantity ?? 0));
    }
    return [...totals.entries()]
      .map(([name, value]) => ({ name, value }))
      .filter((entry) => entry.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [products]);

  if (!data.length) return <Empty label="No category data yet" />;

  return (
    <div className="chart-wrap chart-recharts">
      <ResponsiveContainer width="100%" height={146}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="38%"
            cy="50%"
            innerRadius={28}
            outerRadius={54}
            paddingAngle={2}
            stroke="#fff"
            strokeWidth={2}
          >
            {data.map((entry, index) => (
              <Cell key={entry.name} fill={SERIES[index % SERIES.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
          <Legend
            layout="vertical"
            align="right"
            verticalAlign="middle"
            iconSize={7}
            iconType="circle"
            wrapperStyle={{ fontSize: 9, color: "#64748b", lineHeight: "16px" }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** Orders placed and total value, by month, for the last 12 months. */
export function OrderTrendChart() {
  const orders = useOrders();

  const data = useMemo(() => {
    const now = new Date();
    const buckets: { key: string; name: string; orders: number; value: number }[] =
      [];

    for (let offset = 11; offset >= 0; offset -= 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      buckets.push({
        key: `${date.getFullYear()}-${date.getMonth()}`,
        name: MONTHS[date.getMonth()],
        orders: 0,
        value: 0,
      });
    }

    const index = new Map(buckets.map((bucket) => [bucket.key, bucket]));

    for (const order of orders) {
      const created = order?.createdAt;
      const date =
        created && typeof created.toDate === "function"
          ? created.toDate()
          : created instanceof Date
            ? created
            : null;
      if (!date) continue;

      const bucket = index.get(`${date.getFullYear()}-${date.getMonth()}`);
      if (!bucket) continue;

      bucket.orders += 1;
      bucket.value += Number(order.totalAmount) || 0;
    }

    return buckets;
  }, [orders]);

  if (!orders.length) return <Empty label="No orders yet" />;

  return (
    <div className="chart-wrap chart-recharts">
      <ResponsiveContainer width="100%" height={146}>
        <LineChart data={data} margin={{ top: 4, right: 6, left: -22, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e9eef6" vertical={false} />
          <XAxis dataKey="name" {...AXIS} interval={0} />
          <YAxis {...AXIS} allowDecimals={false} />
          <Tooltip contentStyle={tooltipStyle} />
          <Line
            type="monotone"
            dataKey="orders"
            name="Orders"
            stroke={BLUE}
            strokeWidth={2}
            dot={{ r: 2, fill: BLUE, strokeWidth: 0 }}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
