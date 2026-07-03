import React from "react";
import { LineChart, Line, ResponsiveContainer } from "recharts";

export default function Sparkline({ data = [], color = "#E4262C", height = 32 }) {
  const chartData = data.map((v, i) => ({ v, i }));
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <LineChart data={chartData}>
          <Line type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}